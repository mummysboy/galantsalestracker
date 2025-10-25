import React, { useState, useMemo, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import CustomerDetailModal from './components/CustomerDetailModal';
import KeHeCustomerDetailModal from './components/KeHeCustomerDetailModal';
import CustomerCsvPivotModal from './components/CustomerCsvPivotModal';
import PeriodComparison from './components/PeriodComparison';
import AlpineReportUpload from './components/AlpineReportUpload';
import CustomReportModal from './components/CustomReportModal';
import { AlpineSalesRecord, analyzeCustomerProgress } from './utils/alpineParser';
// Removed hardcoded June seed; start empty and let uploads populate
import { Upload, BarChart3, ChevronDown, Trash2, X, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { toTitleCase } from './lib/utils';
import PetesReportUpload from './components/PetesReportUpload';
import KeHeReportUpload from './components/KeHeReportUpload';
import VistarReportUpload from './components/VistarReportUpload';
import VistarCustomerDetailModal from './components/VistarCustomerDetailModal';
import TonysReportUpload from './components/TonysReportUpload';
import TonysCustomerDetailModal from './components/TonysCustomerDetailModal';
import TroiaReportUpload from './components/TroiaReportUpload';
import TroiaCustomerDetailModal from './components/TroiaCustomerDetailModal';
import MhdReportUpload from './components/MhdReportUpload';
import MhdCustomerDetailModal from './components/MhdCustomerDetailModal';
import { useDynamoDB } from './hooks/useDynamoDB';
import { dynamoDBService } from './services/dynamodb';

const generateDeterministicInvoiceKey = (d: string, p: string, c: string, pn: string, cs: number, r: number): string => {
  const k = `${p}|${c}|${pn}|${cs}|${r.toFixed(2)}`.toUpperCase();
  let h = 5381;
  for (let i = 0; i < k.length; i++) { h = ((h << 5) + h) + k.charCodeAt(i); h >>>= 0; }
  return `${d}-${p.replace(/-/g, "")}-${h.toString(36).toUpperCase()}`;
};

// Revenue by Customer Component
interface RevenueByCustomerProps {
  revenueByCustomer: Array<{ id: string; customer: string; fullCustomerName: string; customerId: string; revenue: number; cases: number }>;
  alpineData: AlpineSalesRecord[];
  onCustomerClick?: (customerName: string) => void;
  isComparisonMode?: boolean;
  isKeHeMode?: boolean;
  isVistarMode?: boolean;
  isTonysMode?: boolean;
  isTroiaMode?: boolean;
  isMhdMode?: boolean;
  customerPivotRange?: { start: number; end: number } | null;
  setCustomerPivotRange?: (range: { start: number; end: number } | null) => void;
  navigateCustomerPivot?: (direction: 'left' | 'right', totalPeriods: number) => void;
  CUSTOMER_PIVOT_WINDOW_SIZE?: number;
  selectedMonth?: string;
  displayMode?: 'revenue' | 'cases';
}

const RevenueByCustomerComponent: React.FC<RevenueByCustomerProps> = ({ 
  revenueByCustomer, 
  alpineData,
  onCustomerClick,
  isComparisonMode = false,
  isKeHeMode = false,
  isVistarMode = false,
  isTonysMode = false,
  isTroiaMode = false,
  isMhdMode = false,
  customerPivotRange,
  setCustomerPivotRange,
  navigateCustomerPivot,
  CUSTOMER_PIVOT_WINDOW_SIZE = 3,
  selectedMonth,
  displayMode = 'revenue'
}) => {
  const [showAll, setShowAll] = useState(false);
  const [openCsvForCustomer, setOpenCsvForCustomer] = useState<string | null>(null);
  const [csvSearch, setCsvSearch] = useState('');
  const [pivotMode, setPivotMode] = useState<'month' | 'quarter'>('month');

  React.useEffect(() => {
    if (!openCsvForCustomer) {
      setCsvSearch('');
    }
  }, [openCsvForCustomer]);
  
  const topCustomers = revenueByCustomer.slice(0, 5);
  const remainingCustomers = revenueByCustomer.slice(5);
  const totalRevenue = revenueByCustomer.reduce((sum, customer) => sum + customer.revenue, 0);
  const totalCases = revenueByCustomer.reduce((sum, customer) => sum + customer.cases, 0);
  
  const formatValue = (value: number) => {
    if (displayMode === 'revenue') {
      return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else {
      return value.toLocaleString('en-US');
    }
  };

  const getPercentage = (value: number) => {
    const total = displayMode === 'revenue' ? totalRevenue : totalCases;
    return ((value / total) * 100).toFixed(1);
  };


  const handleCustomerClick = (fullCustomerName: string) => {
    // Reset customer pivot range when opening a new customer modal
    if (setCustomerPivotRange) {
      setCustomerPivotRange(null);
    }
    
    // For KeHe, Vistar, Tony's, Troia, or MHD mode, always use the custom modal (bypass comparison mode)
    if (isKeHeMode || isVistarMode || isTonysMode || isTroiaMode || isMhdMode) {
      if (onCustomerClick) onCustomerClick(fullCustomerName);
      return;
    }
    // For other distributors, use comparison mode if enabled
    if (isComparisonMode) {
      setOpenCsvForCustomer(prev => prev === fullCustomerName ? null : fullCustomerName);
      return;
    }
    if (onCustomerClick) onCustomerClick(fullCustomerName);
  };

  // Helpers to build month-by-month pivot by product for a customer
  const buildCustomerRows = (customerName: string) => {
    return alpineData
      .filter(r => r.customerName === customerName && !r.isAdjustment)
      .sort((a, b) => {
        if (a.period !== b.period) return a.period.localeCompare(b.period);
        if ((a.productName || '') !== (b.productName || '')) return (a.productName || '').localeCompare(b.productName || '');
        return (a.productCode || '').localeCompare(b.productCode || '');
      });
  };

  const getCustomerPivot = (customerName: string, currentSelectedMonth?: string) => {
    const rows = buildCustomerRows(customerName);
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

    const allLabels = Array.from(new Set(rows.map(r => pivotMode === 'month' ? r.period : periodToQuarter(r.period))));
    allLabels.sort(pivotMode === 'month' ? undefined : compareQuarter);
    
    // Initialize customer pivot range if not set - always show current month on the right
    if (!customerPivotRange && allLabels.length > CUSTOMER_PIVOT_WINDOW_SIZE && setCustomerPivotRange) {
      const currentPeriod = currentSelectedMonth && currentSelectedMonth !== 'all' ? currentSelectedMonth : allLabels[allLabels.length - 1];
      const currentIndex = allLabels.findIndex(label => label === currentPeriod);
      
      if (currentIndex >= 0) {
        // Position current month on the right (last position in the 3-month window)
        const end = currentIndex;
        const start = Math.max(0, end - CUSTOMER_PIVOT_WINDOW_SIZE + 1);
        setCustomerPivotRange({ start, end });
      } else {
        // Fallback to showing the most recent months
        const start = Math.max(0, allLabels.length - CUSTOMER_PIVOT_WINDOW_SIZE);
        const end = allLabels.length - 1;
        setCustomerPivotRange({ start, end });
      }
    }
    
    // Apply sliding window
    const labels = customerPivotRange && allLabels.length > CUSTOMER_PIVOT_WINDOW_SIZE
      ? allLabels.slice(customerPivotRange.start, customerPivotRange.end + 1)
      : allLabels;

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
    return { columns: labels, allColumns: allLabels, products: Array.from(byProduct.values()) };
  };

  const handleDownloadCustomerCSV = (customerName: string) => {
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

  return (
    <div className="space-y-4">
      {/* Removed subheading per request */}
      
      {/* Top 5 Customers */}
      <div className="space-y-3">
        {topCustomers.map((customer) => (
          <div 
            key={customer.id}
            className={`relative flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors ${
              (isComparisonMode || isKeHeMode || isVistarMode || isTonysMode || isTroiaMode || isMhdMode) ? 'cursor-pointer' : ''
            }`}
            onClick={() => handleCustomerClick(customer.fullCustomerName)}
            title={isKeHeMode || isVistarMode || isTonysMode || isTroiaMode || isMhdMode ? "Click to view customer summary" : isComparisonMode ? "Click to view CSV breakdown" : "Customer revenue"}
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 break-words">
                  {toTitleCase(customer.customer)}
                </div>
              {customer.customerId && (
                <div className="text-xs text-blue-600 font-medium">ID: {customer.customerId}</div>
              )}
              <div className="text-xs text-gray-500">{getPercentage(displayMode === 'revenue' ? customer.revenue : customer.cases)}% of total</div>
              </div>
            <div className="text-sm font-semibold text-gray-900">
              {formatValue(displayMode === 'revenue' ? customer.revenue : customer.cases)}
            </div>

            {openCsvForCustomer === customer.fullCustomerName && (
              <>
                <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setOpenCsvForCustomer(null); }} />
                <div 
                  className="fixed left-1/2 top-20 -translate-x-1/2 w-[90vw] max-w-3xl bg-white border border-gray-200 rounded-lg shadow-xl z-50"
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50 rounded-t-lg">
                    <div className="text-sm font-medium">{toTitleCase(customer.customer)} • All Invoices</div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDownloadCustomerCSV(customer.fullCustomerName); }}
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
                      <button className="h-7 px-2" onClick={(e) => { e.stopPropagation(); setOpenCsvForCustomer(null); }}>
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="max-h-[70vh] overflow-auto">
                    {(() => {
                      const pivot = getCustomerPivot(customer.fullCustomerName, selectedMonth);
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
                          {/* Navigation controls for customer pivot */}
                          {pivot.allColumns.length > CUSTOMER_PIVOT_WINDOW_SIZE && (
                            <div className="flex items-center justify-end px-3 py-2 bg-gray-100 border-b">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (navigateCustomerPivot) navigateCustomerPivot('left', pivot.allColumns.length);
                                  }}
                                  className="p-1 hover:bg-gray-200 rounded disabled:opacity-50"
                                  disabled={!customerPivotRange || customerPivotRange.start === 0}
                                >
                                  <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="text-xs text-gray-600 px-2">
                                  {customerPivotRange ? 
                                    `${pivot.allColumns[customerPivotRange.start]} - ${pivot.allColumns[customerPivotRange.end]}` :
                                    `${pivot.allColumns.length} periods`
                                  }
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (navigateCustomerPivot) navigateCustomerPivot('right', pivot.allColumns.length);
                                  }}
                                  className="p-1 hover:bg-gray-200 rounded disabled:opacity-50"
                                  disabled={!customerPivotRange || customerPivotRange.end === pivot.allColumns.length - 1}
                                >
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          )}
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
                                pivot.products.reduce((sum, p) => sum + ((p as any).values[m] || 0), 0)
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
                        </>
                      );
                    })()}
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
            )}
          </div>
        ))}
      </div>

      {/* Remaining Customers */}
      {remainingCustomers.length > 0 && (
        <>
          {showAll && (
            <div className="space-y-3">
              {remainingCustomers.map((customer) => (
                <div 
                  key={customer.id}
                  className={`relative flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors ${
                    (isComparisonMode || isKeHeMode || isVistarMode) ? 'cursor-pointer' : ''
                  }`}
                  onClick={() => handleCustomerClick(customer.fullCustomerName)}
                  title={isKeHeMode || isVistarMode ? "Click to view customer summary" : isComparisonMode ? "Click to view CSV breakdown" : "Customer revenue"}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 break-words">
                    {toTitleCase(customer.customer)}
                  </div>
                  {customer.customerId && (
                    <div className="text-xs text-blue-600 font-medium">ID: {customer.customerId}</div>
                  )}
                  <div className="text-xs text-gray-500">{getPercentage(displayMode === 'revenue' ? customer.revenue : customer.cases)}% of total</div>
                </div>
                  <div className="text-sm font-semibold text-gray-900">
                    {formatValue(displayMode === 'revenue' ? customer.revenue : customer.cases)}
              </div>

                  {openCsvForCustomer === customer.fullCustomerName && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setOpenCsvForCustomer(null); }} />
                      <div 
                        className="fixed left-1/2 top-20 -translate-x-1/2 w-[90vw] max-w-3xl bg-white border border-gray-200 rounded-lg shadow-xl z-50"
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50 rounded-t-lg">
                          <div className="text-sm font-medium">{toTitleCase(customer.customer)} • All Invoices</div>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={csvSearch}
                              onChange={(e) => setCsvSearch(e.target.value)}
                              placeholder="Filter by product, item #, vendor code, or period"
                              className="px-2 py-1 text-xs border rounded"
                            />
                            <button className="h-7 px-2" onClick={(e) => { e.stopPropagation(); setOpenCsvForCustomer(null); }}>
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div className="max-h-[70vh] overflow-auto">
                          {(() => {
                            const pivot = getCustomerPivot(customer.fullCustomerName, selectedMonth);
                            const monthsFiltered = pivot.columns.filter((m: string) => !csvSearch || m.toLowerCase().includes(csvSearch.toLowerCase()));
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
                                      {monthsFiltered.map((m: string) => (
                                        <td key={m} className="p-2 text-right tabular-nums">{(p as any).values[m] || 0}</td>
                                      ))}
                                    </tr>
                                  ))}
                                  {(() => {
                                    const monthTotals = monthsFiltered.map((m: string) =>
                                      pivot.products.reduce((sum: number, p: any) => sum + (p.values[m] || 0), 0)
                                    );
                                    return (
                                      <tr className="border-t bg-gray-50 font-semibold">
                                        <td className="p-2" colSpan={3}>Total</td>
                                        {monthTotals.map((t: number, i: number) => (
                                          <td key={i} className="p-2 text-right tabular-nums">{t}</td>
                                        ))}
                                      </tr>
                                    );
                                  })()}
                                </tbody>
                              </table>
                            );
                          })()}
                        </div>
                        <div className="px-3 py-2 text-[11px] text-gray-500 border-t rounded-b-lg">
                          Sum of Cases by Product • Columns = Months
                        </div>
                      </div>
                    </>
                  )}
            </div>
          ))}
        </div>
      )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAll(!showAll)}
            className="w-full"
          >
            {showAll ? 'Show Less' : `Show ${remainingCustomers.length} More`}
          </Button>
        </>
      )}
    </div>
  );
};

