import React from 'react';
import { X, Download } from 'lucide-react';
import { AlpineSalesRecord } from '../utils/alpineParser';
import { toTitleCase } from '../lib/utils';

interface CustomerCsvPivotModalProps {
  customerName: string;
  alpineData: AlpineSalesRecord[];
  isOpen: boolean;
  onClose: () => void;
  suppressOverlay?: boolean; // when opened via hover, don't block pointer events over the page
  closeOnScroll?: boolean; // close modal when page is scrolled
  ensureInView?: boolean; // when opened, scroll viewport to ensure modal is visible
}

const CustomerCsvPivotModal: React.FC<CustomerCsvPivotModalProps> = ({ customerName, alpineData, isOpen, onClose, suppressOverlay, closeOnScroll = false, ensureInView = true }) => {
  const [csvSearch, setCsvSearch] = React.useState('');
  const [pivotMode, setPivotMode] = React.useState<'month' | 'quarter'>('month');
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!isOpen) setCsvSearch('');
  }, [isOpen]);

  // Close when clicking outside the modal container
  React.useEffect(() => {
    if (!isOpen) return;
    const handleDocumentMouseDown = (e: MouseEvent) => {
      if (containerRef.current && containerRef.current.contains(e.target as Node)) return;
      onClose();
    };
    document.addEventListener('mousedown', handleDocumentMouseDown);
    return () => {
      document.removeEventListener('mousedown', handleDocumentMouseDown);
    };
  }, [isOpen, onClose]);

  // Ensure modal is in view on open (helpful when opened from deep scroll positions)
  React.useEffect(() => {
    if (!isOpen || !ensureInView) return;
    const raf = requestAnimationFrame(() => {
      try {
        // Smooth scroll towards top so the fixed modal is clearly visible
        window.scrollTo({ top: Math.max(0, window.scrollY - 80), behavior: 'smooth' });
        containerRef.current?.focus();
      } catch {}
    });
    return () => cancelAnimationFrame(raf);
  }, [isOpen, ensureInView]);

  // Close on page scroll/wheel/touchmove outside the modal
  React.useEffect(() => {
    if (!isOpen || !closeOnScroll) return;
    const handleWheel = (e: WheelEvent) => {
      if (containerRef.current && containerRef.current.contains(e.target as Node)) return;
      onClose();
    };
    const handleTouchMove = (e: TouchEvent) => {
      if (containerRef.current && containerRef.current.contains(e.target as Node)) return;
      onClose();
    };
    const handleWindowScroll = () => {
      onClose();
    };
    window.addEventListener('wheel', handleWheel, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('scroll', handleWindowScroll, { passive: true });
    return () => {
      window.removeEventListener('wheel', handleWheel as any);
      window.removeEventListener('touchmove', handleTouchMove as any);
      window.removeEventListener('scroll', handleWindowScroll as any);
    };
  }, [isOpen, closeOnScroll, onClose]);

  const buildCustomerRows = (name: string) => {
    // Handle composite identifiers (e.g., "Vistar Illinois - Customer Name")
    // For Vistar and other distributors with accountName, the Account Updates section
    // uses composite identifiers like "OPCO - Account"
    const isComposite = name.includes(' - ');
    let filterFn: (r: AlpineSalesRecord) => boolean;
    
    if (isComposite) {
      // Split into OPCO and Account parts
      const parts = name.split(' - ');
      const opcoName = parts[0]?.trim();
      const accountName = parts[1]?.trim();
      
      filterFn = (r: AlpineSalesRecord) => {
        // Match records where customerName matches OPCO and accountName matches Account
        if (r.accountName && r.accountName !== r.customerName) {
          return r.customerName === opcoName && r.accountName === accountName;
        }
        // Fallback: if accountName is not set or equals customerName, just match customerName
        return r.customerName === name;
      };
    } else {
      // Standard matching for non-composite identifiers (Alpine, Petes, etc.)
      filterFn = (r: AlpineSalesRecord) => r.customerName === name;
    }
    
    return alpineData
      .filter(filterFn)
      .sort((a, b) => {
        if (a.period !== b.period) return a.period.localeCompare(b.period);
        if ((a.productName || '') !== (b.productName || '')) return (a.productName || '').localeCompare(b.productName || '');
        return (a.productCode || '').localeCompare(b.productCode || '');
      });
  };

  const getCustomerPivot = (name: string) => {
    const rows = buildCustomerRows(name);
    const periodToQuarter = (p: string) => {
      const [y, mStr] = p.split('-');
      const m = parseInt(mStr, 10);
      const q = Math.floor((m - 1) / 3) + 1;
      return `${y}-Q${q}`;
    };
    const compareQuarter = (a: string, b: string) => {
      const [ya, qa] = a.split('-Q');
      const [yb, qb] = b.split('-Q');
      const yi = parseInt(ya, 10); const yj = parseInt(yb, 10);
      if (yi !== yj) return yi - yj;
      return parseInt(qa, 10) - parseInt(qb, 10);
    };

    const labels = Array.from(new Set(rows.map(r => pivotMode === 'month' ? r.period : periodToQuarter(r.period))));
    labels.sort(pivotMode === 'month' ? undefined : compareQuarter);

    const byProduct = new Map<string, { productName: string; productCode: string; itemNumber: string; values: Record<string, number> }>();
    rows.forEach(r => {
      const key = `${r.itemNumber || ''}|${r.productCode || ''}|${r.productName}`;
      if (!byProduct.has(key)) {
        const init: Record<string, number> = {};
        labels.forEach(l => { init[l] = 0; });
        byProduct.set(key, { productName: r.productName, productCode: r.productCode || '', itemNumber: r.itemNumber || '', values: init });
      }
      const obj = byProduct.get(key)!;
      const label = pivotMode === 'month' ? r.period : periodToQuarter(r.period);
      obj.values[label] = (obj.values[label] || 0) + (r.cases || 0);
    });
    return { columns: labels, products: Array.from(byProduct.values()) };
  };

  const handleDownloadCSV = () => {
    const pivot = getCustomerPivot(customerName);
    const monthsFiltered = pivot.columns.filter(m => !csvSearch || m.toLowerCase().includes(csvSearch.toLowerCase()));
    const productsFiltered = pivot.products.filter(p => {
      if (!csvSearch) return true;
      const q = csvSearch.toLowerCase();
      return (
        (p.productName || '').toLowerCase().includes(q) ||
        (p.productCode || '').toLowerCase().includes(q) ||
        (p.itemNumber || '').toLowerCase().includes(q)
      );
    });

    // Create CSV content
    const headers = ['Product', 'Item #', 'Vendor Code', ...monthsFiltered];
    const rows = productsFiltered.map(p => [
      p.productName,
      p.itemNumber || '',
      p.productCode || '',
      ...monthsFiltered.map(m => (p as any).values[m] || 0)
    ]);

    // Add totals row
    const monthTotals = monthsFiltered.map(m =>
      productsFiltered.reduce((sum, pr) => sum + ((pr as any).values[m] || 0), 0)
    );
    const totalRow = ['Total', '', '', ...monthTotals];

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      totalRow.map(cell => `"${cell}"`).join(',')
    ].join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    
    // Create filename
    const sanitizedCustomer = customerName.replace(/[^a-zA-Z0-9\s]/g, '');
    const filename = `${sanitizedCustomer}_Invoices_${pivotMode === 'month' ? 'Monthly' : 'Quarterly'}.csv`;
    link.setAttribute('download', filename);
    
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  const pivot = getCustomerPivot(customerName);
  const monthsFiltered = pivot.columns.filter(m => !csvSearch || m.toLowerCase().includes(csvSearch.toLowerCase()));
  const productsFiltered = pivot.products.filter(p => {
    if (!csvSearch) return true;
    const q = csvSearch.toLowerCase();
    return (
      (p.productName || '').toLowerCase().includes(q) ||
      (p.productCode || '').toLowerCase().includes(q) ||
      (p.itemNumber || '').toLowerCase().includes(q)
    );
  });

  return (
    <>
      {!suppressOverlay && (
        <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); onClose(); }} />
      )}
      <div 
        className="fixed left-1/2 top-20 -translate-x-1/2 w-[90vw] max-w-3xl bg-white border border-gray-200 rounded-lg shadow-xl z-[10010]"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        ref={containerRef}
        tabIndex={-1}
      >
        <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50 rounded-t-lg">
          <div className="text-sm font-medium">{toTitleCase(customerName)} • All Invoices</div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); handleDownloadCSV(); }}
              className="h-7 px-2 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
              title="Download CSV"
            >
              <Download className="w-3 h-3" />
              CSV
            </button>
            <input
              type="text"
              value={csvSearch}
              onChange={(e) => setCsvSearch(e.target.value)}
              placeholder="Filter by product, item #, vendor code, or period"
              className="px-2 py-1 text-xs border rounded"
            />
            <button className="h-7 px-2" onClick={(e) => { e.stopPropagation(); onClose(); }}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="p-2 text-left">Product</th>
                <th className="p-2 text-left">Item #</th>
                <th className="p-2 text-left">Vendor Code</th>
                {monthsFiltered.map(m => (
                  <th key={m} className="p-2 text-right whitespace-nowrap">{m}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {productsFiltered.map((p, idx) => (
                <tr key={`${p.itemNumber}-${p.productCode}-${idx}`} className="border-t">
                  <td className="p-2">{toTitleCase(p.productName)}</td>
                  <td className="p-2 whitespace-nowrap">{p.itemNumber || '-'}</td>
                  <td className="p-2 whitespace-nowrap">{p.productCode || '-'}</td>
                  {monthsFiltered.map(m => (
                    <td key={m} className="p-2 text-right tabular-nums">{(p as any).values[m] || 0}</td>
                  ))}
                </tr>
              ))}
              {(() => {
                const monthTotals = monthsFiltered.map(m =>
                  pivot.products.reduce((sum, pr) => sum + ((pr as any).values[m] || 0), 0)
                );
                return (
                  <tr className="border-t bg-gray-50 font-semibold">
                    <td className="p-2" colSpan={3}>Total</td>
                    {monthTotals.map((t, i) => (
                      <td key={i} className="p-2 text-right tabular-nums">{t}</td>
                    ))}
                  </tr>
                );
              })()}
            </tbody>
          </table>
        </div>
        <div className="px-3 py-2 text-[11px] text-gray-500 border-t rounded-b-lg flex items-center gap-2">
          <span>Sum of Cases by Product • Columns = {pivotMode === 'month' ? 'Months' : 'Quarters'}</span>
          <div className="ml-auto flex items-center gap-1 text-xs">
            <button className={`px-2 py-1 rounded ${pivotMode === 'month' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`} onClick={() => setPivotMode('month')}>Month</button>
            <button className={`px-2 py-1 rounded ${pivotMode === 'quarter' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`} onClick={() => setPivotMode('quarter')}>Quarter</button>
          </div>
        </div>
      </div>
    </>
  );
};

export default CustomerCsvPivotModal;


