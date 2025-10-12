import React, { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import CustomerDetailModal from './components/CustomerDetailModal';
import KeHeCustomerDetailModal from './components/KeHeCustomerDetailModal';
import CustomerCsvPivotModal from './components/CustomerCsvPivotModal';
import PeriodComparison from './components/PeriodComparison';
import AlpineReportUpload from './components/AlpineReportUpload';
import InvoiceList from './components/InvoiceList';
import CustomReportModal from './components/CustomReportModal';
import { AlpineSalesRecord, analyzeCustomerProgress } from './utils/alpineParser';
// Removed hardcoded June seed; start empty and let uploads populate
import { Upload, BarChart3, ChevronDown, Trash2, X } from 'lucide-react';
import { toTitleCase } from './lib/utils';
import PetesReportUpload from './components/PetesReportUpload';
import KeHeReportUpload from './components/KeHeReportUpload';

// Revenue by Customer Component
interface RevenueByCustomerProps {
  revenueByCustomer: Array<{ id: string; customer: string; fullCustomerName: string; customerId: string; revenue: number }>;
  alpineData: AlpineSalesRecord[];
  onCustomerClick?: (customerName: string) => void;
  isComparisonMode?: boolean;
  isKeHeMode?: boolean;
}

const RevenueByCustomerComponent: React.FC<RevenueByCustomerProps> = ({ 
  revenueByCustomer, 
  alpineData,
  onCustomerClick,
  isComparisonMode = false,
  isKeHeMode = false
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
  
  const formatRevenue = (revenue: number) => {
    return `$${revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getPercentage = (revenue: number) => {
    return ((revenue / totalRevenue) * 100).toFixed(1);
  };


  const handleCustomerClick = (fullCustomerName: string) => {
    // For KeHe mode, always use the custom modal (bypass comparison mode)
    if (isKeHeMode) {
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
      .filter(r => r.customerName === customerName)
      .sort((a, b) => {
        if (a.period !== b.period) return a.period.localeCompare(b.period);
        if ((a.productName || '') !== (b.productName || '')) return (a.productName || '').localeCompare(b.productName || '');
        return (a.productCode || '').localeCompare(b.productCode || '');
      });
  };

  const getCustomerPivot = (customerName: string) => {
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

    const labels = Array.from(new Set(rows.map(r => pivotMode === 'month' ? r.period : periodToQuarter(r.period))));
    labels.sort(pivotMode === 'month' ? undefined : compareQuarter);

    const byProduct = new Map<string, { productName: string; productCode: string; values: Record<string, number> }>();
    rows.forEach(r => {
      const key = `${r.productCode || ''}|${r.productName}`;
      if (!byProduct.has(key)) {
        const init: Record<string, number> = {};
        labels.forEach(l => { init[l] = 0; });
        byProduct.set(key, { productName: r.productName, productCode: r.productCode || '', values: init });
      }
      const obj = byProduct.get(key)!;
      const label = pivotMode === 'month' ? r.period : periodToQuarter(r.period);
      obj.values[label] = (obj.values[label] || 0) + (r.cases || 0);
    });
    return { columns: labels, products: Array.from(byProduct.values()) };
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
              (isComparisonMode || isKeHeMode) ? 'cursor-pointer' : ''
            }`}
            onClick={() => handleCustomerClick(customer.fullCustomerName)}
            title={isKeHeMode ? "Click to view customer summary" : isComparisonMode ? "Click to view CSV breakdown" : "Customer revenue"}
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 break-words">
                  {toTitleCase(customer.customer)}
                </div>
              {customer.customerId && (
                <div className="text-xs text-blue-600 font-medium">ID: {customer.customerId}</div>
              )}
              <div className="text-xs text-gray-500">{getPercentage(customer.revenue)}% of total</div>
              </div>
            <div className="text-sm font-semibold text-gray-900">
              {formatRevenue(customer.revenue)}
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
                        placeholder="Filter by product, code or period"
                        className="px-2 py-1 text-xs border rounded"
                      />
                      <button className="h-7 px-2" onClick={(e) => { e.stopPropagation(); setOpenCsvForCustomer(null); }}>
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="max-h-[70vh] overflow-auto">
                    {(() => {
                      const pivot = getCustomerPivot(customer.fullCustomerName);
                      const monthsFiltered = pivot.columns.filter(m => !csvSearch || m.toLowerCase().includes(csvSearch.toLowerCase()));
                      const productsFiltered = pivot.products.filter(p => {
                        if (!csvSearch) return true;
                        const q = csvSearch.toLowerCase();
                        return (
                          (p.productName || '').toLowerCase().includes(q) ||
                          (p.productCode || '').toLowerCase().includes(q)
                        );
                      });
                      return (
                        <table className="w-full text-xs">
                          <thead className="bg-gray-50 sticky top-0">
                            <tr>
                              <th className="p-2 text-left">Product</th>
                              <th className="p-2 text-left">Code</th>
                              {monthsFiltered.map(m => (
                                <th key={m} className="p-2 text-right whitespace-nowrap">{m}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {productsFiltered.map((p, idx) => (
                              <tr key={`${p.productCode}-${idx}`} className="border-t">
                                <td className="p-2">{toTitleCase(p.productName)}</td>
                                <td className="p-2 whitespace-nowrap">{p.productCode}</td>
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
                                  <td className="p-2" colSpan={2}>Total</td>
                                  {monthTotals.map((t, i) => (
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
                    (isComparisonMode || isKeHeMode) ? 'cursor-pointer' : ''
                  }`}
                  onClick={() => handleCustomerClick(customer.fullCustomerName)}
                  title={isKeHeMode ? "Click to view customer summary" : isComparisonMode ? "Click to view CSV breakdown" : "Customer revenue"}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 break-words">
                    {toTitleCase(customer.customer)}
                  </div>
                  {customer.customerId && (
                    <div className="text-xs text-blue-600 font-medium">ID: {customer.customerId}</div>
                  )}
                  <div className="text-xs text-gray-500">{getPercentage(customer.revenue)}% of total</div>
                </div>
                  <div className="text-sm font-semibold text-gray-900">
                    {formatRevenue(customer.revenue)}
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
                              placeholder="Filter by product, code or period"
                              className="px-2 py-1 text-xs border rounded"
                            />
                            <button className="h-7 px-2" onClick={(e) => { e.stopPropagation(); setOpenCsvForCustomer(null); }}>
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div className="max-h-[70vh] overflow-auto">
                          {(() => {
                            const pivot = getCustomerPivot(customer.fullCustomerName);
                            const monthsFiltered = pivot.columns.filter((m: string) => !csvSearch || m.toLowerCase().includes(csvSearch.toLowerCase()));
                            const productsFiltered = pivot.products.filter(p => {
                              if (!csvSearch) return true;
                              const q = csvSearch.toLowerCase();
                              return (
                                (p.productName || '').toLowerCase().includes(q) ||
                                (p.productCode || '').toLowerCase().includes(q)
                              );
                            });
                            return (
                              <table className="w-full text-xs">
                                <thead className="bg-gray-50 sticky top-0">
                                  <tr>
                                    <th className="p-2 text-left">Product</th>
                                    <th className="p-2 text-left">Code</th>
                                    {monthsFiltered.map(m => (
                                      <th key={m} className="p-2 text-right whitespace-nowrap">{m}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {productsFiltered.map((p, idx) => (
                                    <tr key={`${p.productCode}-${idx}`} className="border-t">
                                      <td className="p-2">{toTitleCase(p.productName)}</td>
                                      <td className="p-2 whitespace-nowrap">{p.productCode}</td>
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
                                        <td className="p-2" colSpan={2}>Total</td>
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
  revenueByProduct: Array<{ id: string; product: string; fullProduct: string; revenue: number }>;
  alpineData: AlpineSalesRecord[];
}

const RevenueByProductComponent: React.FC<RevenueByProductProps> = ({ revenueByProduct, alpineData }) => {
  const [showAll, setShowAll] = useState(false);
  
  const topProducts = revenueByProduct.slice(0, 5);
  const remainingProducts = revenueByProduct.slice(5);
  const totalRevenue = revenueByProduct.reduce((sum, product) => sum + product.revenue, 0);
  
  const formatRevenue = (revenue: number) => {
    return `$${revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getPercentage = (revenue: number) => {
    return ((revenue / totalRevenue) * 100).toFixed(1);
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
              <div className="text-xs text-gray-500">{getPercentage(product.revenue)}% of total</div>
              </div>
            <div className="text-sm font-semibold text-gray-900">
              {formatRevenue(product.revenue)}
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
                  <div className="text-xs text-gray-500">{getPercentage(product.revenue)}% of total</div>
                </div>
                  <div className="text-sm font-semibold text-gray-900">
                    {formatRevenue(product.revenue)}
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
  const [currentAlpineData, setCurrentAlpineData] = useState<AlpineSalesRecord[]>([]);
  const [currentPetesData, setCurrentPetesData] = useState<AlpineSalesRecord[]>([]);
  const [currentKeHeData, setCurrentKeHeData] = useState<AlpineSalesRecord[]>([]);
  const [currentCustomerProgressions, setCurrentCustomerProgressions] = useState<Map<string, any>>(new Map());
  const [currentPetesCustomerProgressions, setCurrentPetesCustomerProgressions] = useState<Map<string, any>>(new Map());
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [currentKeHeCustomerProgressions, setCurrentKeHeCustomerProgressions] = useState<Map<string, any>>(new Map());
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);
  // Removed CSV invoice upload; no longer tracking last uploaded invoice month
  // const [lastUploadedInvoiceMonth, setLastUploadedInvoiceMonth] = useState<string | null>(null);
  const [pivotCustomerName, setPivotCustomerName] = useState<string | null>(null);
  const [isPivotOpen, setIsPivotOpen] = useState(false);
  // Removed Period Management toggle button; keep feature accessible via dropdown trash icons
  const [pendingDeletePeriod, setPendingDeletePeriod] = useState<string | null>(null);
  const [showMonthlySummary, setShowMonthlySummary] = useState(false);
  const [openNewAccountsTooltipMonth, setOpenNewAccountsTooltipMonth] = useState<string | null>(null);
  const [openDeltaTooltipMonth, setOpenDeltaTooltipMonth] = useState<string | null>(null);
  const [selectedDistributor, setSelectedDistributor] = useState<'ALPINE' | 'PETES' | 'KEHE' | 'ALL'>('ALPINE');
  const [isDistributorDropdownOpen, setIsDistributorDropdownOpen] = useState(false);
  const [showCustomReport, setShowCustomReport] = useState(false);
  const tooltipTimerRef = React.useRef<number | null>(null);
  const cancelTooltipClose = () => {
    if (tooltipTimerRef.current) {
      window.clearTimeout(tooltipTimerRef.current);
      tooltipTimerRef.current = null;
    }
  };
  const scheduleTooltipClose = (which: 'new' | 'delta') => {
    cancelTooltipClose();
    tooltipTimerRef.current = window.setTimeout(() => {
      if (which === 'new') setOpenNewAccountsTooltipMonth(null);
      else setOpenDeltaTooltipMonth(null);
    }, 200);
  };

  // Determine current dataset based on distributor
  const currentData = useMemo(() => {
    if (selectedDistributor === 'ALPINE') return currentAlpineData;
    if (selectedDistributor === 'PETES') return currentPetesData;
    if (selectedDistributor === 'KEHE') return currentKeHeData;
    // For 'ALL': combine all data but exclude sub-distributors from totals
    return [...currentAlpineData, ...currentPetesData, ...currentKeHeData];
  }, [selectedDistributor, currentAlpineData, currentPetesData, currentKeHeData]);

  // Data for calculations - excludes sub-distributors when viewing "All Businesses"
  const dataForTotals = useMemo(() => {
    if (selectedDistributor === 'ALL') {
      // Exclude Pete's data to avoid double-counting (it's a sub-distributor)
      return currentData.filter(r => !r.excludeFromTotals);
    }
    return currentData;
  }, [currentData, selectedDistributor]);

  // Get available periods and set default to most recent
  const availablePeriods = useMemo(() => {
    const periods = Array.from(new Set(dataForTotals.map(r => r.period))).sort();
    return periods;
  }, [dataForTotals]);

  // Add "All" option to periods, with most recent first
  const allPeriodOptions = useMemo(() => {
    // IMPORTANT: reverse() mutates; use a copy to keep availablePeriods sorted ascending for charts
    return ['all', ...[...availablePeriods].reverse()];
  }, [availablePeriods]);

  // Filter data based on selected month
  const filteredData = useMemo(() => {
    if (!selectedMonth || selectedMonth === 'all') return dataForTotals;
    return dataForTotals.filter(record => record.period === selectedMonth);
  }, [dataForTotals, selectedMonth]);

  // Set default month to most recent when data changes
  React.useEffect(() => {
    if (availablePeriods.length > 0 && !selectedMonth) {
      setSelectedMonth(availablePeriods[availablePeriods.length - 1]);
    }
  }, [availablePeriods, selectedMonth]);

  // Adjust selected month when switching distributors
  React.useEffect(() => {
    if (selectedMonth === 'all') return; // preserve All Periods selection
    if (availablePeriods.length > 0 && !availablePeriods.includes(selectedMonth)) {
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
    const [yearStr, monthStr] = period.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const yy = yearStr.slice(-2);
    const mmIdx = Math.max(0, Math.min(11, parseInt(monthStr || '1') - 1));
    return `${monthNames[mmIdx]}-${yy}`;
  };

  // Upload handlers
  const handleAlpineDataParsed = (data: { records: AlpineSalesRecord[]; customerProgressions: Map<string, any> }) => {
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
    // If new periods were uploaded, select the most recent one to reflect upload
    const newestUploadedPeriod = Array.from(newPeriods).sort().slice(-1)[0];
    if (newestUploadedPeriod) {
      setSelectedMonth(newestUploadedPeriod);
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

    const newestUploadedPeriod = Array.from(newPeriods).sort().slice(-1)[0];
    if (newestUploadedPeriod) {
      setSelectedMonth(newestUploadedPeriod);
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

  const handleKeHeDataParsed = (data: { records: AlpineSalesRecord[]; customerProgressions: Map<string, any> }) => {
    const newPeriods = new Set(data.records.map(r => r.period));

    const filteredExistingData = currentKeHeData.filter(record => !newPeriods.has(record.period));
    const mergedData = [...filteredExistingData, ...data.records];

    setCurrentKeHeData(mergedData);

    const allCustomers = Array.from(new Set(mergedData.map(r => r.customerName)));
    const updatedCustomerProgressions = new Map();
    allCustomers.forEach(customer => {
      const progress = analyzeCustomerProgress(mergedData, customer);
      updatedCustomerProgressions.set(customer, progress);
    });
    setCurrentKeHeCustomerProgressions(updatedCustomerProgressions);

    const newestUploadedPeriod = Array.from(newPeriods).sort().slice(-1)[0];
    if (newestUploadedPeriod) {
      setSelectedMonth(newestUploadedPeriod);
    }
  };

  const handleClearKeHeData = () => {
    console.log('Clearing KeHe data');
    setCurrentKeHeData([]);
    setCurrentKeHeCustomerProgressions(new Map());
  };

  // Removed CSV invoice upload handlers


  // Delete entire period/month of data
  const handleDeletePeriod = (periodToDelete: string) => {
    // Guard: do not allow deletes in ALL view
    if (selectedDistributor === 'ALL') return;
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
    }

    if (selectedMonth === periodToDelete) {
      const remainingPeriods = Array.from(new Set(dataForTotals.filter(r => r.period !== periodToDelete).map(r => r.period))).sort();
      setSelectedMonth(remainingPeriods.length > 0 ? remainingPeriods[remainingPeriods.length - 1] : 'all');
    }

    console.log('Period deleted:', periodToDelete);
  };

  // Calculate KPIs based on filtered data
  const kpis = useMemo(() => {
    const totalRevenue = filteredData.reduce((sum, record) => sum + record.revenue, 0);
    const totalCases = filteredData.reduce((sum, record) => sum + record.cases, 0);
    
    // Top customer by revenue
    const customerRevenue = filteredData.reduce((acc, record) => {
      acc[record.customerName] = (acc[record.customerName] || 0) + record.revenue;
      return acc;
    }, {} as Record<string, number>);
    const topCustomer = Object.entries(customerRevenue).sort(([,a], [,b]) => b - a)[0];

    // Top product by revenue
    const productRevenue = filteredData.reduce((acc, record) => {
      acc[record.productName] = (acc[record.productName] || 0) + record.revenue;
      return acc;
    }, {} as Record<string, number>);
    const topProduct = Object.entries(productRevenue).sort(([,a], [,b]) => b - a)[0];

    return {
      totalRevenue,
      totalCases,
      topCustomer: topCustomer ? topCustomer[0] : 'N/A',
      topProduct: topProduct ? topProduct[0] : 'N/A',
    };
  }, [filteredData]);

  // Revenue over time data (grouped by periods) - ALWAYS use all uploaded months
  const revenueOverTime = useMemo(() => {
    const periodRevenue = dataForTotals.reduce((acc, record) => {
      const period = record.period;
      acc[period] = (acc[period] || 0) + record.revenue;
      return acc;
    }, {} as Record<string, number>);

    // Ensure we return an entry for every available period in order
    const periods = [...availablePeriods];
    return periods.map((period) => ({
      period,
      revenue: Math.round((periodRevenue[period] || 0) * 100) / 100,
    }));
  }, [dataForTotals, availablePeriods]);

  // Determine which period to highlight on the chart
  const highlightedPeriod = useMemo(() => {
    if (selectedMonth && selectedMonth !== 'all') return selectedMonth;
    // Default to most recent available period when "All Periods" is selected
    return availablePeriods.length ? availablePeriods[availablePeriods.length - 1] : '';
  }, [selectedMonth, availablePeriods]);

  // Revenue by customer data
  const revenueByCustomer = useMemo(() => {
    const customerRevenue = filteredData.reduce((acc, record) => {
      acc[record.customerName] = (acc[record.customerName] || 0) + record.revenue;
      return acc;
    }, {} as Record<string, number>);

    const customerIds = filteredData.reduce((acc, record) => {
      acc[record.customerName] = record.customerId || '';
      return acc;
    }, {} as Record<string, string>);

    return Object.entries(customerRevenue)
      .sort(([,a], [,b]) => b - a)
      .map(([customer, revenue], index) => ({
        id: `${customer}-${index}`,
        customer: customer,
        fullCustomerName: customer,
        customerId: customerIds[customer] || '',
        revenue: Math.round(revenue * 100) / 100,
      }));
  }, [filteredData]);

  // Revenue by product data
  const revenueByProduct = useMemo(() => {
    const productRevenue = filteredData.reduce((acc, record) => {
      acc[record.productName] = (acc[record.productName] || 0) + record.revenue;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(productRevenue)
      .sort(([,a], [,b]) => b - a)
      .map(([product, revenue], index) => ({
        id: `${product}-${index}`,
        product: product,
        fullProduct: product,
        revenue: Math.round(revenue * 100) / 100,
      }));
  }, [filteredData]);

  // Product mix pie chart data
  const productMix = useMemo(() => {
    const total = filteredData.reduce((sum, record) => sum + record.revenue, 0);

    return revenueByProduct
      .slice(0, 8) // Top 8 products
      .map((product) => ({
        name: product.product.length > 12 ? product.product.substring(0, 12) + '...' : product.product,
        fullName: toTitleCase(product.fullProduct),
        value: Math.round((product.revenue / total) * 100 * 100) / 100,
      }));
  }, [revenueByProduct, filteredData]);

  const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#F97316', '#06B6D4', '#84CC16'];

  // Combined progressions for ALL view
  const combinedCustomerProgressions = useMemo(() => {
    // Exclude Pete's data to avoid double-counting (it's a sub-distributor)
    const data = [...currentAlpineData, ...currentPetesData, ...currentKeHeData].filter(r => !r.excludeFromTotals);
    const customers = Array.from(new Set(data.map(r => r.customerName)));
    const map = new Map<string, any>();
    customers.forEach(c => {
      map.set(c, analyzeCustomerProgress(data, c));
    });
    return map;
  }, [currentAlpineData, currentPetesData, currentKeHeData]);

  const getDistributorLabel = (d: 'ALPINE' | 'PETES' | 'KEHE' | 'ALL' = selectedDistributor) => (
    d === 'ALPINE' ? 'Alpine' : d === 'PETES' ? "Pete's Coffee" : d === 'KEHE' ? 'KeHe' : 'All Businesses'
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-900">{getDistributorLabel()} Sales Dashboard</h1>
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
                        {(['ALPINE','PETES','KEHE','ALL'] as const).map((d) => (
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
                    {selectedMonth === 'all' ? 'All Periods' : selectedMonth ? getMonthName(selectedMonth) : 'Select Month'}
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
                                setSelectedMonth(period);
                                setIsMonthDropdownOpen(false);
                              }}
                              className={`flex-1 text-left px-2 py-2 text-sm rounded hover:bg-gray-50 ${
                                selectedMonth === period ? 'text-blue-700 font-medium' : 'text-gray-700'
                              }`}
                            >
                              {period === 'all' ? 'All Periods' : getMonthName(period)}
                            </button>
                            {period !== 'all' && selectedDistributor !== 'ALL' && (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setPendingDeletePeriod(period);
                                }}
                                title={`Delete ${getMonthName(period)}`}
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
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {filteredData.length} sales records{selectedMonth !== 'all' ? ` for ${selectedMonth === 'all' ? 'all periods' : getMonthName(selectedMonth)}` : ` from ${availablePeriods.join(', ')} periods`}
              </p>
              {selectedDistributor === 'ALL' && currentPetesData.length > 0 && (
                <div className="mt-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                  <span className="font-semibold">Note:</span> Totals exclude Pete's Coffee data to prevent double-counting (sub-distributor)
                </div>
              )}
              {/* Last uploaded invoice month removed with CSV uploader */}
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
                onClick={() => setShowUploadSection(!showUploadSection)}
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
              <Button variant="ghost" size="sm" onClick={() => setShowMonthlySummary(false)} className="h-7 px-2">✕</Button>
            </div>
            <div className="max-h-[70vh] overflow-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="p-2 text-left w-56">Metric</th>
                    {monthlySummary.months.map((m) => (
                      <th key={m} className="p-2 text-right whitespace-nowrap">{getShortMonthLabel(m)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-2 font-medium">New Accounts</td>
                    {monthlySummary.months.map((m) => (
                      <td key={m} className="p-2 text-right">
                        <div 
                          className="relative inline-block group"
                          onMouseEnter={() => { cancelTooltipClose(); setOpenNewAccountsTooltipMonth(m); }}
                          onMouseLeave={() => scheduleTooltipClose('new')}
                        >
                          <span className="tabular-nums inline-block px-1 rounded hover:bg-blue-50 hover:text-blue-700 transition-colors">{monthlySummary.newAccountsByMonth[m] || 0}</span>
                          {(monthlySummary.newAccountsByMonth[m] || 0) > 0 && openNewAccountsTooltipMonth === m && (
                            <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-[10003] p-2"
                              onMouseEnter={(e) => { e.stopPropagation(); cancelTooltipClose(); }}
                              onMouseLeave={() => scheduleTooltipClose('new')}
                            >
                              <div className="text-[11px] font-medium text-gray-700 mb-1">New accounts in {getShortMonthLabel(m)}</div>
                              <ul className="max-h-48 overflow-auto text-[11px] leading-5 text-gray-800">
                                {(monthlySummary.newAccountNamesByMonth[m] || []).map((name) => (
                                  <li
                                    key={name}
                                    className="truncate py-0.5 cursor-pointer hover:text-blue-700"
                                    onClick={() => {
                                      setPivotCustomerName(name);
                                      setIsPivotOpen(true);
                                    }}
                                  >
                                    {name}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-2 font-medium">Total Accounts Ordered</td>
                    {monthlySummary.months.map((m) => (
                      <td key={m} className="p-2 text-right tabular-nums">{monthlySummary.accountsOrderedByMonth[m] || 0}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-2 font-medium">Δ</td>
                    {monthlySummary.months.map((m, idx) => (
                      <td key={m} className="p-2 text-right">
                        <div 
                          className="relative inline-block group"
                          onMouseEnter={() => { cancelTooltipClose(); setOpenDeltaTooltipMonth(m); }}
                          onMouseLeave={() => scheduleTooltipClose('delta')}
                        >
                          <span className={`tabular-nums inline-block px-1 rounded ${((monthlySummary.deltaAccountsByMonth[m] || 0) >= 0) ? 'hover:bg-green-50 hover:text-green-700' : 'hover:bg-red-50 hover:text-red-700'} transition-colors`}>
                            {monthlySummary.deltaAccountsByMonth[m] || 0}
                          </span>
                          {(idx > 0) && openDeltaTooltipMonth === m && (
                            <div className="absolute right-0 top-full mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-xl z-[10003] p-2"
                              onMouseEnter={(e) => { e.stopPropagation(); cancelTooltipClose(); }}
                              onMouseLeave={() => scheduleTooltipClose('delta')}
                            >
                              <div className="text-[11px] font-medium text-gray-700 mb-1 flex items-center justify-between">
                                <span>Change vs {getShortMonthLabel(monthlySummary.months[idx - 1])}</span>
                                <span className={`${((monthlySummary.deltaAccountsByMonth[m] || 0) >= 0) ? 'text-green-700' : 'text-red-700'} font-semibold`}>
                                  {monthlySummary.deltaAccountsByMonth[m] || 0}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-[11px]">
                                <div>
                                  <div className="font-medium text-green-700 mb-1">Gained</div>
                                  <ul className="max-h-40 overflow-auto">
                                    {(monthlySummary.gainedVsPrevByMonth[m] || []).length === 0 && <li className="text-gray-500 italic">None</li>}
                                    {(monthlySummary.gainedVsPrevByMonth[m] || []).map((name) => (
                                      <li
                                        key={`g-${name}`}
                                        className="truncate cursor-pointer hover:text-blue-700"
                                        onClick={() => {
                                          setPivotCustomerName(name);
                                          setIsPivotOpen(true);
                                        }}
                                      >
                                        {name}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                                <div>
                                  <div className="font-medium text-red-700 mb-1">Lost</div>
                                  <ul className="max-h-40 overflow-auto">
                                    {(monthlySummary.lostVsPrevByMonth[m] || []).length === 0 && <li className="text-gray-500 italic">None</li>}
                                    {(monthlySummary.lostVsPrevByMonth[m] || []).map((name) => (
                                      <li
                                        key={`l-${name}`}
                                        className="truncate cursor-pointer hover:text-blue-700"
                                        onClick={() => {
                                          setPivotCustomerName(name);
                                          setIsPivotOpen(true);
                                        }}
                                      >
                                        {name}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-2 font-medium">Total Cases Sold</td>
                    {monthlySummary.months.map((m) => (
                      <td key={m} className="p-2 text-right tabular-nums">{monthlySummary.totalCasesByMonth[m] || 0}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-2 font-medium">Average Cases / Account</td>
                    {monthlySummary.months.map((m) => (
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
        />
      )}

        {/* Upload Section */}
        {showUploadSection && (
          <div className="mb-8 space-y-6">
            {selectedDistributor === 'ALPINE' ? (
              <AlpineReportUpload
                onDataParsed={handleAlpineDataParsed}
                onClearData={handleClearAlpineData}
                onProcessingComplete={() => setShowUploadSection(false)}
              />
            ) : selectedDistributor === 'PETES' ? (
              <PetesReportUpload
                onDataParsed={handlePetesDataParsed}
                onClearData={handleClearPetesData}
                onProcessingComplete={() => setShowUploadSection(false)}
              />
            ) : selectedDistributor === 'KEHE' ? (
              <KeHeReportUpload
                onDataParsed={handleKeHeDataParsed}
                onClearData={handleClearKeHeData}
                onProcessingComplete={() => setShowUploadSection(false)}
              />
            ) : (
              <>
                <AlpineReportUpload
                  onDataParsed={handleAlpineDataParsed}
                  onClearData={handleClearAlpineData}
                  onProcessingComplete={() => setShowUploadSection(false)}
                />
                <PetesReportUpload
                  onDataParsed={handlePetesDataParsed}
                  onClearData={handleClearPetesData}
                  onProcessingComplete={() => setShowUploadSection(false)}
                />
                <KeHeReportUpload
                  onDataParsed={handleKeHeDataParsed}
                  onClearData={handleClearKeHeData}
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
                <div className="text-gray-400">
                  💰
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
                <div className="text-gray-400">
                  📦
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
                <div className="text-gray-400">
                  🏆
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
                <div className="text-gray-400">
                  🎯
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
              <CardTitle>Revenue by Period</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueOverTime} margin={{ top: 5, right: 20, bottom: 20, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="period" 
                      interval={0} 
                      tickMargin={8}
                      tick={(props: any) => {
                        const { x, y, payload } = props;
                        const isHighlighted = payload && payload.value === highlightedPeriod;
                        return (
                          <text x={x} y={y} dy={16} textAnchor="middle" fill={isHighlighted ? '#1D4ED8' : '#374151'} style={{ fontWeight: isHighlighted ? 700 as any : 500 as any, fontSize: 12 }}>
                            {payload.value}
                          </text>
                        );
                      }}
                    />
                    <YAxis />
                  <ReferenceLine x={highlightedPeriod} stroke="#93C5FD" strokeDasharray="4 4" />
                  <Tooltip 
                      formatter={(value: number) => [`$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Revenue']}
                      labelFormatter={(label) => `Period: ${label}`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                      dot={(props: any) => {
                        const { cx, cy, payload } = props;
                        const isHighlighted = payload && payload.period === highlightedPeriod;
                        const radius = isHighlighted ? 6 : 4;
                        const fill = isHighlighted ? '#1D4ED8' : '#3B82F6';
                        const stroke = isHighlighted ? '#1D4ED8' : '#3B82F6';
                        return (
                          <circle cx={cx} cy={cy} r={radius} fill={fill} stroke={stroke} strokeWidth={2} />
                        );
                      }}
                      activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Product Mix */}
          <Card>
            <CardHeader>
              <CardTitle>Product Mix</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={productMix}
                    cx="50%"
                    cy="50%"
                      outerRadius={80}
                    dataKey="value"
                      label={({ name, value }) => `${name}: ${value}%`}
                  >
                    {productMix.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Pie>
                    <Tooltip 
                      content={(props: any) => {
                        const { active, payload } = props || {};
                        if (!active || !payload || payload.length === 0) return null;
                        const p = payload[0].payload;
                        return (
                          <div className="bg-white border border-gray-200 rounded-md shadow-md p-2 text-xs">
                            <div className="font-medium text-gray-900 mb-1">{p.fullName}</div>
                            <div className="text-gray-600">{p.value}% of total</div>
                          </div>
                        );
                      }}
                    />
                </PieChart>
              </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Revenue Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Revenue by Customer */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue by Customer</CardTitle>
            </CardHeader>
            <CardContent>
              <RevenueByCustomerComponent
                revenueByCustomer={revenueByCustomer}
                alpineData={currentData}
                onCustomerClick={handleCustomerClick}
                isComparisonMode={selectedDistributor !== 'KEHE'}
                isKeHeMode={selectedDistributor === 'KEHE'}
              />
            </CardContent>
          </Card>

          {/* Revenue by Product */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue by Product</CardTitle>
            </CardHeader>
            <CardContent>
              <RevenueByProductComponent
                revenueByProduct={revenueByProduct}
                alpineData={filteredData}
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
                    const products = new Set(periodRecords.map(r => r.productName)).size;
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

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setPendingDeletePeriod(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      handleDeletePeriod(pendingDeletePeriod);
                      setPendingDeletePeriod(null);
                      setIsMonthDropdownOpen(false);
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Invoice List */}
        <Card className="mb-8">
          <InvoiceList 
            records={filteredData}
            title={`Sales Records${selectedMonth !== 'all' ? ` for ${getMonthName(selectedMonth)}` : ''}`}
          />
        </Card>

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
          />
        )}

        {/* Customer Detail Modal for Alpine and Pete's */}
        {selectedCustomerForModal && selectedDistributor !== 'KEHE' && (
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
          />
        )}
      </div>
    </div>
  );
};

export default Dashboard;