// Revenue by Product Component
interface RevenueByProductProps {
  revenueByProduct: Array<{ id: string; product: string; fullProduct: string; revenue: number; cases: number }>;
  alpineData: AlpineSalesRecord[];
  displayMode?: 'revenue' | 'cases';
}

const RevenueByProductComponent: React.FC<RevenueByProductProps> = ({ revenueByProduct, alpineData, displayMode = 'revenue' }) => {
  const [showAll, setShowAll] = useState(false);
  
  const topProducts = revenueByProduct.slice(0, 5);
  const remainingProducts = revenueByProduct.slice(5);
  const totalRevenue = revenueByProduct.reduce((sum, product) => sum + product.revenue, 0);
  const totalCases = revenueByProduct.reduce((sum, product) => sum + product.cases, 0);
  
  const formatValue = (value: number) => {
    if (displayMode === 'revenue') {
      return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else {
      return value.toLocaleString('en-US');
    }
  };

  const getPercentage = (value: number) => {
    const total = displayMode === 'revenue' ? totalRevenue : totalCases;
    return ((value / total) * 100).toFixed(1);
  };

  return (
    <div className="space-y-4">
      {/* Removed subheading per request */}
      
      {/* Top 5 Products */}
      <div className="space-y-3">
        {topProducts.map((product) => (
          <div 
            key={product.id}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 break-words">
                  {toTitleCase(product.product)}
                </div>
              <div className="text-xs text-gray-500">{getPercentage(displayMode === 'revenue' ? product.revenue : product.cases)}% of total</div>
              </div>
            <div className="text-sm font-semibold text-gray-900">
              {formatValue(displayMode === 'revenue' ? product.revenue : product.cases)}
            </div>
          </div>
        ))}
      </div>

      {/* Remaining Products */}
      {remainingProducts.length > 0 && (
        <>
          {showAll && (
            <div className="space-y-3">
              {remainingProducts.map((product) => (
                <div 
                  key={product.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 break-words">
                    {toTitleCase(product.product)}
                  </div>
                  <div className="text-xs text-gray-500">{getPercentage(displayMode === 'revenue' ? product.revenue : product.cases)}% of total</div>
                </div>
                  <div className="text-sm font-semibold text-gray-900">
                    {formatValue(displayMode === 'revenue' ? product.revenue : product.cases)}
              </div>
            </div>
          ))}
        </div>
      )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAll(!showAll)}
            className="w-full"
          >
            {showAll ? 'Show Less' : `Show ${remainingProducts.length} More`}
          </Button>
        </>
      )}
    </div>
  );
};

const Dashboard: React.FC = () => {
  // DynamoDB hook for persisting data
  const {
    saveSalesRecords,
    saveCustomerProgressionWithDedup,
  } = useDynamoDB();

  // Customer modal handlers
  const handleCustomerClick = (customerName: string) => {
    setSelectedCustomerForModal(customerName);
    setIsCustomerModalOpen(true);
  };

  const handleCloseCustomerModal = () => {
    setIsCustomerModalOpen(false);
    setSelectedCustomerForModal(null);
  };

  // State management
  const [selectedCustomerForModal, setSelectedCustomerForModal] = useState<string | null>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [showUploadSection, setShowUploadSection] = useState(false);
  const [uploadSectionKey, setUploadSectionKey] = useState(0);
  
  // Load data from localStorage on component mount
  const [currentAlpineData, setCurrentAlpineData] = useState<AlpineSalesRecord[]>(() => {
    try {
      const saved = localStorage.getItem('salesTracker_alpineData');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [currentPetesData, setCurrentPetesData] = useState<AlpineSalesRecord[]>(() => {
    try {
      const saved = localStorage.getItem('salesTracker_petesData');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [currentKeHeData, setCurrentKeHeData] = useState<AlpineSalesRecord[]>(() => {
    try {
      const saved = localStorage.getItem('salesTracker_keheData');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [currentVistarData, setCurrentVistarData] = useState<AlpineSalesRecord[]>(() => {
    try {
      const saved = localStorage.getItem('salesTracker_vistarData');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [currentTonysData, setCurrentTonysData] = useState<AlpineSalesRecord[]>(() => {
    try {
      const saved = localStorage.getItem('salesTracker_tonysData');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [currentTroiaData, setCurrentTroiaData] = useState<AlpineSalesRecord[]>(() => {
    try {
      const saved = localStorage.getItem('salesTracker_troiaData');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [currentMhdData, setCurrentMhdData] = useState<AlpineSalesRecord[]>(() => {
    try {
      const saved = localStorage.getItem('salesTracker_mhdData');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  
  // Load customer progressions from localStorage
  const [currentCustomerProgressions, setCurrentCustomerProgressions] = useState<Map<string, any>>(() => {
    try {
      const saved = localStorage.getItem('salesTracker_alpineProgressions');
      return saved ? new Map(JSON.parse(saved)) : new Map();
    } catch {
      return new Map();
    }
  });
  const [currentPetesCustomerProgressions, setCurrentPetesCustomerProgressions] = useState<Map<string, any>>(() => {
    try {
      const saved = localStorage.getItem('salesTracker_petesProgressions');
      return saved ? new Map(JSON.parse(saved)) : new Map();
    } catch {
      return new Map();
    }
  });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [currentKeHeCustomerProgressions, setCurrentKeHeCustomerProgressions] = useState<Map<string, any>>(new Map());
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [currentTonysCustomerProgressions, setCurrentTonysCustomerProgressions] = useState<Map<string, any>>(new Map());
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [currentTroiaCustomerProgressions, setCurrentTroiaCustomerProgressions] = useState<Map<string, any>>(new Map());
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    try {
      return localStorage.getItem('salesTracker_selectedMonth') || '';
    } catch {
      return '';
    }
  });

  // Save data to localStorage whenever it changes
  React.useEffect(() => {
    localStorage.setItem('salesTracker_alpineData', JSON.stringify(currentAlpineData));
  }, [currentAlpineData]);

  React.useEffect(() => {
    localStorage.setItem('salesTracker_petesData', JSON.stringify(currentPetesData));
  }, [currentPetesData]);

  React.useEffect(() => {
    localStorage.setItem('salesTracker_keheData', JSON.stringify(currentKeHeData));
  }, [currentKeHeData]);

  React.useEffect(() => {
    localStorage.setItem('salesTracker_vistarData', JSON.stringify(currentVistarData));
  }, [currentVistarData]);

  React.useEffect(() => {
    localStorage.setItem('salesTracker_tonysData', JSON.stringify(currentTonysData));
  }, [currentTonysData]);

  React.useEffect(() => {
    localStorage.setItem('salesTracker_troiaData', JSON.stringify(currentTroiaData));
  }, [currentTroiaData]);

  React.useEffect(() => {
    localStorage.setItem('salesTracker_mhdData', JSON.stringify(currentMhdData));
  }, [currentMhdData]);

  React.useEffect(() => {
    localStorage.setItem('salesTracker_alpineProgressions', JSON.stringify(Array.from(currentCustomerProgressions.entries())));
  }, [currentCustomerProgressions]);

  React.useEffect(() => {
    localStorage.setItem('salesTracker_petesProgressions', JSON.stringify(Array.from(currentPetesCustomerProgressions.entries())));
  }, [currentPetesCustomerProgressions]);

  React.useEffect(() => {
    localStorage.setItem('salesTracker_selectedMonth', selectedMonth);
  }, [selectedMonth]);

  // Load data from DynamoDB on component mount (for incognito/fresh sessions)
  React.useEffect(() => {
    const loadFromDynamoDB = async () => {
      try {
        console.log('Loading data from DynamoDB...');
        
        // Load data for each distributor
        const distributors = ['ALPINE', 'PETES', 'KEHE', 'VISTAR', 'TONYS', 'TROIA', 'MHD'] as const;
        
        for (const distributor of distributors) {
          try {
            const records = await dynamoDBService.getSalesRecordsByDistributor(distributor);
            console.log(`Loaded ${records.length} records for ${distributor} from DynamoDB`);
            
            // Convert SalesRecord back to AlpineSalesRecord format and update appropriate state
            const convertedRecords: AlpineSalesRecord[] = records.map(r => ({
              period: r.period,
              customerName: r.customerName,
              productName: r.productName,
              productCode: r.productCode || '',
              cases: r.cases,
              pieces: 0, // Default value since not stored in DynamoDB
              revenue: r.revenue,
              accountName: (r as any).accountName,
              customerId: (r as any).customerId,
              itemNumber: (r as any).itemNumber,
              size: (r as any).size,
              weightLbs: (r as any).weightLbs,
            }));

            if (distributor === 'ALPINE') {
              setCurrentAlpineData(convertedRecords);
            } else if (distributor === 'PETES') {
              setCurrentPetesData(convertedRecords);
            } else if (distributor === 'KEHE') {
              setCurrentKeHeData(convertedRecords);
            } else if (distributor === 'VISTAR') {
              setCurrentVistarData(convertedRecords);
            } else if (distributor === 'TONYS') {
              setCurrentTonysData(convertedRecords);
            } else if (distributor === 'TROIA') {
              setCurrentTroiaData(convertedRecords);
            } else if (distributor === 'MHD') {
              setCurrentMhdData(convertedRecords);
            }
          } catch (error) {
            console.log(`Note: Could not load ${distributor} from DynamoDB (may not have data yet):`, error instanceof Error ? error.message : error);
          }
        }
        
        console.log('DynamoDB data load complete');
      } catch (error) {
        console.error('Error loading from DynamoDB:', error);
      }
    };

    loadFromDynamoDB();
  }, []);

  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);
  // Removed CSV invoice upload; no longer tracking last uploaded invoice month
  // const [lastUploadedInvoiceMonth, setLastUploadedInvoiceMonth] = useState<string | null>(null);
  const [pivotCustomerName, setPivotCustomerName] = useState<string | null>(null);
  const [isPivotOpen, setIsPivotOpen] = useState(false);
  // Removed Period Management toggle button; keep feature accessible via dropdown trash icons
  const [pendingDeletePeriod, setPendingDeletePeriod] = useState<string | null>(null);
  const [showMonthlySummary, setShowMonthlySummary] = useState(false);
  const [openNewAccountsTooltipMonth, setOpenNewAccountsTooltipMonth] = useState<string | null>(null);
  const [deltaModalOpen, setDeltaModalOpen] = useState(false);
  const [newAccountsModalOpen, setNewAccountsModalOpen] = useState(false);
  const [selectedDistributor, setSelectedDistributor] = useState<'ALPINE' | 'PETES' | 'KEHE' | 'VISTAR' | 'TONYS' | 'TROIA' | 'MHD' | 'ALL'>(() => {
    try {
      const saved = localStorage.getItem('salesTracker_selectedDistributor');
      return (saved as any) || 'ALPINE';
    } catch {
      return 'ALPINE';
    }
  });

  React.useEffect(() => {
    localStorage.setItem('salesTracker_selectedDistributor', selectedDistributor);
  }, [selectedDistributor]);

  const [isDistributorDropdownOpen, setIsDistributorDropdownOpen] = useState(false);
  const [showCustomReport, setShowCustomReport] = useState(false);
  const [displayMode, setDisplayMode] = useState<'revenue' | 'cases'>('cases');
  const [timeAggregation, setTimeAggregation] = useState<'3mo' | '6mo' | '1yr' | '5yr'>('3mo');
  
  // Function to clear all localStorage data (available for future use)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const clearAllData = () => {
    localStorage.removeItem('salesTracker_alpineData');
    localStorage.removeItem('salesTracker_petesData');
    localStorage.removeItem('salesTracker_keheData');
    localStorage.removeItem('salesTracker_vistarData');
    localStorage.removeItem('salesTracker_tonysData');
    localStorage.removeItem('salesTracker_troiaData');
    localStorage.removeItem('salesTracker_mhdData');
    localStorage.removeItem('salesTracker_alpineProgressions');
    localStorage.removeItem('salesTracker_petesProgressions');
    localStorage.removeItem('salesTracker_selectedMonth');
    localStorage.removeItem('salesTracker_selectedDistributor');
    
    // Reset all state
    setCurrentAlpineData([]);
    setCurrentPetesData([]);
    setCurrentKeHeData([]);
    setCurrentVistarData([]);
    setCurrentTonysData([]);
    setCurrentTroiaData([]);
    setCurrentMhdData([]);
    setCurrentCustomerProgressions(new Map());
    setCurrentPetesCustomerProgressions(new Map());
    setSelectedMonth('');
    setSelectedDistributor('ALPINE');
  };

  // Debug logging
  console.log('Dashboard component rendering, selectedMonth:', selectedMonth, 'selectedDistributor:', selectedDistributor);
  
  // Debug selectedMonth changes
  React.useEffect(() => {
    console.log('selectedMonth changed to:', selectedMonth);
  }, [selectedMonth]);
  
  // Chart navigation state
  const [chartVisibleRange, setChartVisibleRange] = useState<{start: number, end: number} | null>(null);
  const [customerPivotRange, setCustomerPivotRange] = useState<{start: number, end: number} | null>(null);
  const [monthlySummaryRange, setMonthlySummaryRange] = useState<{start: number, end: number} | null>(null);
  
  // Processing states for uploads and deletions
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadDescription, setUploadDescription] = useState('');
  
  const tooltipTimerRef = React.useRef<number | null>(null);
  const cancelTooltipClose = () => {
    if (tooltipTimerRef.current) {
      window.clearTimeout(tooltipTimerRef.current);
      tooltipTimerRef.current = null;
    }
  };
  const scheduleTooltipClose = (which: 'new') => {
    cancelTooltipClose();
    tooltipTimerRef.current = window.setTimeout(() => {
      if (which === 'new') setOpenNewAccountsTooltipMonth(null);
    }, 200);
  };

  const handleDeltaViewClick = () => {
    setDeltaModalOpen(true);
  };

  const handleNewAccountsClick = () => {
    setNewAccountsModalOpen(true);
  };

  // Determine current dataset based on distributor
  const currentData = useMemo(() => {
    if (selectedDistributor === 'ALPINE') return currentAlpineData;
    if (selectedDistributor === 'PETES') return currentPetesData;
    if (selectedDistributor === 'KEHE') return currentKeHeData;
    if (selectedDistributor === 'VISTAR') return currentVistarData;
    if (selectedDistributor === 'TONYS') return currentTonysData;
    if (selectedDistributor === 'TROIA') return currentTroiaData;
    if (selectedDistributor === 'MHD') return currentMhdData;
    // For 'ALL': combine all data but exclude sub-distributors from totals
    return [...currentAlpineData, ...currentPetesData, ...currentKeHeData, ...currentVistarData, ...currentTonysData, ...currentTroiaData, ...currentMhdData];
  }, [selectedDistributor, currentAlpineData, currentPetesData, currentKeHeData, currentVistarData, currentTonysData, currentTroiaData, currentMhdData]);

  // Data for calculations - excludes sub-distributors when viewing "All Businesses"
  const dataForTotals = useMemo(() => {
    console.log('DataForTotals calculation:', {
      selectedMonth,
      selectedDistributor,
      currentDataLength: currentData.length,
      currentDataPeriods: Array.from(new Set(currentData.map(r => r.period))).sort()
    });
    
    // When "All Months" is selected, show all data for the current distributor
    if (selectedMonth === 'ALL_MONTHS') {
      console.log('ALL_MONTHS selected for distributor:', selectedDistributor, currentData.length, 'records');
      return currentData;
    }
    
    if (selectedDistributor === 'ALL') {
      // Exclude Pete's data to avoid double-counting (it's a sub-distributor)
      const filtered = currentData.filter(r => !r.excludeFromTotals);
      
      // Debug logging for duplicate detection
      const periodCounts = filtered.reduce((acc, record) => {
        acc[record.period] = (acc[record.period] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const duplicates = Object.entries(periodCounts).filter(([period, count]) => count > 1);
      if (duplicates.length > 0) {
        console.log('Duplicate periods detected:', duplicates);
      }
      
      console.log('ALL distributors (specific month):', filtered.length, 'records');
      return filtered;
    }
    
    console.log('Specific distributor:', selectedDistributor, currentData.length, 'records');
    return currentData;
  }, [currentData, selectedDistributor, selectedMonth]);

  // Get available periods and set default to most recent
  const availablePeriods = useMemo(() => {
    const periods = Array.from(new Set(dataForTotals.map(r => r.period))).sort();
    return periods;
  }, [dataForTotals]);

  // Add "All" option to periods, with most recent first
  const allPeriodOptions = useMemo(() => {
    // IMPORTANT: reverse() mutates; use a copy to keep availablePeriods sorted ascending for charts
    const options = ['ALL_MONTHS', ...availablePeriods.slice().reverse()];
    console.log('allPeriodOptions generated:', options);
    return options;
  }, [availablePeriods]);

  // Filter data based on selected month
  const filteredData = useMemo(() => {
    console.log('FilteredData calculation:', {
      selectedMonth,
      selectedDistributor,
      dataForTotalsLength: dataForTotals.length,
      dataForTotalsPeriods: Array.from(new Set(dataForTotals.map(r => r.period))).sort()
    });
    
    if (!selectedMonth || selectedMonth === 'ALL_MONTHS') {
      console.log('Returning all data for totals:', dataForTotals.length, 'records');
      return dataForTotals;
    }
    
    const filtered = dataForTotals.filter(record => record.period === selectedMonth);
    console.log('Filtered to specific month:', selectedMonth, filtered.length, 'records');
    return filtered;
  }, [dataForTotals, selectedMonth, selectedDistributor]);

  // Set default month to most recent when data changes
  React.useEffect(() => {
    if (availablePeriods.length > 0 && !selectedMonth) {
      setSelectedMonth(availablePeriods[availablePeriods.length - 1]);
    }
  }, [availablePeriods, selectedMonth]);

  // Adjust selected month when switching distributors
  React.useEffect(() => {
    if (availablePeriods.length > 0 && !availablePeriods.includes(selectedMonth) && selectedMonth !== 'ALL_MONTHS') {
      setSelectedMonth(availablePeriods[availablePeriods.length - 1]);
    }
  }, [selectedDistributor, availablePeriods, selectedMonth]);

  // Close dropdowns when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isMonthDropdownOpen && !target.closest('.month-dropdown')) {
        setIsMonthDropdownOpen(false);
      }
      if (isDistributorDropdownOpen && !target.closest('.distributor-dropdown')) {
        setIsDistributorDropdownOpen(false);
      }
    };

    if (isMonthDropdownOpen || isDistributorDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMonthDropdownOpen, isDistributorDropdownOpen]);

  // Month name mapping
  const getMonthName = (period: string) => {
    const monthMap: Record<string, string> = {
      '2025-06': 'June 2025',
      '2025-07': 'July 2025',
      '2025-08': 'August 2025',
      '2025-09': 'September 2025',
      '2025-10': 'October 2025',
      '2025-11': 'November 2025',
      '2025-12': 'December 2025',
      '2026-01': 'January 2026',
      '2026-02': 'February 2026',
      '2026-03': 'March 2026',
      '2026-04': 'April 2026',
      '2026-05': 'May 2026',
      '2026-06': 'June 2026',
      '2026-07': 'July 2026',
      '2026-08': 'August 2026'
    };
    return monthMap[period] || period;
  };

  // Short month label, e.g., Jan-25
  const getShortMonthLabel = (period: string) => {
    if (period === 'ALL_MONTHS') return 'All Months';
    const [yearStr, monthStr] = period.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const yy = yearStr.slice(-2);
    const mmIdx = Math.max(0, Math.min(11, parseInt(monthStr || '1') - 1));
    return `${monthNames[mmIdx]}-${yy}`;
  };

  // Upload handlers
  const handleAlpineDataParsed = async (data: { records: AlpineSalesRecord[]; customerProgressions: Map<string, any> }) => {
    console.log('Dashboard received new data:', {
      recordCount: data.records.length,
      periods: Array.from(new Set(data.records.map(r => r.period))),
      totalRevenue: data.records.reduce((sum, r) => sum + r.revenue, 0),
      sampleRecords: data.records.slice(0, 3).map(r => ({ customer: r.customerName, period: r.period, revenue: r.revenue }))
    });

    // Merge new data with existing data instead of replacing it
    const existingPeriods = new Set(currentAlpineData.map(r => r.period));
    const newPeriods = new Set(data.records.map(r => r.period));
    
    console.log('Existing periods:', Array.from(existingPeriods));
    console.log('New periods:', Array.from(newPeriods));
    
    // Filter out any existing records for the same periods being uploaded
    const filteredExistingData = currentAlpineData.filter(record => 
      !newPeriods.has(record.period)
    );
    
    // Combine filtered existing data with new data
    const mergedData = [...filteredExistingData, ...data.records];
    
    console.log('Merged data:', {
      recordCount: mergedData.length,
      periods: Array.from(new Set(mergedData.map(r => r.period))),
      totalRevenue: mergedData.reduce((sum, r) => sum + r.revenue, 0)
    });
    
    setCurrentAlpineData(mergedData);
    
    // Recalculate customer progressions based on merged data
    const allCustomers = Array.from(new Set(mergedData.map(r => r.customerName)));
    const updatedCustomerProgressions = new Map();
    allCustomers.forEach(customer => {
      const progress = analyzeCustomerProgress(mergedData, customer);
      updatedCustomerProgressions.set(customer, progress);
    });
    
    setCurrentCustomerProgressions(updatedCustomerProgressions);
    
    // Save to DynamoDB
    try {
      // Convert to SalesRecord format for DynamoDB
      const salesRecords = data.records.map(record => ({
        distributor: 'ALPINE',
        period: record.period,
        customerName: record.customerName,
        productName: record.productName,
        productCode: record.productCode,
        cases: record.cases,
        revenue: record.revenue,
        invoiceKey: generateDeterministicInvoiceKey('ALPINE', record.period, record.customerName, record.productName, record.cases, record.revenue),
        source: 'Alpine Upload',
        timestamp: new Date().toISOString(),
        accountName: record.accountName,
        customerId: record.customerId,
        itemNumber: record.itemNumber,
        size: record.size,
        weightLbs: record.weightLbs,
      }));

      // Save to DynamoDB
      const savedRecords = await saveSalesRecords(salesRecords);
      
      // Only save progressions if records were actually saved
      if (savedRecords && savedRecords.length > 0) {
        for (const [customerName, progression] of Array.from(data.customerProgressions.entries())) {
          await saveCustomerProgressionWithDedup('ALPINE', customerName, progression);
        }
        console.log('Alpine data successfully saved to DynamoDB');
      } else {
        console.log('[Alpine] Duplicate upload detected, skipping progressions');
      }
    } catch (error) {
      console.error('[Alpine] Failed to save Alpine data to DynamoDB:', error);
        setIsUploading(false);
    }
    
    // If new periods were uploaded, select the most recent one to reflect upload
    const newestUploadedPeriod = Array.from(newPeriods).sort().slice(-1)[0];
    if (newestUploadedPeriod) {
      setSelectedMonth(newestUploadedPeriod);
      setSelectedDistributor('ALPINE');
    }
    // Don't hide upload section immediately - let user see the results
    // setShowUploadSection(false); // Hide upload section after successful upload
  };

  const handlePetesDataParsed = (data: { records: AlpineSalesRecord[]; customerProgressions: Map<string, any> }) => {
    const newPeriods = new Set(data.records.map(r => r.period));

    const filteredExistingData = currentPetesData.filter(record => !newPeriods.has(record.period));
    const mergedData = [...filteredExistingData, ...data.records];

    setCurrentPetesData(mergedData);

    const allCustomers = Array.from(new Set(mergedData.map(r => r.customerName)));
    const updatedCustomerProgressions = new Map();
    allCustomers.forEach(customer => {
      const progress = analyzeCustomerProgress(mergedData, customer);
      updatedCustomerProgressions.set(customer, progress);
    });
    setCurrentPetesCustomerProgressions(updatedCustomerProgressions);

    // Save to DynamoDB
    (async () => {
      try {
        const salesRecords = data.records.map(record => ({
          distributor: 'PETES',
          period: record.period,
          customerName: record.customerName,
          productName: record.productName,
          productCode: record.productCode,
          cases: record.cases,
          revenue: record.revenue,
          invoiceKey: generateDeterministicInvoiceKey('PETES', record.period, record.customerName, record.productName, record.cases, record.revenue),
          source: 'Pete\'s Upload',
          timestamp: new Date().toISOString(),
          accountName: record.accountName,
          customerId: record.customerId,
          itemNumber: record.itemNumber,
          size: record.size,
          weightLbs: record.weightLbs,
        }));

        await saveSalesRecords(salesRecords);
        
        for (const [customerName, progression] of Array.from(data.customerProgressions.entries())) {
          await saveCustomerProgressionWithDedup('PETES', customerName, progression);
        }
        
        console.log('Pete\'s data successfully saved to DynamoDB');
        // Hide overlay after all DynamoDB operations complete
        setIsUploading(false);
        setShowUploadSection(false);
      } catch (error) {
        console.error('Failed to save Pete\'s data to DynamoDB:', error);
        setIsUploading(false);
        setIsUploading(false);
      }
    })();

    const newestUploadedPeriod = Array.from(newPeriods).sort().slice(-1)[0];
    if (newestUploadedPeriod) {
      setSelectedMonth(newestUploadedPeriod);
      setSelectedDistributor('PETES');
    }
  };

  const handleClearAlpineData = () => {
    console.log('Clearing Alpine data');
    setCurrentAlpineData([]);
    setCurrentCustomerProgressions(new Map());
  };

  const handleClearPetesData = () => {
    console.log("Clearing Pete's data");
    setCurrentPetesData([]);
    setCurrentPetesCustomerProgressions(new Map());
  };

  const handleKeHeDataParsed = async (data: { records: AlpineSalesRecord[]; customerProgressions: Map<string, any> }) => {
    console.log(`handleKeHeDataParsed called with ${data.records.length} records`);
    const newPeriods = new Set(data.records.map(r => r.period));
    console.log(`New periods from upload:`, Array.from(newPeriods));

    const filteredExistingData = currentKeHeData.filter(record => !newPeriods.has(record.period));
    console.log(`Existing KeHe data: ${currentKeHeData.length} records, keeping ${filteredExistingData.length} (removing ${currentKeHeData.length - filteredExistingData.length})`);
    
    const mergedData = [...filteredExistingData, ...data.records];
    console.log(`Merged KeHe data: ${mergedData.length} records`);
    
    setCurrentKeHeData(mergedData);

    const allCustomers = Array.from(new Set(mergedData.map(r => r.customerName)));
    const updatedCustomerProgressions = new Map();
    allCustomers.forEach(customer => {
      const progress = analyzeCustomerProgress(mergedData, customer);
      updatedCustomerProgressions.set(customer, progress);
    });
    setCurrentKeHeCustomerProgressions(updatedCustomerProgressions);

    // Save to DynamoDB and manage overlay
    (async () => {
      try {
        const salesRecords = data.records.map(record => ({
          distributor: 'KEHE',
          period: record.period,
          customerName: record.customerName,
          productName: record.productName,
          productCode: record.productCode,
          cases: record.cases,
          revenue: record.revenue,
          invoiceKey: generateDeterministicInvoiceKey('KEHE', record.period, record.customerName, record.productName, record.cases, record.revenue),
          source: 'KeHe Upload',
          timestamp: new Date().toISOString(),
          accountName: record.accountName,
          customerId: record.customerId,
          itemNumber: record.itemNumber,
          size: record.size,
          weightLbs: record.weightLbs,
        }));

        const savedRecords = await saveSalesRecords(salesRecords);
        
        // Only save progressions for customers with NEW records (not deduplicated)
        if (savedRecords && savedRecords.length > 0) {
          const customersWithNewRecords = new Set(savedRecords.map(r => r.customerName));
          console.log(`[KeHe Progression] Saving progressions for ${customersWithNewRecords.size} customers with new records`);
          
          for (const [customerName, progression] of Array.from(data.customerProgressions.entries())) {
            if (customersWithNewRecords.has(customerName)) {
              await saveCustomerProgressionWithDedup('KEHE', customerName, progression);
            }
          }
        } else {
          console.log('[KeHe Progression] No new records saved, skipping progression updates');
        }
        
        console.log('KeHe data successfully saved to DynamoDB');
        // Hide overlay after all DynamoDB operations complete
        setIsUploading(false);
        setShowUploadSection(false);
      } catch (error) {
        console.error('Failed to save KeHe data to DynamoDB:', error);
        setIsUploading(false);
        setIsUploading(false);
      }
    })();

    // Automatically switch to KeHe distributor and set the newest period
    const newestUploadedPeriod = Array.from(newPeriods).sort().slice(-1)[0];
    if (newestUploadedPeriod) {
      setSelectedMonth(newestUploadedPeriod);
      setSelectedDistributor('KEHE');
    }
  };

  const handleClearKeHeData = () => {
    console.log('Clearing KeHe data');
    setCurrentKeHeData([]);
    setCurrentKeHeCustomerProgressions(new Map());
  };

  const handleVistarDataParsed = (data: { records: AlpineSalesRecord[]; customerProgressions: Map<string, any> }) => {
    const newPeriods = new Set(data.records.map(r => r.period));

    const filteredExistingData = currentVistarData.filter(record => !newPeriods.has(record.period));
    const mergedData = [...filteredExistingData, ...data.records];

    setCurrentVistarData(mergedData);

    const allCustomers = Array.from(new Set(mergedData.map(r => r.customerName)));
    const updatedCustomerProgressions = new Map();
    allCustomers.forEach(customer => {
      const progress = analyzeCustomerProgress(mergedData, customer);
      updatedCustomerProgressions.set(customer, progress);
    });

    // Save to DynamoDB
    (async () => {
      try {
        const salesRecords = data.records.map(record => ({
          distributor: 'VISTAR',
          period: record.period,
          customerName: record.customerName,
          productName: record.productName,
          productCode: record.productCode,
          cases: record.cases,
          revenue: record.revenue,
          invoiceKey: generateDeterministicInvoiceKey('VISTAR', record.period, record.customerName, record.productName, record.cases, record.revenue),
          source: 'Vistar Upload',
          timestamp: new Date().toISOString(),
          accountName: record.accountName,
          customerId: record.customerId,
          itemNumber: record.itemNumber,
          size: record.size,
          weightLbs: record.weightLbs,
        }));

        await saveSalesRecords(salesRecords);
        
        for (const [customerName, progression] of Array.from(data.customerProgressions.entries())) {
          await saveCustomerProgressionWithDedup('VISTAR', customerName, progression);
        }
        
        console.log('Vistar data successfully saved to DynamoDB');
        // Hide overlay after all DynamoDB operations complete
        setIsUploading(false);
        setShowUploadSection(false);
      } catch (error) {
        console.error('Failed to save Vistar data to DynamoDB:', error);
        setIsUploading(false);
      }
    })();

    const newestUploadedPeriod = Array.from(newPeriods).sort().slice(-1)[0];
    if (newestUploadedPeriod) {
      setSelectedMonth(newestUploadedPeriod);
      setSelectedDistributor('VISTAR');
    }
  };

  const handleClearVistarData = () => {
    console.log('Clearing Vistar data');
    setCurrentVistarData([]);
  };

  const handleTonysDataParsed = (data: { records: AlpineSalesRecord[]; customerProgressions: Map<string, any> }) => {
    const newPeriods = new Set(data.records.map(r => r.period));

    const filteredExistingData = currentTonysData.filter(record => !newPeriods.has(record.period));
    const mergedData = [...filteredExistingData, ...data.records];

    setCurrentTonysData(mergedData);

    const allCustomers = Array.from(new Set(mergedData.map(r => r.customerName)));
    const updatedCustomerProgressions = new Map();
    allCustomers.forEach(customer => {
      const progress = analyzeCustomerProgress(mergedData, customer);
      updatedCustomerProgressions.set(customer, progress);
    });
    setCurrentTonysCustomerProgressions(updatedCustomerProgressions);

    // Save to DynamoDB
    (async () => {
      try {
        const salesRecords = data.records.map(record => ({
          distributor: 'TONYS',
          period: record.period,
          customerName: record.customerName,
          productName: record.productName,
          productCode: record.productCode,
          cases: record.cases,
          revenue: record.revenue,
          invoiceKey: generateDeterministicInvoiceKey('TONYS', record.period, record.customerName, record.productName, record.cases, record.revenue),
          source: 'Tony\'s Upload',
          timestamp: new Date().toISOString(),
          accountName: record.accountName,
          customerId: record.customerId,
          itemNumber: record.itemNumber,
          size: record.size,
          weightLbs: record.weightLbs,
        }));

        await saveSalesRecords(salesRecords);
        
        for (const [customerName, progression] of Array.from(data.customerProgressions.entries())) {
          await saveCustomerProgressionWithDedup('TONYS', customerName, progression);
        }
        
        console.log('Tony\'s data successfully saved to DynamoDB');
        // Hide overlay after all DynamoDB operations complete
        setIsUploading(false);
        setShowUploadSection(false);
      } catch (error) {
        console.error('Failed to save Tony\'s data to DynamoDB:', error);
        setIsUploading(false);
      }
    })();

    const newestUploadedPeriod = Array.from(newPeriods).sort().slice(-1)[0];
    if (newestUploadedPeriod) {
      setSelectedMonth(newestUploadedPeriod);
      setSelectedDistributor('TONYS');
    }
  };

  const handleClearTonysData = () => {
    console.log("Clearing Tony's data");
    setCurrentTonysData([]);
    setCurrentTonysCustomerProgressions(new Map());
  };

  const handleTroiaDataParsed = (data: { records: AlpineSalesRecord[]; customerProgressions: Map<string, any> }) => {
    const newPeriods = new Set(data.records.map(r => r.period));

    const filteredExistingData = currentTroiaData.filter(record => !newPeriods.has(record.period));
    const mergedData = [...filteredExistingData, ...data.records];

    setCurrentTroiaData(mergedData);

    const allCustomers = Array.from(new Set(mergedData.map(r => r.customerName)));
    const updatedCustomerProgressions = new Map();
    allCustomers.forEach(customer => {
      const progress = analyzeCustomerProgress(mergedData, customer);
      updatedCustomerProgressions.set(customer, progress);
    });
    setCurrentTroiaCustomerProgressions(updatedCustomerProgressions);

    // Save to DynamoDB
    (async () => {
      try {
        const salesRecords = data.records.map(record => ({
          distributor: 'TROIA',
          period: record.period,
          customerName: record.customerName,
          productName: record.productName,
          productCode: record.productCode,
          cases: record.cases,
          revenue: record.revenue,
          invoiceKey: generateDeterministicInvoiceKey('TROIA', record.period, record.customerName, record.productName, record.cases, record.revenue),
          source: 'Troia Upload',
          timestamp: new Date().toISOString(),
          accountName: record.accountName,
          customerId: record.customerId,
          itemNumber: record.itemNumber,
          size: record.size,
          weightLbs: record.weightLbs,
        }));

        await saveSalesRecords(salesRecords);
        
        for (const [customerName, progression] of Array.from(data.customerProgressions.entries())) {
          await saveCustomerProgressionWithDedup('TROIA', customerName, progression);
        }
        
        console.log('Troia data successfully saved to DynamoDB');
        // Hide overlay after all DynamoDB operations complete
        setIsUploading(false);
        setShowUploadSection(false);
      } catch (error) {
        console.error('Failed to save Troia data to DynamoDB:', error);
        setIsUploading(false);
        setIsUploading(false);
      }
    })();

    const newestUploadedPeriod = Array.from(newPeriods).sort().slice(-1)[0];
    if (newestUploadedPeriod) {
      setSelectedMonth(newestUploadedPeriod);
      setSelectedDistributor('TROIA');
    }
  };

  const handleClearTroiaData = () => {
    console.log('Clearing Troia data');
    setCurrentTroiaData([]);
    setCurrentTroiaCustomerProgressions(new Map());
  };

  const handleMhdDataParsed = (data: { records: AlpineSalesRecord[]; customerProgressions: Map<string, any> }) => {
    const newPeriods = new Set(data.records.map(r => r.period));

    const filteredExistingData = currentMhdData.filter(record => !newPeriods.has(record.period));
    const mergedData = [...filteredExistingData, ...data.records];

    setCurrentMhdData(mergedData);

    // Save to DynamoDB
    (async () => {
      try {
        const salesRecords = data.records.map(record => ({
          distributor: 'MHD',
          period: record.period,
          customerName: record.customerName,
          productName: record.productName,
          productCode: record.productCode,
          cases: record.cases,
          revenue: record.revenue,
          invoiceKey: generateDeterministicInvoiceKey('MHD', record.period, record.customerName, record.productName, record.cases, record.revenue),
          source: 'Mike Hudson Upload',
          timestamp: new Date().toISOString(),
          accountName: record.accountName,
          customerId: record.customerId,
          itemNumber: record.itemNumber,
          size: record.size,
          weightLbs: record.weightLbs,
        }));

        await saveSalesRecords(salesRecords);
        
        for (const [customerName, progression] of Array.from(data.customerProgressions.entries())) {
          await saveCustomerProgressionWithDedup('MHD', customerName, progression);
        }
        
        console.log('MHD data successfully saved to DynamoDB');
        // Hide overlay after all DynamoDB operations complete
        setIsUploading(false);
        setShowUploadSection(false);
      } catch (error) {
        console.error('Failed to save MHD data to DynamoDB:', error);
        setIsUploading(false);
      }
    })();

    const newestUploadedPeriod = Array.from(newPeriods).sort().slice(-1)[0];
    if (newestUploadedPeriod) {
      setSelectedMonth(newestUploadedPeriod);
      setSelectedDistributor('MHD');
    }
  };

  const handleClearMhdData = () => {
    console.log('Clearing MHD data');
    setCurrentMhdData([]);
  };

  // Removed CSV invoice upload handlers


  // Delete entire period/month of data
  const handleDeletePeriod = async (periodToDelete: string) => {
    // Guard: do not allow deletes in ALL view
    if (selectedDistributor === 'ALL') return;
    
    setIsDeleting(true);
    try {
      // Delete from DynamoDB first
      const distributorMap: Record<string, string> = {
        'ALPINE': 'ALPINE',
        'PETES': 'PETES',
        'KEHE': 'KEHE',
        'VISTAR': 'VISTAR',
        'TONYS': 'TONYS',
        'TROIA': 'TROIA',
        'MHD': 'MHD'
      };
      const distributorName = distributorMap[selectedDistributor];
      
      if (distributorName) {
        await dynamoDBService.deleteCustomerProgressionsByPeriod(distributorName, periodToDelete);
        await dynamoDBService.deleteRecordsByPeriodAndDistributor(distributorName, periodToDelete);
        console.log(`[Dashboard] Deleted ${distributorName} / ${periodToDelete} from DynamoDB`);
      }
    } catch (error) {
      console.error('[Dashboard] Error deleting from DynamoDB:', error);
      alert(`Error deleting: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsDeleting(false);
      return;
    }
    
    if (selectedDistributor === 'ALPINE') {
      const updatedData = currentAlpineData.filter(record => record.period !== periodToDelete);
      setCurrentAlpineData(updatedData);
      const allCustomers = Array.from(new Set(updatedData.map(r => r.customerName)));
      const updatedCustomerProgressions = new Map();
      allCustomers.forEach(customer => {
        const progress = analyzeCustomerProgress(updatedData, customer);
        updatedCustomerProgressions.set(customer, progress);
      });
      setCurrentCustomerProgressions(updatedCustomerProgressions);
    } else if (selectedDistributor === 'PETES') {
      const updatedData = currentPetesData.filter(record => record.period !== periodToDelete);
      setCurrentPetesData(updatedData);
      const allCustomers = Array.from(new Set(updatedData.map(r => r.customerName)));
      const updatedCustomerProgressions = new Map();
      allCustomers.forEach(customer => {
        const progress = analyzeCustomerProgress(updatedData, customer);
        updatedCustomerProgressions.set(customer, progress);
      });
      setCurrentPetesCustomerProgressions(updatedCustomerProgressions);
    } else if (selectedDistributor === 'KEHE') {
      const updatedData = currentKeHeData.filter(record => record.period !== periodToDelete);
      setCurrentKeHeData(updatedData);
      const allCustomers = Array.from(new Set(updatedData.map(r => r.customerName)));
      const updatedCustomerProgressions = new Map();
      allCustomers.forEach(customer => {
        const progress = analyzeCustomerProgress(updatedData, customer);
        updatedCustomerProgressions.set(customer, progress);
      });
      setCurrentKeHeCustomerProgressions(updatedCustomerProgressions);
    } else if (selectedDistributor === 'VISTAR') {
      const updatedData = currentVistarData.filter(record => record.period !== periodToDelete);
      setCurrentVistarData(updatedData);
    } else if (selectedDistributor === 'TONYS') {
      const updatedData = currentTonysData.filter(record => record.period !== periodToDelete);
      setCurrentTonysData(updatedData);
      const allCustomers = Array.from(new Set(updatedData.map(r => r.customerName)));
      const updatedCustomerProgressions = new Map();
      allCustomers.forEach(customer => {
        const progress = analyzeCustomerProgress(updatedData, customer);
        updatedCustomerProgressions.set(customer, progress);
      });
      setCurrentTonysCustomerProgressions(updatedCustomerProgressions);
    } else if (selectedDistributor === 'MHD') {
      const updatedData = currentMhdData.filter(record => record.period !== periodToDelete);
      setCurrentMhdData(updatedData);
    }

    if (selectedMonth === periodToDelete) {
      const remainingPeriods = Array.from(new Set(dataForTotals.filter(r => r.period !== periodToDelete).map(r => r.period))).sort();
      setSelectedMonth(remainingPeriods.length > 0 ? remainingPeriods[remainingPeriods.length - 1] : 'ALL_MONTHS');
    }

    console.log('[Dashboard] Period deleted:', periodToDelete);
    setIsDeleting(false);
  };

  // Calculate KPIs based on filtered data
  const kpis = useMemo(() => {
    const totalRevenue = filteredData.reduce((sum, record) => sum + record.revenue, 0);
    const totalCases = filteredData.reduce((sum, record) => sum + record.cases, 0);
    
    console.log('KPI Calculation:', {
      selectedMonth,
      selectedDistributor,
      filteredDataLength: filteredData.length,
      totalRevenue,
      totalCases,
      revenueByPeriod: filteredData.reduce((acc, record) => {
        acc[record.period] = (acc[record.period] || 0) + record.revenue;
        return acc;
      }, {} as Record<string, number>)
    });
    
    // Top customer by revenue
    const customerRevenue = filteredData.reduce((acc, record) => {
      acc[record.customerName] = (acc[record.customerName] || 0) + record.revenue;
      return acc;
    }, {} as Record<string, number>);
    const topCustomer = Object.entries(customerRevenue).sort(([,a], [,b]) => b - a)[0];

    // Top product by revenue (exclude adjustment records)
    const productRevenue = filteredData.reduce((acc, record) => {
      if (!record.isAdjustment) {
        acc[record.productName] = (acc[record.productName] || 0) + record.revenue;
      }
      return acc;
    }, {} as Record<string, number>);
    const topProduct = Object.entries(productRevenue).sort(([,a], [,b]) => b - a)[0];

    return {
      totalRevenue,
      totalCases,
      topCustomer: topCustomer ? topCustomer[0] : 'N/A',
      topProduct: topProduct ? topProduct[0] : 'N/A',
    };
  }, [filteredData, selectedMonth, selectedDistributor]);

  // Time aggregation functions
  const aggregateDataByTimePeriod = useMemo(() => {
    // Check if we have enough data to warrant filtering
    if (dataForTotals.length === 0) {
      return dataForTotals;
    }

    // Get the date range of available data
    const periods = Array.from(new Set(dataForTotals.map(r => r.period))).sort();
    const earliestPeriod = periods[0];
    const latestPeriod = periods[periods.length - 1];
    
    const [earliestYear, earliestMonth] = earliestPeriod.split('-');
    const [latestYear, latestMonth] = latestPeriod.split('-');
    const earliestDate = new Date(parseInt(earliestYear), parseInt(earliestMonth) - 1);
    const latestDate = new Date(parseInt(latestYear), parseInt(latestMonth) - 1);
    
    // Calculate data span in months for more accurate comparison
    const dataSpanMonths = (latestDate.getFullYear() - earliestDate.getFullYear()) * 12 + 
                          (latestDate.getMonth() - earliestDate.getMonth()) + 1; // +1 to include both start and end months

    // Convert selected period to months
    const selectedMonths = timeAggregation === '3mo' ? 3 : 
                          timeAggregation === '6mo' ? 6 : 
                          timeAggregation === '1yr' ? 12 : 
                          timeAggregation === '5yr' ? 60 : 0;
    
    // If the data span is less than or equal to the selected period, return all data
    if (dataSpanMonths <= selectedMonths) {
      return dataForTotals;
    }

    // Calculate cutoff date based on the time period
    let cutoffDate: Date;
    
    switch (timeAggregation) {
      case '3mo':
        // For 3 months, subtract 3 months from latest date
        cutoffDate = new Date(latestDate.getFullYear(), latestDate.getMonth() - 3, 1);
        break;
      case '6mo':
        // For 6 months, subtract 6 months from latest date
        cutoffDate = new Date(latestDate.getFullYear(), latestDate.getMonth() - 6, 1);
        break;
      case '1yr':
        // For 1 year, subtract 1 year from latest date
        cutoffDate = new Date(latestDate.getFullYear() - 1, latestDate.getMonth(), 1);
        break;
      case '5yr':
        // For 5yr, show all available data since user doesn't have more than 5 years
        return dataForTotals;
      default:
        cutoffDate = new Date(latestDate);
    }

    const filteredData = dataForTotals.filter(record => {
      const [year, month] = record.period.split('-');
      const recordDate = new Date(parseInt(year), parseInt(month) - 1);
      return recordDate >= cutoffDate;
    });

    // Debug logging for filtering
    console.log('Data filtering debug:', {
      timeAggregation,
      originalRecords: dataForTotals.length,
      filteredRecords: filteredData.length,
      cutoffDate: cutoffDate.toISOString(),
      latestDate: latestDate.toISOString(),
      earliestDate: earliestDate.toISOString(),
      periods: Array.from(new Set(filteredData.map(r => r.period))).sort()
    });

    return filteredData;
  }, [dataForTotals, timeAggregation]);

  // Revenue over time data (grouped by periods) - Use aggregated data based on time period selection
  const revenueOverTime = useMemo(() => {
    const periodRevenue = aggregateDataByTimePeriod.reduce((acc, record) => {
      const period = record.period;
      acc[period] = (acc[period] || 0) + record.revenue;
      return acc;
    }, {} as Record<string, number>);

    const periodCases = aggregateDataByTimePeriod.reduce((acc, record) => {
      const period = record.period;
      acc[period] = (acc[period] || 0) + record.cases;
      return acc;
    }, {} as Record<string, number>);

    // Get periods from aggregated data, not all available periods
    const aggregatedPeriods = Array.from(new Set(aggregateDataByTimePeriod.map(r => r.period))).sort();
    
    // Debug logging
    console.log('Time aggregation debug:', {
      timeAggregation,
      totalRecords: aggregateDataByTimePeriod.length,
      uniquePeriods: aggregatedPeriods.length,
      periods: aggregatedPeriods
    });
    
    return aggregatedPeriods.map((period) => ({
      period,
      revenue: Math.round((periodRevenue[period] || 0) * 100) / 100,
      cases: periodCases[period] || 0,
    }));
  }, [aggregateDataByTimePeriod, timeAggregation]);

  // Chart navigation logic
  const CHART_WINDOW_SIZE = 12; // Show 12 periods at a time (1 year)
  const CUSTOMER_PIVOT_WINDOW_SIZE = 3; // Show 3 periods at a time
  const MONTHLY_SUMMARY_WINDOW_SIZE = 6; // Show 6 months at a time
  const visibleRevenueData = useMemo(() => {
    if (!chartVisibleRange || revenueOverTime.length <= CHART_WINDOW_SIZE) {
      return revenueOverTime;
    }
    return revenueOverTime.slice(chartVisibleRange.start, chartVisibleRange.end + 1);
  }, [revenueOverTime, chartVisibleRange]);

  // Determine which period to highlight on the chart
  const highlightedPeriod = useMemo(() => {
    if (selectedMonth) return selectedMonth;
    // Default to most recent available period
    return availablePeriods.length ? availablePeriods[availablePeriods.length - 1] : '';
  }, [selectedMonth, availablePeriods]);

  // Initialize chart range when data changes or selected month changes
  React.useEffect(() => {
    if (revenueOverTime.length <= CHART_WINDOW_SIZE) {
      setChartVisibleRange(null);
      return;
    }
    
    if (revenueOverTime.length > CHART_WINDOW_SIZE) {
      // Always position the most recent month on the right
      const end = revenueOverTime.length - 1;
      const start = Math.max(0, end - CHART_WINDOW_SIZE + 1);
      
      setChartVisibleRange({ start, end });
    } else {
      setChartVisibleRange(null);
    }
  }, [revenueOverTime, timeAggregation]);

  // Reset customer pivot range when data changes
  useEffect(() => {
    setCustomerPivotRange(null);
  }, [currentData]);


  // Reset monthly summary range when modal closes
  useEffect(() => {
    if (!showMonthlySummary) {
      setMonthlySummaryRange(null);
    }
  }, [showMonthlySummary]);

  // Chart navigation function (currently unused, kept for future use)
  // const navigateChart = (direction: 'left' | 'right') => {
  //   if (!chartVisibleRange || revenueOverTime.length <= CHART_WINDOW_SIZE) return;
  //   
  //   const step = Math.floor(CHART_WINDOW_SIZE / 2); // Move by half the window size
  //   let newStart, newEnd;
  //   
  //   if (direction === 'left') {
  //     newStart = Math.max(0, chartVisibleRange.start - step);
  //     newEnd = Math.min(revenueOverTime.length - 1, newStart + CHART_WINDOW_SIZE - 1);
  //   } else {
  //     newEnd = Math.min(revenueOverTime.length - 1, chartVisibleRange.end + step);
  //     newStart = Math.max(0, newEnd - CHART_WINDOW_SIZE + 1);
  //   }
  //   
  //   setChartVisibleRange({ start: newStart, end: newEnd });
  // };

  const navigateCustomerPivot = (direction: 'left' | 'right', totalPeriods: number) => {
    if (!customerPivotRange) return;
    
    let newStart, newEnd;
    if (direction === 'left') {
      // Move window left by 1 month
      newStart = Math.max(0, customerPivotRange.start - 1);
      newEnd = Math.min(totalPeriods - 1, newStart + CUSTOMER_PIVOT_WINDOW_SIZE - 1);
    } else {
      // Move window right by 1 month
      newEnd = Math.min(totalPeriods - 1, customerPivotRange.end + 1);
      newStart = Math.max(0, newEnd - CUSTOMER_PIVOT_WINDOW_SIZE + 1);
    }
    
    setCustomerPivotRange({ start: newStart, end: newEnd });
  };


  // Revenue by customer data
  const revenueByCustomer = useMemo(() => {
    const customerRevenue = filteredData.reduce((acc, record) => {
      acc[record.customerName] = (acc[record.customerName] || 0) + record.revenue;
      return acc;
    }, {} as Record<string, number>);

    const customerCases = filteredData.reduce((acc, record) => {
      acc[record.customerName] = (acc[record.customerName] || 0) + record.cases;
      return acc;
    }, {} as Record<string, number>);

    const customerIds = filteredData.reduce((acc, record) => {
      acc[record.customerName] = record.customerId || '';
      return acc;
    }, {} as Record<string, string>);

    const entries = Object.entries(customerRevenue).map(([customer, revenue], index) => ({
      id: `${customer}-${index}`,
      customer: customer,
      fullCustomerName: customer,
      customerId: customerIds[customer] || '',
      revenue: Math.round(revenue * 100) / 100,
      cases: customerCases[customer] || 0,
    }));

    // Sort by the appropriate field based on display mode
    return entries.sort((a, b) => {
      const sortField = displayMode === 'revenue' ? 'revenue' : 'cases';
      return b[sortField] - a[sortField];
    });
  }, [filteredData, displayMode]);

  // Revenue by product data
  const revenueByProduct = useMemo(() => {
    const productRevenue = filteredData.reduce((acc, record) => {
      if (!record.isAdjustment) {
        acc[record.productName] = (acc[record.productName] || 0) + record.revenue;
      }
      return acc;
    }, {} as Record<string, number>);

    const productCases = filteredData.reduce((acc, record) => {
      if (!record.isAdjustment) {
        acc[record.productName] = (acc[record.productName] || 0) + record.cases;
      }
      return acc;
    }, {} as Record<string, number>);

    const entries = Object.entries(productRevenue).map(([product, revenue], index) => ({
      id: `${product}-${index}`,
      product: product,
      fullProduct: product,
      revenue: Math.round(revenue * 100) / 100,
      cases: productCases[product] || 0,
    }));

    // Sort by the appropriate field based on display mode
    return entries.sort((a, b) => {
      const sortField = displayMode === 'revenue' ? 'revenue' : 'cases';
      return b[sortField] - a[sortField];
    });
  }, [filteredData, displayMode]);

  // New vs Lost customers (current vs previous period)
  const currentComparisonPeriod = useMemo(() => {
    if (selectedMonth && selectedMonth !== 'all') return selectedMonth;
    return availablePeriods.length ? availablePeriods[availablePeriods.length - 1] : '';
  }, [selectedMonth, availablePeriods]);

  const previousComparisonPeriod = useMemo(() => {
    if (!currentComparisonPeriod) return '';
    const idx = availablePeriods.indexOf(currentComparisonPeriod);
    return idx > 0 ? availablePeriods[idx - 1] : '';
  }, [currentComparisonPeriod, availablePeriods]);

  const { newCustomers, lostCustomers } = useMemo(() => {
    if (!currentComparisonPeriod || !previousComparisonPeriod) {
      return { newCustomers: [] as string[], lostCustomers: [] as string[] };
    }
    
    // Get all customers who appeared in current period
    const curSet = new Set(
      dataForTotals
        .filter(r => r.period === currentComparisonPeriod)
        .map(r => r.customerName)
    );
    
    // Get all customers who appeared in previous period
    const prevSet = new Set(
      dataForTotals
        .filter(r => r.period === previousComparisonPeriod)
        .map(r => r.customerName)
    );
    
    // Get all customers who appeared in any period before the current period
    const allPreviousPeriods = availablePeriods.filter(p => p < currentComparisonPeriod);
    const allPreviousCustomers = new Set(
      dataForTotals
        .filter(r => allPreviousPeriods.includes(r.period))
        .map(r => r.customerName)
    );
    
    // A customer is "new" only if they appear in current period but have NEVER appeared in any previous period
    const newList = Array.from(curSet).filter(c => !allPreviousCustomers.has(c)).sort((a, b) => a.localeCompare(b));
    
    // A customer is "lost" if they appeared in previous period but not in current period
    const lostList = Array.from(prevSet).filter(c => !curSet.has(c)).sort((a, b) => a.localeCompare(b));
    
    return { newCustomers: newList, lostCustomers: lostList };
  }, [dataForTotals, currentComparisonPeriod, previousComparisonPeriod, availablePeriods]);

  // Previously displayed revenue summaries removed from UI; keep code lean

  // Build detailed rows with revenue and cases for sorting/display
  const newCustomersDetailed = useMemo(() => {
    const cur = dataForTotals.filter(r => r.period === currentComparisonPeriod);
    const revenueByCustomer: Record<string, number> = {};
    const casesByCustomer: Record<string, number> = {};
    cur.forEach(r => { 
      revenueByCustomer[r.customerName] = (revenueByCustomer[r.customerName] || 0) + (r.revenue || 0);
      casesByCustomer[r.customerName] = (casesByCustomer[r.customerName] || 0) + (r.cases || 0);
    });
    return newCustomers.map(name => ({ 
      name, 
      revenue: revenueByCustomer[name] || 0,
      cases: casesByCustomer[name] || 0
    }));
  }, [dataForTotals, currentComparisonPeriod, newCustomers]);

  const lostCustomersDetailed = useMemo(() => {
    const prev = dataForTotals.filter(r => r.period === previousComparisonPeriod);
    const revenueByCustomer: Record<string, number> = {};
    const casesByCustomer: Record<string, number> = {};
    prev.forEach(r => { 
      revenueByCustomer[r.customerName] = (revenueByCustomer[r.customerName] || 0) + (r.revenue || 0);
      casesByCustomer[r.customerName] = (casesByCustomer[r.customerName] || 0) + (r.cases || 0);
    });
    return lostCustomers.map(name => ({ 
      name, 
      revenue: revenueByCustomer[name] || 0,
      cases: casesByCustomer[name] || 0
    }));
  }, [dataForTotals, previousComparisonPeriod, lostCustomers]);

  const [movementFilter, setMovementFilter] = useState('');

  

  // Combined progressions for ALL view
  const combinedCustomerProgressions = useMemo(() => {
    // Exclude Pete's data to avoid double-counting (it's a sub-distributor)
    const data = [...currentAlpineData, ...currentPetesData, ...currentKeHeData, ...currentVistarData, ...currentTonysData].filter(r => !r.excludeFromTotals);
    const customers = Array.from(new Set(data.map(r => r.customerName)));
    const map = new Map<string, any>();
    customers.forEach(c => {
      map.set(c, analyzeCustomerProgress(data, c));
    });
    return map;
  }, [currentAlpineData, currentPetesData, currentKeHeData, currentVistarData, currentTonysData]);

  const getDistributorLabel = (d: 'ALPINE' | 'PETES' | 'KEHE' | 'VISTAR' | 'TONYS' | 'TROIA' | 'MHD' | 'ALL' = selectedDistributor) => (
    d === 'ALPINE' ? 'Alpine' : d === 'PETES' ? "Pete's Coffee" : d === 'KEHE' ? 'KeHe' : d === 'VISTAR' ? 'Vistar' : d === 'TONYS' ? "Tony's Fine Foods" : d === 'TROIA' ? 'Troia Foods' : d === 'MHD' ? 'Mike Hudson' : 'All Businesses'
  );

  // Monthly accounts/cases summary pivot
  const monthlySummary = useMemo(() => {
    const months = Array.from(new Set(dataForTotals.map(r => r.period))).sort();
    const firstPurchaseByCustomer = new Map<string, string>();
    // Determine first purchase month per customer
    const byCustomer = new Map<string, string[]>();
    dataForTotals.forEach(r => {
      if (!byCustomer.has(r.customerName)) byCustomer.set(r.customerName, []);
      byCustomer.get(r.customerName)!.push(r.period);
    });
    byCustomer.forEach((periods, customer) => {
      firstPurchaseByCustomer.set(customer, periods.sort()[0]);
    });

    const accountsOrderedByMonth: Record<string, number> = {};
    const newAccountsByMonth: Record<string, number> = {};
    const newAccountNamesByMonth: Record<string, string[]> = {};
    const totalCasesByMonth: Record<string, number> = {};
    const customersByMonth: Record<string, Set<string>> = {};

    months.forEach(m => {
      const records = dataForTotals.filter(r => r.period === m);
      const orderedAccountSet = new Set(records.map(r => r.customerName));
      const newAccounts = Array.from(new Set(records
        .filter(r => firstPurchaseByCustomer.get(r.customerName) === m)
        .map(r => r.customerName)));
      accountsOrderedByMonth[m] = orderedAccountSet.size;
      newAccountsByMonth[m] = newAccounts.length;
      newAccountNamesByMonth[m] = newAccounts.sort((a, b) => a.localeCompare(b));
      totalCasesByMonth[m] = records.reduce((s, r) => s + (r.cases || 0), 0);
      customersByMonth[m] = orderedAccountSet;
    });

    const deltaAccountsByMonth: Record<string, number> = {};
    const gainedVsPrevByMonth: Record<string, string[]> = {};
    const lostVsPrevByMonth: Record<string, string[]> = {};
    months.forEach((m, idx) => {
      const prev = idx > 0 ? accountsOrderedByMonth[months[idx - 1]] : 0;
      deltaAccountsByMonth[m] = accountsOrderedByMonth[m] - prev;
      if (idx > 0) {
        const prevMonth = months[idx - 1];
        const prevSet = customersByMonth[prevMonth] || new Set();
        const curSet = customersByMonth[m] || new Set();
        const gained: string[] = [];
        const lost: string[] = [];
        curSet.forEach(c => { if (!prevSet.has(c)) gained.push(c); });
        prevSet.forEach(c => { if (!curSet.has(c)) lost.push(c); });
        gainedVsPrevByMonth[m] = gained.sort((a, b) => a.localeCompare(b));
        lostVsPrevByMonth[m] = lost.sort((a, b) => a.localeCompare(b));
      } else {
        gainedVsPrevByMonth[m] = [];
        lostVsPrevByMonth[m] = [];
      }
    });

    const avgCasesPerAccountByMonth: Record<string, number> = {};
    months.forEach(m => {
      const acct = accountsOrderedByMonth[m] || 0;
      avgCasesPerAccountByMonth[m] = acct > 0 ? totalCasesByMonth[m] / acct : 0;
    });

    return {
      months,
      newAccountsByMonth,
      newAccountNamesByMonth,
      accountsOrderedByMonth,
      deltaAccountsByMonth,
      gainedVsPrevByMonth,
      lostVsPrevByMonth,
      totalCasesByMonth,
      avgCasesPerAccountByMonth
    };
  }, [dataForTotals]);


  // Get visible months for monthly summary
  const visibleMonthlySummaryMonths = useMemo(() => {
    if (!monthlySummaryRange || monthlySummary.months.length <= MONTHLY_SUMMARY_WINDOW_SIZE) {
      return monthlySummary.months;
    }
    return monthlySummary.months.slice(monthlySummaryRange.start, monthlySummaryRange.end + 1);
  }, [monthlySummary.months, monthlySummaryRange]);

  const navigateMonthlySummary = (direction: 'left' | 'right') => {
    if (!monthlySummaryRange || monthlySummary.months.length <= MONTHLY_SUMMARY_WINDOW_SIZE) return;
    
    let newStart, newEnd;
    if (direction === 'left') {
      // Move window left by 1 month
      newStart = Math.max(0, monthlySummaryRange.start - 1);
      newEnd = Math.min(monthlySummary.months.length - 1, newStart + MONTHLY_SUMMARY_WINDOW_SIZE - 1);
    } else {
      // Move window right by 1 month
      newEnd = Math.min(monthlySummary.months.length - 1, monthlySummaryRange.end + 1);
      newStart = Math.max(0, newEnd - MONTHLY_SUMMARY_WINDOW_SIZE + 1);
    }
    
    setMonthlySummaryRange({ start: newStart, end: newEnd });
  };

  const handleDownloadMonthlySummaryCSV = () => {
    const csvHeaders = ['Metric', ...visibleMonthlySummaryMonths.map(m => getShortMonthLabel(m))];
    
    const csvRows = [
      ['New Accounts', ...visibleMonthlySummaryMonths.map(m => (monthlySummary.newAccountsByMonth[m] || 0).toString())],
      ['Total Accounts Ordered', ...visibleMonthlySummaryMonths.map(m => (monthlySummary.accountsOrderedByMonth[m] || 0).toString())],
      ['Δ', ...visibleMonthlySummaryMonths.map(m => (monthlySummary.deltaAccountsByMonth[m] || 0).toString())],
      ['Total Cases Sold', ...visibleMonthlySummaryMonths.map(m => (monthlySummary.totalCasesByMonth[m] || 0).toString())],
      ['Average Cases / Account', ...visibleMonthlySummaryMonths.map(m => (monthlySummary.avgCasesPerAccountByMonth[m] || 0).toFixed(1))]
    ];

    const csvContent = [csvHeaders, ...csvRows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    const dateRange = monthlySummaryRange ? 
      `${getShortMonthLabel(monthlySummary.months[monthlySummaryRange.start])}_to_${getShortMonthLabel(monthlySummary.months[monthlySummaryRange.end])}` :
      'all_months';
    link.setAttribute('download', `Monthly_Accounts_Cases_Summary_${dateRange}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Initialize monthly summary range when modal opens or data changes
  useEffect(() => {
    if (showMonthlySummary && monthlySummary.months.length > MONTHLY_SUMMARY_WINDOW_SIZE && !monthlySummaryRange) {
      // Find current month index
      const currentMonth = selectedMonth && selectedMonth !== 'all' ? selectedMonth : monthlySummary.months[monthlySummary.months.length - 1];
      const currentIndex = monthlySummary.months.findIndex(month => month === currentMonth);
      
      if (currentIndex >= 0) {
        // Position current month on the right (last position in the 6-month window)
        const end = currentIndex;
        const start = Math.max(0, end - MONTHLY_SUMMARY_WINDOW_SIZE + 1);
        setMonthlySummaryRange({ start, end });
      } else {
        // Fallback to showing the most recent months
        const start = Math.max(0, monthlySummary.months.length - MONTHLY_SUMMARY_WINDOW_SIZE);
        const end = monthlySummary.months.length - 1;
        setMonthlySummaryRange({ start, end });
      }
    }
  }, [showMonthlySummary, monthlySummary.months, selectedMonth, monthlySummaryRange]);

  // Full-screen overlay for uploads and deletions
  if (isDeleting || isUploading) {
    const isDelete = isDeleting;
    const title = isDelete ? 'Processing Deletion...' : 'Processing Upload...';
    const mainMessage = isDelete 
      ? 'Removing data from database' 
      : 'Uploading file to database';
    const subMessage = isDelete
      ? 'This may take a moment. Please do not refresh the page or close your browser.'
      : uploadDescription || 'Processing your upload. Please do not refresh the page or close your browser.';
    const steps = isDelete
      ? ['Deleting from database...', 'Updating dashboard...']
      : ['Parsing file...', 'Deduplicating records...', 'Uploading to database...', 'Updating progressions...'];

    return (
      <div className="fixed inset-0 flex items-center justify-center z-[10005] bg-black bg-opacity-60">
        <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full mx-4 text-center">
          {/* Spinner */}
          <div className="flex justify-center mb-6">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-600 border-r-blue-600 animate-spin"></div>
            </div>
          </div>

          {/* Main Title */}
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
          
          {/* Main Message */}
          <p className="text-gray-600 mb-6 text-sm font-medium">{mainMessage}</p>

          {/* Sub Message / Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-900 leading-relaxed">{subMessage}</p>
          </div>

          {/* Processing Steps */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2 mb-6">
            {steps.map((step, idx) => (
              <div key={idx} className="flex items-center justify-start text-left">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center mr-3">
                  <svg className="w-3 h-3 text-white animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-sm text-gray-700">{step}</span>
              </div>
            ))}
          </div>

          {/* Warning Message */}
          <div className="flex items-start justify-center gap-3 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-xs text-amber-800 font-medium">Do not refresh, close, or navigate away</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3">
                <img src="/galantfoodco.avif" alt="Galant Food Co." className="h-24 w-auto" />
                <h1 className="text-3xl font-bold text-gray-900">{getDistributorLabel()} Sales Reports</h1>
                <div className="relative distributor-dropdown">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsDistributorDropdownOpen(!isDistributorDropdownOpen)}
                    className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
                  >
                    {getDistributorLabel()}
                    <ChevronDown className={`w-4 h-4 transition-transform ${isDistributorDropdownOpen ? 'rotate-180' : ''}`} />
                  </Button>
                  {isDistributorDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                      <div className="py-1">
                        {(['ALPINE','PETES','KEHE','VISTAR','TONYS','TROIA','MHD','ALL'] as const).map((d) => (
                          <button
                            key={d}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setSelectedDistributor(d);
                              setIsDistributorDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${selectedDistributor === d ? 'text-blue-700 font-medium' : 'text-gray-700'}`}
                          >
                            {getDistributorLabel(d)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <p className="text-gray-600">{getDistributorLabel()} sales analysis for</p>
                <div className="relative month-dropdown">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsMonthDropdownOpen(!isMonthDropdownOpen)}
                    className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
                  >
                    {selectedMonth ? getShortMonthLabel(selectedMonth) : 'Select Month'}
                    <ChevronDown className={`w-4 h-4 transition-transform ${isMonthDropdownOpen ? 'rotate-180' : ''}`} />
                  </Button>
                  
                  {isMonthDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                      <div className="py-1">
                        {allPeriodOptions.map((period) => (
                          <div
                            key={period}
                            className={`flex items-center justify-between gap-2 px-2 ${
                              selectedMonth === period ? 'bg-blue-50' : ''
                            }`}
                          >
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('Month dropdown clicked:', period, 'Current selectedMonth:', selectedMonth);
                                console.log('Setting selectedMonth to:', period);
                                setSelectedMonth(period);
                                console.log('Selected month set, closing dropdown');
                                setIsMonthDropdownOpen(false);
                              }}
                              className={`flex-1 text-left px-2 py-2 text-sm rounded hover:bg-gray-50 ${
                                selectedMonth === period ? 'text-blue-700 font-medium' : 'text-gray-700'
                              }`}
                            >
                              {getShortMonthLabel(period)}
                            </button>
                            {selectedDistributor !== 'ALL' && period !== 'ALL_MONTHS' && (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setPendingDeletePeriod(period);
                                }}
                                title={`Delete ${getShortMonthLabel(period)}`}
                                className="p-2 rounded text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Revenue/Cases Toggle */}
                <div className="flex items-center bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setDisplayMode('revenue')}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                      displayMode === 'revenue' 
                        ? 'bg-white text-blue-700 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Revenue
                  </button>
                  <button
                    onClick={() => setDisplayMode('cases')}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                      displayMode === 'cases' 
                        ? 'bg-white text-blue-700 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Cases
                  </button>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMonthlySummary(true)}
                className="flex items-center gap-2"
              >
                View Monthly Summary
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCustomReport(true)}
                className="flex items-center gap-2"
              >
                Custom Report
              </Button>
              <Button
                onClick={() => {
                  if (!showUploadSection) {
                    // Increment key to force fresh component mount when opening
                    setUploadSectionKey(prev => prev + 1);
                  }
                  setShowUploadSection(!showUploadSection);
                }}
                className="flex items-center gap-2"
                variant={showUploadSection ? "default" : "outline"}
              >
                {showUploadSection ? <BarChart3 className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
                {showUploadSection ? 'View Dashboard' : 'Upload Data'}
              </Button>
            </div>
          </div>
        </div>

      {/* Monthly Summary Popout */}
      {showMonthlySummary && (
        <>
          <div className="fixed inset-0 z-[10001]" onClick={() => setShowMonthlySummary(false)} />
          <div
            className="fixed left-1/2 top-24 -translate-x-1/2 w-[95vw] max-w-5xl bg-white border border-gray-200 rounded-lg shadow-2xl z-[10002]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50 rounded-t-lg">
              <div className="text-sm font-medium">Monthly Accounts & Cases Summary</div>
              <div className="flex items-center gap-3">
                {/* Navigation controls for monthly summary */}
                {monthlySummary.months.length > MONTHLY_SUMMARY_WINDOW_SIZE && (
                  <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2">
                    <button
                      onClick={() => navigateMonthlySummary('left')}
                      className="p-1 hover:bg-gray-200 rounded disabled:opacity-50"
                      disabled={!monthlySummaryRange || monthlySummaryRange.start === 0}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm text-gray-700 px-2 whitespace-nowrap">
                      {monthlySummaryRange ? 
                        `${getShortMonthLabel(monthlySummary.months[monthlySummaryRange.start])} - ${getShortMonthLabel(monthlySummary.months[monthlySummaryRange.end])}` :
                        `${monthlySummary.months.length} months`
                      }
                    </span>
                    <button
                      onClick={() => navigateMonthlySummary('right')}
                      className="p-1 hover:bg-gray-200 rounded disabled:opacity-50"
                      disabled={!monthlySummaryRange || monthlySummaryRange.end === monthlySummary.months.length - 1}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <button
                  onClick={handleDownloadMonthlySummaryCSV}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Download CSV
                </button>
                <Button variant="ghost" size="sm" onClick={() => setShowMonthlySummary(false)} className="h-7 px-2">✕</Button>
              </div>
            </div>
            <div className="max-h-[70vh] overflow-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="p-2 text-left w-56">Metric</th>
                    <th className="p-2 w-16"></th>
                    {visibleMonthlySummaryMonths.map((m) => (
                      <th key={m} className="p-2 text-right whitespace-nowrap">{getShortMonthLabel(m)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr 
                    className="hover:bg-gray-100 transition-colors duration-150 cursor-pointer"
                    onClick={handleNewAccountsClick}
                  >
                    <td className="p-2 font-medium">New Accounts</td>
                    <td className="p-2 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNewAccountsClick();
                        }}
                        className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                      >
                        View
                      </button>
                    </td>
                    {visibleMonthlySummaryMonths.map((m) => (
                      <td key={m} className="p-2 text-right">
                        <div 
                          className="relative inline-block group"
                        >
                          <span className="tabular-nums inline-block px-1 rounded">{monthlySummary.newAccountsByMonth[m] || 0}</span>
                        </div>
                      </td>
                    ))}
                  </tr>
                  <tr className="hover:bg-gray-100 transition-colors duration-150">
                    <td className="p-2 font-medium">Total Accounts Ordered</td>
                    <td className="p-2 text-center"></td>
                    {visibleMonthlySummaryMonths.map((m) => (
                      <td key={m} className="p-2 text-right tabular-nums">{monthlySummary.accountsOrderedByMonth[m] || 0}</td>
                    ))}
                  </tr>
                  <tr className="hover:bg-gray-100 transition-colors duration-150">
                    <td className="p-2 font-medium">Δ</td>
                    <td className="p-2 text-center">
                      <button
                        onClick={handleDeltaViewClick}
                        className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                      >
                        View
                      </button>
                    </td>
                    {visibleMonthlySummaryMonths.map((m, idx) => (
                      <td key={m} className="p-2 text-right">
                        <span className={`tabular-nums px-1 rounded ${((monthlySummary.deltaAccountsByMonth[m] || 0) >= 0) ? 'text-green-700' : 'text-red-700'}`}>
                          {monthlySummary.deltaAccountsByMonth[m] || 0}
                        </span>
                      </td>
                    ))}
                  </tr>
                  <tr className="hover:bg-gray-100 transition-colors duration-150">
                    <td className="p-2 font-medium">Total Cases Sold</td>
                    <td className="p-2 text-center"></td>
                    {visibleMonthlySummaryMonths.map((m) => (
                      <td key={m} className="p-2 text-right tabular-nums">{monthlySummary.totalCasesByMonth[m] || 0}</td>
                    ))}
                  </tr>
                  <tr className="hover:bg-gray-100 transition-colors duration-150">
                    <td className="p-2 font-medium">Average Cases / Account</td>
                    <td className="p-2 text-center"></td>
                    {visibleMonthlySummaryMonths.map((m) => (
                      <td key={m} className="p-2 text-right tabular-nums">{(monthlySummary.avgCasesPerAccountByMonth[m] || 0).toFixed(1)}</td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2 text-[11px] text-gray-500 border-t rounded-b-lg">All uploaded periods</div>
          </div>
        </>
      )}

      {/* Custom Report Modal */}
      {showCustomReport && (
        <CustomReportModal
          isOpen={showCustomReport}
          onClose={() => setShowCustomReport(false)}
          data={currentData}
          availablePeriods={availablePeriods}
          alpineData={currentAlpineData}
          petesData={currentPetesData}
          keheData={currentKeHeData}
          vistarData={currentVistarData}
          tonysData={currentTonysData}
          troiaData={currentTroiaData}
          mhdData={currentMhdData}
        />
      )}

        {/* Upload Section */}
        {showUploadSection && (
          <div className="mb-8 space-y-6">
            {selectedDistributor === 'ALPINE' ? (
              <AlpineReportUpload
                key={`alpine-${uploadSectionKey}`}
                onDataParsed={handleAlpineDataParsed}
                onClearData={handleClearAlpineData}
                onProcessingComplete={() => setShowUploadSection(false)}
                onUploadStart={() => setIsUploading(true)}
                onUploadDescription={setUploadDescription}
                onUploadEnd={() => setIsUploading(false)}
              />
            ) : selectedDistributor === 'PETES' ? (
              <PetesReportUpload
                key={`petes-${uploadSectionKey}`}
                onDataParsed={handlePetesDataParsed}
                onClearData={handleClearPetesData}
                onProcessingComplete={() => setShowUploadSection(false)}
                onUploadStart={() => setIsUploading(true)}
                onUploadDescription={setUploadDescription}
                onUploadEnd={() => setIsUploading(false)}
              />
            ) : selectedDistributor === 'KEHE' ? (
              <KeHeReportUpload
                key={`kehe-${uploadSectionKey}`}
                onDataParsed={handleKeHeDataParsed}
                onClearData={handleClearKeHeData}
                onProcessingComplete={() => setShowUploadSection(false)}
                onUploadStart={() => setIsUploading(true)}
                onUploadDescription={setUploadDescription}
                onUploadEnd={() => setIsUploading(false)}
              />
            ) : selectedDistributor === 'VISTAR' ? (
              <VistarReportUpload
                key={`vistar-${uploadSectionKey}`}
                onDataParsed={handleVistarDataParsed}
                onClearData={handleClearVistarData}
                onProcessingComplete={() => setShowUploadSection(false)}
                onUploadStart={() => setIsUploading(true)}
                onUploadDescription={setUploadDescription}
                onUploadEnd={() => setIsUploading(false)}
              />
            ) : selectedDistributor === 'TONYS' ? (
              <TonysReportUpload
                key={`tonys-${uploadSectionKey}`}
                onDataParsed={handleTonysDataParsed}
                onClearData={handleClearTonysData}
                onProcessingComplete={() => setShowUploadSection(false)}
                onUploadStart={() => setIsUploading(true)}
                onUploadDescription={setUploadDescription}
                onUploadEnd={() => setIsUploading(false)}
              />
            ) : selectedDistributor === 'TROIA' ? (
              <TroiaReportUpload
                key={`troia-${uploadSectionKey}`}
                onDataParsed={handleTroiaDataParsed}
                onClearData={handleClearTroiaData}
                onProcessingComplete={() => setShowUploadSection(false)}
                onUploadStart={() => setIsUploading(true)}
                onUploadDescription={setUploadDescription}
                onUploadEnd={() => setIsUploading(false)}
              />
            ) : selectedDistributor === 'MHD' ? (
              <MhdReportUpload
                key={`mhd-${uploadSectionKey}`}
                onDataParsed={handleMhdDataParsed}
                onClearData={handleClearMhdData}
                onProcessingComplete={() => setShowUploadSection(false)}
                onUploadStart={() => setIsUploading(true)}
                onUploadDescription={setUploadDescription}
                onUploadEnd={() => setIsUploading(false)}
              />
            ) : (
              <>
                <AlpineReportUpload
                  key={`alpine-${uploadSectionKey}`}
                  onDataParsed={handleAlpineDataParsed}
                  onClearData={handleClearAlpineData}
                  onProcessingComplete={() => setShowUploadSection(false)}
                />
                <PetesReportUpload
                  key={`petes-${uploadSectionKey}`}
                  onDataParsed={handlePetesDataParsed}
                  onClearData={handleClearPetesData}
                  onProcessingComplete={() => setShowUploadSection(false)}
                />
                <KeHeReportUpload
                  key={`kehe-${uploadSectionKey}`}
                  onDataParsed={handleKeHeDataParsed}
                  onClearData={handleClearKeHeData}
                  onProcessingComplete={() => setShowUploadSection(false)}
                />
                <VistarReportUpload
                  key={`vistar-${uploadSectionKey}`}
                  onDataParsed={handleVistarDataParsed}
                  onClearData={handleClearVistarData}
                  onProcessingComplete={() => setShowUploadSection(false)}
                />
                <TonysReportUpload
                  key={`tonys-${uploadSectionKey}`}
                  onDataParsed={handleTonysDataParsed}
                  onClearData={handleClearTonysData}
                  onProcessingComplete={() => setShowUploadSection(false)}
                />
                <TroiaReportUpload
                  key={`troia-${uploadSectionKey}`}
                  onDataParsed={handleTroiaDataParsed}
                  onClearData={handleClearTroiaData}
                  onProcessingComplete={() => setShowUploadSection(false)}
                />
                <MhdReportUpload
                  key={`mhd-${uploadSectionKey}`}
                  onDataParsed={handleMhdDataParsed}
                  onClearData={handleClearMhdData}
                  onProcessingComplete={() => setShowUploadSection(false)}
                />
              </>
            )}
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">
                ${kpis.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-600">Total Cases</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {kpis.totalCases.toFixed(0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-600">Top Customer</p>
                  <p className="text-lg font-bold text-gray-900 truncate" title={kpis.topCustomer}>
                {kpis.topCustomer}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-600">Top Product</p>
                  <p className="text-lg font-bold text-gray-900 truncate" title={kpis.topProduct}>
                {kpis.topProduct}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Revenue Over Time */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{displayMode === 'revenue' ? 'Revenue by Period' : 'Cases by Period'}</CardTitle>
                {/* Time Period Selection */}
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                  {(['5yr', '1yr', '6mo', '3mo'] as const).map((period) => (
                    <button
                      key={period}
                      onClick={() => setTimeAggregation(period)}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                        timeAggregation === period
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {period}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                <LineChart key={`chart-${selectedDistributor}-${timeAggregation}-${visibleRevenueData.length}`} data={visibleRevenueData} margin={{ top: 5, right: 60, bottom: visibleRevenueData.length > 7 ? 80 : 30, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="period" 
                      interval={visibleRevenueData.length > 30 ? Math.ceil(visibleRevenueData.length / 8) : visibleRevenueData.length > 20 ? Math.ceil(visibleRevenueData.length / 6) : visibleRevenueData.length > 12 ? Math.ceil(visibleRevenueData.length / 4) : 0}
                      tickMargin={12}
                      height={40}
                      angle={visibleRevenueData.length > 7 ? -45 : 0}
                      textAnchor={visibleRevenueData.length > 7 ? "end" : "middle"}
                      tick={{ 
                        fontSize: 10,
                        fill: '#374151'
                      }}
                    />
                    <YAxis 
                      label={{ value: displayMode === 'revenue' ? 'Revenue ($)' : 'Cases', angle: -90, position: 'insideLeft' }}
                    />
                  <ReferenceLine x={highlightedPeriod} stroke="#93C5FD" strokeDasharray="4 4" />
                  <Tooltip 
                      formatter={(value: number) => [
                        displayMode === 'revenue' 
                          ? `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : value.toLocaleString('en-US'),
                        displayMode === 'revenue' ? 'Revenue' : 'Cases'
                      ]}
                      labelFormatter={(label) => `Period: ${label}`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey={displayMode === 'revenue' ? 'revenue' : 'cases'} 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                      dot={(props: any) => {
                        const { cx, cy, payload } = props;
                        const isHighlighted = payload && payload.period === highlightedPeriod;
                        const radius = isHighlighted ? 6 : 4;
                        const fill = isHighlighted ? '#1D4ED8' : '#3B82F6';
                        const stroke = isHighlighted ? '#1D4ED8' : '#3B82F6';
                        return (
                          <circle key={`dot-${payload?.period || 'unknown'}`} cx={cx} cy={cy} r={radius} fill={fill} stroke={stroke} strokeWidth={2} />
                        );
                      }}
                      activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* New vs Lost Customers */}
          <Card>
            <CardHeader>
              <CardTitle>Account Updates</CardTitle>
            </CardHeader>
            <CardContent>
              {(!currentComparisonPeriod || !previousComparisonPeriod) ? (
                <div className="text-sm text-gray-600">Upload at least two periods to see new and lost customers.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2 flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      value={movementFilter}
                      onChange={(e) => setMovementFilter(e.target.value)}
                      placeholder="Search customers"
                      className="px-2 py-1 text-xs border rounded w-56"
                    />
                    <div className="ml-auto" />
                  </div>
                  <div>
                    <div className="flex items-baseline justify-between mb-2">
                      <h3 className="text-sm font-semibold text-gray-900">New Accounts</h3>
                    </div>
                    
                    {newCustomers.length === 0 ? (
                      <div className="text-sm text-gray-500">None</div>
                    ) : (
                      <ul className="space-y-1 text-sm max-h-72 overflow-auto">
                        {[...newCustomersDetailed]
                          .filter(r => !movementFilter || r.name.toLowerCase().includes(movementFilter.toLowerCase()))
                          .sort((a, b) => displayMode === 'revenue' ? (b.revenue - a.revenue) : (b.cases - a.cases))
                          .map(({ name, revenue, cases }) => (
                          <li
                            key={`new-${name}`}
                            className="truncate cursor-pointer hover:text-blue-700 flex items-center gap-2"
                            title={name}
                            onClick={() => { setPivotCustomerName(name); setIsPivotOpen(true); }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span>
                            <span className="flex-1 min-w-0 truncate">{name}</span>
                            <span className="text-[11px] text-gray-500">
                              {(() => {
                                console.log('DisplayMode in New Accounts:', displayMode, 'Revenue:', revenue, 'Cases:', cases);
                                return displayMode === 'revenue' 
                                  ? `$${revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                  : `${cases.toLocaleString()} case`;
                              })()}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <div className="flex items-baseline justify-between mb-2">
                      <h3 className="text-sm font-semibold text-gray-900">Lost Accounts</h3>
                    </div>
                    
                    {lostCustomers.length === 0 ? (
                      <div className="text-sm text-gray-500">None</div>
                    ) : (
                      <ul className="space-y-1 text-sm max-h-72 overflow-auto">
                        {[...lostCustomersDetailed]
                          .filter(r => !movementFilter || r.name.toLowerCase().includes(movementFilter.toLowerCase()))
                          .sort((a, b) => displayMode === 'revenue' ? (b.revenue - a.revenue) : (b.cases - a.cases))
                          .map(({ name, revenue, cases }) => (
                          <li
                            key={`lost-${name}`}
                            className="truncate cursor-pointer hover:text-blue-700 flex items-center gap-2"
                            title={name}
                            onClick={() => { setPivotCustomerName(name); setIsPivotOpen(true); }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block"></span>
                            <span className="flex-1 min-w-0 truncate">{name}</span>
                            <span className="text-[11px] text-gray-500">
                              {(() => {
                                console.log('DisplayMode in Lost Accounts:', displayMode, 'Revenue:', revenue, 'Cases:', cases);
                                return displayMode === 'revenue' 
                                  ? `$${revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                  : `${cases.toLocaleString()} case`;
                              })()}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Revenue Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Revenue by Customer */}
          <Card>
            <CardHeader>
              <CardTitle>{displayMode === 'revenue' ? 'Revenue by Customer' : 'Cases by Customer'}</CardTitle>
            </CardHeader>
            <CardContent>
              <RevenueByCustomerComponent
                revenueByCustomer={revenueByCustomer}
                alpineData={currentData}
                onCustomerClick={handleCustomerClick}
                isComparisonMode={selectedDistributor !== 'KEHE' && selectedDistributor !== 'VISTAR' && selectedDistributor !== 'TONYS' && selectedDistributor !== 'TROIA' && selectedDistributor !== 'MHD'}
                isKeHeMode={selectedDistributor === 'KEHE'}
                isVistarMode={selectedDistributor === 'VISTAR'}
                isTonysMode={selectedDistributor === 'TONYS'}
                isTroiaMode={selectedDistributor === 'TROIA'}
                isMhdMode={selectedDistributor === 'MHD'}
                customerPivotRange={customerPivotRange}
                setCustomerPivotRange={setCustomerPivotRange}
                navigateCustomerPivot={navigateCustomerPivot}
                CUSTOMER_PIVOT_WINDOW_SIZE={CUSTOMER_PIVOT_WINDOW_SIZE}
                selectedMonth={selectedMonth}
                displayMode={displayMode}
              />
            </CardContent>
          </Card>

          {/* Revenue by Product */}
          <Card>
            <CardHeader>
              <CardTitle>{displayMode === 'revenue' ? 'Revenue by Product' : 'Cases by Product'}</CardTitle>
            </CardHeader>
            <CardContent>
              <RevenueByProductComponent
                revenueByProduct={revenueByProduct}
                alpineData={filteredData}
                displayMode={displayMode}
              />
            </CardContent>
          </Card>
        </div>

        {/* Period Comparison */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📊 Period-to-Period Comparison
            </CardTitle>
            <p className="text-sm text-gray-600">Compare customer performance between any two periods</p>
          </CardHeader>
          <CardContent>
            <PeriodComparison 
              alpineData={currentData} 
              selectedMonth={selectedMonth}
              onCustomerView={(name) => {
                if (!name) return;
                setPivotCustomerName(name);
                setIsPivotOpen(true);
              }}
            />
          </CardContent>
        </Card>

        {/* Period Management removed (use dropdown trash icons instead) */}

        {/* Delete Period Confirmation Modal */}
        {pendingDeletePeriod && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[10002]">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Period</h3>
                <p className="text-sm text-gray-600 mb-4">Are you sure you want to delete all data for <span className="font-medium">{getMonthName(pendingDeletePeriod)}</span>? This action cannot be undone.</p>

                <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded">
                  {(() => {
                    const periodRecords = currentAlpineData.filter(r => r.period === pendingDeletePeriod);
                    const totalRevenue = periodRecords.reduce((s, r) => s + r.revenue, 0);
                    const totalCases = periodRecords.reduce((s, r) => s + r.cases, 0);
                    const customers = new Set(periodRecords.map(r => r.customerName)).size;
                    const products = new Set(periodRecords.filter(r => !r.isAdjustment).map(r => r.productName)).size;
                    return (
                      <div className="text-xs text-gray-700 grid grid-cols-2 gap-2">
                        <div><span className="text-gray-500">Records:</span> {periodRecords.length}</div>
                        <div><span className="text-gray-500">Revenue:</span> ${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        <div><span className="text-gray-500">Cases:</span> {totalCases.toLocaleString()}</div>
                        <div><span className="text-gray-500">Customers:</span> {customers}</div>
                        <div><span className="text-gray-500">Products:</span> {products}</div>
                      </div>
                    );
                  })()}
                </div>

                {isDeleting && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-300 rounded flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="text-sm font-semibold text-blue-700">Deleting... please wait, do not refresh</span>
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setPendingDeletePeriod(null)}
                    disabled={isDeleting}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={async () => {
                      await handleDeletePeriod(pendingDeletePeriod!);
                      setPendingDeletePeriod(null);
                      setIsMonthDropdownOpen(false);
                    }}
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}


        {/* Customer CSV Pivot Modal (hover) */}
        {pivotCustomerName && (
          <CustomerCsvPivotModal
            customerName={pivotCustomerName}
            alpineData={currentData}
            isOpen={isPivotOpen}
            onClose={() => { setIsPivotOpen(false); setPivotCustomerName(null); }}
            suppressOverlay
            ensureInView
          />
        )}

        {/* Customer Detail Modal (click-through analysis) */}
        {selectedCustomerForModal && selectedDistributor === 'KEHE' && (
          <KeHeCustomerDetailModal
            retailerName={selectedCustomerForModal}
            keheData={currentKeHeData}
            isOpen={isCustomerModalOpen}
            onClose={handleCloseCustomerModal}
            selectedMonth={selectedMonth}
          />
        )}

        {/* Vistar Customer Detail Modal */}
        {selectedCustomerForModal && selectedDistributor === 'VISTAR' && (
          <VistarCustomerDetailModal
            opcoName={selectedCustomerForModal}
            vistarData={currentVistarData}
            isOpen={isCustomerModalOpen}
            onClose={handleCloseCustomerModal}
            selectedMonth={selectedMonth}
          />
        )}

        {selectedCustomerForModal && selectedDistributor === 'TONYS' && (
          <TonysCustomerDetailModal
            customerName={selectedCustomerForModal}
            tonysData={currentTonysData}
            isOpen={isCustomerModalOpen}
            onClose={handleCloseCustomerModal}
            selectedMonth={selectedMonth}
          />
        )}

        {/* Troia Customer Detail Modal */}
        {selectedCustomerForModal && selectedDistributor === 'TROIA' && (
          <TroiaCustomerDetailModal
            customerName={selectedCustomerForModal}
            troiaData={currentTroiaData}
            isOpen={isCustomerModalOpen}
            onClose={handleCloseCustomerModal}
            selectedMonth={selectedMonth}
          />
        )}

        {/* MHD Customer Detail Modal */}
        {selectedCustomerForModal && selectedDistributor === 'MHD' && (
          <MhdCustomerDetailModal
            retailerName={selectedCustomerForModal}
            mhdData={currentMhdData}
            isOpen={isCustomerModalOpen}
            onClose={handleCloseCustomerModal}
            selectedMonth={selectedMonth}
          />
        )}

        {/* Customer Detail Modal for Alpine and Pete's */}
        {selectedCustomerForModal && selectedDistributor !== 'KEHE' && selectedDistributor !== 'VISTAR' && selectedDistributor !== 'TONYS' && selectedDistributor !== 'TROIA' && selectedDistributor !== 'MHD' && (
          <CustomerDetailModal
            customerName={selectedCustomerForModal}
            currentInvoices={[]}
            previousInvoices={[]}
            isOpen={isCustomerModalOpen}
            onClose={handleCloseCustomerModal}
            alpineData={currentData}
            progressAnalysis={(selectedDistributor === 'ALPINE' 
              ? currentCustomerProgressions 
              : selectedDistributor === 'PETES' 
                ? currentPetesCustomerProgressions 
                : combinedCustomerProgressions).get(selectedCustomerForModal)}
            selectedMonth={selectedMonth}
          />
        )}

        {/* Delta Details Modal */}
        {deltaModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[10004]">
            <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  Account Changes - All Periods
                </h2>
                <button
                  onClick={() => setDeltaModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {monthlySummary.months.map((month, monthIndex) => {
                    const monthIdx = monthlySummary.months.indexOf(month);
                    const prevMonth = monthIdx > 0 ? monthlySummary.months[monthIdx - 1] : null;
                    
                    return (
                      <div key={month} className="bg-gray-50 rounded-lg p-4">
                        <div className="mb-4">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {getShortMonthLabel(month)}
                          </h3>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">
                              Change vs {prevMonth ? getShortMonthLabel(prevMonth) : 'Previous Month'}
                            </span>
                            <span className={`font-semibold ${
                              ((monthlySummary.deltaAccountsByMonth[month] || 0) >= 0) 
                                ? 'text-green-700' 
                                : 'text-red-700'
                            }`}>
                              {monthlySummary.deltaAccountsByMonth[month] || 0}
                            </span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          {/* Gained Customers */}
                          <div>
                            <div className="font-medium text-green-700 mb-2 text-sm">Gained</div>
                            <div className="bg-green-50 border border-green-200 rounded p-3 max-h-48 overflow-y-auto">
                              {(monthlySummary.gainedVsPrevByMonth[month] || []).length === 0 ? (
                                <div className="text-gray-500 italic text-xs">None</div>
                              ) : (
                                <ul className="space-y-1">
                                  {(monthlySummary.gainedVsPrevByMonth[month] || []).map((name) => (
                                    <li
                                      key={`g-${name}-${month}`}
                                      className="text-xs p-2 bg-white rounded border border-green-200 cursor-pointer hover:bg-green-100 hover:text-blue-700 transition-colors truncate"
                                      onClick={() => {
                                        setPivotCustomerName(name);
                                        setIsPivotOpen(true);
                                      }}
                                      title={name}
                                    >
                                      {name}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>
                          
                          {/* Lost Customers */}
                          <div>
                            <div className="font-medium text-red-700 mb-2 text-sm">Lost</div>
                            <div className="bg-red-50 border border-red-200 rounded p-3 max-h-48 overflow-y-auto">
                              {(monthlySummary.lostVsPrevByMonth[month] || []).length === 0 ? (
                                <div className="text-gray-500 italic text-xs">None</div>
                              ) : (
                                <ul className="space-y-1">
                                  {(monthlySummary.lostVsPrevByMonth[month] || []).map((name) => (
                                    <li
                                      key={`l-${name}-${month}`}
                                      className="text-xs p-2 bg-white rounded border border-red-200 cursor-pointer hover:bg-red-100 hover:text-blue-700 transition-colors truncate"
                                      onClick={() => {
                                        setPivotCustomerName(name);
                                        setIsPivotOpen(true);
                                      }}
                                      title={name}
                                    >
                                      {name}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* New Accounts Modal */}
        {newAccountsModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[10004]">
            <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  New Accounts - All Periods
                </h2>
                <button
                  onClick={() => setNewAccountsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {monthlySummary.months.map((month) => {
                    const newAccountsForMonth = monthlySummary.newAccountNamesByMonth[month] || [];
                    
                    return (
                      <div key={month} className="bg-gray-50 rounded-lg p-4">
                        <div className="mb-4">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {getShortMonthLabel(month)}
                          </h3>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">
                              New accounts this month
                            </span>
                            <span className="font-semibold text-blue-700">
                              {newAccountsForMonth.length}
                            </span>
                          </div>
                        </div>
                        
                        <div className="bg-blue-50 border border-blue-200 rounded p-3 max-h-64 overflow-y-auto">
                          {newAccountsForMonth.length === 0 ? (
                            <div className="text-gray-500 italic text-sm">No new accounts this month</div>
                          ) : (
                            <ul className="space-y-2">
                              {newAccountsForMonth.map((name) => (
                                <li
                                  key={`new-${name}-${month}`}
                                  className="text-sm p-2 bg-white rounded border border-blue-200 cursor-pointer hover:bg-blue-100 hover:text-blue-700 transition-colors truncate"
                                  onClick={() => {
                                    setPivotCustomerName(name);
                                    setIsPivotOpen(true);
                                  }}
                                  title={name}
                                >
                                  {name}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;