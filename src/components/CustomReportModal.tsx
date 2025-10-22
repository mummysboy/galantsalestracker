import React from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { AlpineSalesRecord } from '../utils/alpineParser';

interface CustomReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: AlpineSalesRecord[];
  availablePeriods: string[]; // ascending sorted list like ["2025-06", "2025-07", ...]
  alpineData?: AlpineSalesRecord[];
  petesData?: AlpineSalesRecord[];
  keheData?: AlpineSalesRecord[];
  vistarData?: AlpineSalesRecord[];
  tonysData?: AlpineSalesRecord[];
  troiaData?: AlpineSalesRecord[];
  mhdData?: AlpineSalesRecord[];
}

type GroupMode = 'customer' | 'product';
type ReportMode = 'comparison' | 'broker';

interface AggregatedRow {
  key: string; // customer or product name
  aRevenue: number;
  bRevenue: number;
  aCases: number;
  bCases: number;
}

interface BrokerReportRow {
  distributor: string;
  customer: string;
  subCustomer?: string;
  productName: string;
  productDescription?: string;
  size?: string;
  revenue: number;
  cases: number;
  period: string;
  weight?: number; // Weight in pounds (pack × sizeOz × cases / 16)
}

const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
}).format(amount || 0);

const CustomReportModal: React.FC<CustomReportModalProps> = ({ 
  isOpen, 
  onClose, 
  data, 
  availablePeriods,
  alpineData = [],
  petesData = [],
  keheData = [],
  vistarData = [],
  tonysData = [],
  troiaData = [],
  mhdData = []
}) => {
  const [reportMode, setReportMode] = React.useState<ReportMode>('comparison');
  const [rangeAStart, setRangeAStart] = React.useState<string>('');
  const [rangeAEnd, setRangeAEnd] = React.useState<string>('');
  const [rangeBStart, setRangeBStart] = React.useState<string>('');
  const [rangeBEnd, setRangeBEnd] = React.useState<string>('');
  const [groupMode, setGroupMode] = React.useState<GroupMode>('customer');
  const [results, setResults] = React.useState<AggregatedRow[]>([]);
  const [error, setError] = React.useState<string>('');
  const [hoveredCustomer, setHoveredCustomer] = React.useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = React.useState<{ left: number; top: number }>({ left: 0, top: 0 });
  const hoverTimerRef = React.useRef<number | null>(null);
  
  // Broker report specific states
  const [selectedPeriods, setSelectedPeriods] = React.useState<string[]>([]);
  const [selectedCustomers, setSelectedCustomers] = React.useState<string[]>([]);
  const [selectedSubCustomers, setSelectedSubCustomers] = React.useState<string[]>([]);
  const [brokerResults, setBrokerResults] = React.useState<BrokerReportRow[]>([]);
  const [isBrokerReportActive, setIsBrokerReportActive] = React.useState<boolean>(false);
  
  // Resizable splitter state
  const [splitterPosition, setSplitterPosition] = React.useState<number>(40); // Percentage of top panel
  const [isDragging, setIsDragging] = React.useState<boolean>(false);
  const modalRef = React.useRef<HTMLDivElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const topPanelRef = React.useRef<HTMLDivElement>(null);

  // Initialize sensible defaults when opened, clear state when closed
  React.useEffect(() => {
    if (!isOpen) {
      // Clear all state when modal closes to prevent cached data from showing
      setResults([]);
      setBrokerResults([]);
      setError('');
      setIsBrokerReportActive(false);
      return;
    }
    
    if (availablePeriods.length === 0) return;

    // Defaults: A = last 2 periods; B = prior 2 periods (or repeat last if not enough)
    const periods = [...availablePeriods];
    const last = periods[periods.length - 1];
    const prev = periods[periods.length - 2] || last;
    const prev2 = periods[periods.length - 3] || prev;
    const prev3 = periods[periods.length - 4] || prev2;

    setRangeAStart(prev);
    setRangeAEnd(last);
    setRangeBStart(prev3);
    setRangeBEnd(prev2);
    setResults([]);
    setBrokerResults([]);
    setError('');
    
    // Initialize broker report with last month selected
    if (periods.length > 0) {
      setSelectedPeriods([last]);
    }
    
    // Initialize with customers from current dashboard data only
    const allCustomers = new Set<string>();
    data.forEach(record => allCustomers.add(record.customerName));
    setSelectedCustomers(Array.from(allCustomers).sort());
    
    // Initialize sub-customers
    setSelectedSubCustomers([]);
  }, [isOpen, availablePeriods, data, alpineData, petesData, keheData, vistarData, tonysData, troiaData, mhdData]);

  const isPeriodInRange = (p: string, start: string, end: string) => {
    const a = start <= end ? start : end;
    const b = start <= end ? end : start;
    return p >= a && p <= b;
  };

  const aggregate = (records: AlpineSalesRecord[], mode: GroupMode, range: { start: string; end: string }) => {
    const keyOf = (r: AlpineSalesRecord) => mode === 'customer' ? r.customerName : r.productName;
    const filtered = records.filter(r => isPeriodInRange(r.period, range.start, range.end));
    const map = new Map<string, { revenue: number; cases: number }>();
    filtered.forEach(r => {
      const key = keyOf(r);
      if (!map.has(key)) map.set(key, { revenue: 0, cases: 0 });
      const agg = map.get(key)!;
      agg.revenue += r.revenue || 0;
      agg.cases += r.cases || 0;
    });
    return map;
  };

  const cancelHoverClose = () => {
    if (hoverTimerRef.current) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  };

  const scheduleHoverClose = () => {
    cancelHoverClose();
    hoverTimerRef.current = window.setTimeout(() => setHoveredCustomer(null), 200);
  };

  const handleGenerate = () => {
    setError('');
    if (!rangeAStart || !rangeAEnd || !rangeBStart || !rangeBEnd) {
      setResults([]);
      setError('Please select all four period endpoints.');
      return;
    }
    if (availablePeriods.length === 0 || data.length === 0) {
      setResults([]);
      setError('No data available to generate report.');
      return;
    }

    const aMap = aggregate(data, groupMode, { start: rangeAStart, end: rangeAEnd });
    const bMap = aggregate(data, groupMode, { start: rangeBStart, end: rangeBEnd });

    const keys = new Set<string>([...Array.from(aMap.keys()), ...Array.from(bMap.keys())]);
    const rows: AggregatedRow[] = Array.from(keys).map(k => ({
      key: k,
      aRevenue: aMap.get(k)?.revenue || 0,
      bRevenue: bMap.get(k)?.revenue || 0,
      aCases: aMap.get(k)?.cases || 0,
      bCases: bMap.get(k)?.cases || 0,
    }));

    // Sort by largest absolute revenue delta descending
    rows.sort((x, y) => Math.abs((y.bRevenue - y.aRevenue)) - Math.abs((x.bRevenue - x.aRevenue)));
    setResults(rows);
  };

  const handleGenerateBrokerReport = () => {
    setError('');
    if (selectedPeriods.length === 0) {
      setBrokerResults([]);
      setError('Please select at least one period.');
      return;
    }
    if (selectedCustomers.length === 0) {
      setBrokerResults([]);
      setError('Please select at least one customer.');
      return;
    }

    const distributorDatasets = [
      { name: 'Alpine', data: alpineData, isSubDistributor: false },
      { name: "Pete's Coffee", data: petesData, isSubDistributor: true },
      { name: 'KeHe', data: keheData, isSubDistributor: false },
      { name: 'Vistar', data: vistarData, isSubDistributor: false },
      { name: "Tony's", data: tonysData, isSubDistributor: false },
      { name: 'Troia Foods', data: troiaData, isSubDistributor: false },
      { name: 'Mike Hudson', data: mhdData, isSubDistributor: false },
    ];

    const rows: BrokerReportRow[] = [];

    distributorDatasets.forEach(dist => {
      if (dist.data.length === 0) return;

      dist.data.forEach(record => {
        // Check if record matches selected criteria
        const matchesPeriod = selectedPeriods.includes(record.period);
        const matchesCustomer = selectedCustomers.includes(record.customerName);
        
        // Check if sub-customer is selected (if applicable)
        let matchesSubCustomer = true;
        if (record.accountName) {
          const subCustomerKey = `${record.customerName} → ${record.accountName}`;
          matchesSubCustomer = selectedSubCustomers.length === 0 || selectedSubCustomers.includes(subCustomerKey);
        }

        if (matchesPeriod && matchesCustomer && matchesSubCustomer && (record.revenue > 0 || record.cases > 0)) {
          // Calculate weight based on distributor type
          let weight: number | undefined = undefined;
          
          // For Alpine: use netLbs field directly from the NET LBS column
          if (dist.name === 'Alpine' && record.netLbs) {
            weight = record.netLbs;
          }
          // For Vistar: calculate from pack × sizeOz × cases / 16 to convert oz to lbs
          else if (record.pack && record.sizeOz && record.cases) {
            weight = (record.pack * record.sizeOz * record.cases) / 16;
          }

          rows.push({
            distributor: dist.name + (dist.isSubDistributor ? ' (Sub-Distributor)' : ''),
            customer: record.customerName,
            subCustomer: record.accountName || undefined,
            productName: record.productName,
            productDescription: record.productName, // Using productName as description for now
            size: record.size || undefined,
            revenue: record.revenue || 0,
            cases: record.cases || 0,
            period: record.period,
            weight: weight
          });
        }
      });
    });

    // Sort by distributor, then customer, then revenue descending
    rows.sort((a, b) => {
      if (a.distributor !== b.distributor) return a.distributor.localeCompare(b.distributor);
      if (a.customer !== b.customer) return a.customer.localeCompare(b.customer);
      if (a.subCustomer !== b.subCustomer) return (a.subCustomer || '').localeCompare(b.subCustomer || '');
      return b.revenue - a.revenue;
    });

    setBrokerResults(rows);
    setIsBrokerReportActive(true);
    
    // Scroll top panel to bottom to show the results
    setTimeout(() => {
      if (topPanelRef.current) {
        topPanelRef.current.scrollTop = topPanelRef.current.scrollHeight;
      }
    }, 100);
  };

  const handleDownloadCSV = () => {
    if (brokerResults.length === 0) {
      setError('No broker report data to download.');
      return;
    }

    // Create CSV content
    const headers = ['Distributor', 'Customer', 'Sub-Customer', 'Product', 'Revenue', 'Cases', 'Weight (lbs)', 'Period'];
    const rows = brokerResults.map(row => [
      row.distributor,
      row.customer,
      row.subCustomer || '',
      row.productName,
      row.revenue.toFixed(2),
      row.cases.toString(),
      row.weight ? row.weight.toFixed(2) : '',
      row.period
    ]);

    // Calculate totals (excluding sub-distributors)
    const totals = brokerResults.reduce((acc, r) => {
      if (r.distributor.includes('Sub-Distributor')) return acc;
      acc.revenue += r.revenue;
      acc.cases += r.cases;
      acc.weight += r.weight || 0;
      return acc;
    }, { revenue: 0, cases: 0, weight: 0 });

    // Format numbers with proper formatting
    const formatCurrency = (amount: number) => `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const formatWeight = (weight: number) => `${weight.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} lbs`;
    const formatCases = (cases: number) => cases.toLocaleString('en-US');

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
      '', // Empty row for separation
      `"TOTALS (excl. sub-distributors)","","","","${formatCurrency(totals.revenue)}","${formatCases(totals.cases)}","${formatWeight(totals.weight)}",""`
    ].join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `broker_report_detailed_${selectedPeriods.join('_')}_${selectedCustomers.length}_customers.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const togglePeriodSelection = (period: string) => {
    setSelectedPeriods(prev => {
      if (prev.includes(period)) {
        return prev.filter(p => p !== period);
      } else {
        return [...prev, period].sort();
      }
    });
  };

  const toggleCustomerSelection = (customer: string) => {
    setSelectedCustomers(prev => {
      if (prev.includes(customer)) {
        return prev.filter(c => c !== customer);
      } else {
        return [...prev, customer].sort();
      }
    });
  };


  const toggleSubCustomerSelection = (subCustomer: string) => {
    setSelectedSubCustomers(prev => {
      if (prev.includes(subCustomer)) {
        return prev.filter(s => s !== subCustomer);
      } else {
        return [...prev, subCustomer].sort();
      }
    });
  };

  // Get available sub-customers for selected customers
  const getAvailableSubCustomers = () => {
    const subCustomers = new Set<string>();
    
    selectedCustomers.forEach(customerName => {
      // Check KeHe data for accountName (sub-customers under retailers)
      keheData.forEach(record => {
        if (record.customerName === customerName && record.accountName) {
          subCustomers.add(`${customerName} → ${record.accountName}`);
        }
      });
      
      // Check Tony's data for accountName (store names)
      tonysData.forEach(record => {
        if (record.customerName === customerName && record.accountName) {
          subCustomers.add(`${customerName} → ${record.accountName}`);
        }
      });
      
      // Check MHD data for accountName (sub-customers/locations)
      mhdData.forEach(record => {
        if (record.customerName === customerName && record.accountName) {
          subCustomers.add(`${customerName} → ${record.accountName}`);
        }
      });
      
      // Check Vistar data for accountName (customer descriptions)
      vistarData.forEach(record => {
        if (record.customerName === customerName && record.accountName) {
          subCustomers.add(`${customerName} → ${record.accountName}`);
        }
      });
    });
    
    return Array.from(subCustomers).sort();
  };

  const toggleAllSubCustomers = () => {
    const availableSubCustomers = getAvailableSubCustomers();
    
    if (selectedSubCustomers.length === availableSubCustomers.length) {
      setSelectedSubCustomers([]);
    } else {
      setSelectedSubCustomers(availableSubCustomers);
    }
  };

  const toggleAllCustomers = () => {
    // Use only customers from current dashboard data
    const allCustomers = new Set<string>();
    data.forEach(record => allCustomers.add(record.customerName));
    const allCustomersArray = Array.from(allCustomers).sort();
    
    if (selectedCustomers.length === allCustomersArray.length) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(allCustomersArray);
    }
  };

  // Resizable splitter handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleMouseMove = React.useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const containerElement = containerRef.current;
    if (!containerElement) return;
    
    const rect = containerElement.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const percentage = Math.max(20, Math.min(80, (y / rect.height) * 100));
    setSplitterPosition(percentage);
  }, [isDragging, splitterPosition]);

  const handleMouseUp = React.useCallback(() => {
    setIsDragging(false);
  }, []);

  // Prevent scroll event propagation to prevent background page scrolling
  const handleTopPanelScroll = React.useCallback((e: React.UIEvent) => {
    e.stopPropagation();
  }, []);

  const handleBottomPanelScroll = React.useCallback((e: React.UIEvent) => {
    e.stopPropagation();
  }, []);

  const handleContainerScroll = React.useCallback((e: React.UIEvent) => {
    e.stopPropagation();
  }, []);

  // Prevent scroll events from bubbling up to the background page
  const handleModalScroll = React.useCallback((e: React.UIEvent) => {
    e.stopPropagation();
  }, []);

  // Prevent wheel events from scrolling the background page
  const handleWheel = React.useCallback((e: WheelEvent) => {
    // Check if the wheel event is happening within the modal
    const modalElement = modalRef.current;
    if (modalElement && modalElement.contains(e.target as Node)) {
      // Allow scrolling within the modal
      return;
    }
    // Prevent scrolling outside the modal
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // Handle wheel events on modal containers
  const handleModalWheel = React.useCallback((e: React.WheelEvent) => {
    e.stopPropagation();
  }, []);

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Prevent background page scrolling when modal is open
  React.useEffect(() => {
    if (isOpen) {
      // Lock body scroll
      document.body.style.overflow = 'hidden';
    } else {
      // Restore body scroll
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);


  // Get product breakdown for a specific customer across both periods
  const getProductBreakdown = (customerName: string) => {
    if (groupMode !== 'customer') return null;
    
    const aProducts = new Map<string, { revenue: number; cases: number }>();
    const bProducts = new Map<string, { revenue: number; cases: number }>();
    
    // Aggregate products for period A
    data.filter(r => r.customerName === customerName && isPeriodInRange(r.period, rangeAStart, rangeAEnd))
        .forEach(r => {
          if (!aProducts.has(r.productName)) aProducts.set(r.productName, { revenue: 0, cases: 0 });
          const p = aProducts.get(r.productName)!;
          p.revenue += r.revenue || 0;
          p.cases += r.cases || 0;
        });
    
    // Aggregate products for period B
    data.filter(r => r.customerName === customerName && isPeriodInRange(r.period, rangeBStart, rangeBEnd))
        .forEach(r => {
          if (!bProducts.has(r.productName)) bProducts.set(r.productName, { revenue: 0, cases: 0 });
          const p = bProducts.get(r.productName)!;
          p.revenue += r.revenue || 0;
          p.cases += r.cases || 0;
        });
    
    const allProducts = new Set([...Array.from(aProducts.keys()), ...Array.from(bProducts.keys())]);
    return Array.from(allProducts).map(productName => ({
      productName,
      aRevenue: aProducts.get(productName)?.revenue || 0,
      bRevenue: bProducts.get(productName)?.revenue || 0,
      aCases: aProducts.get(productName)?.cases || 0,
      bCases: bProducts.get(productName)?.cases || 0,
    })).sort((a, b) => Math.abs((b.bRevenue - b.aRevenue)) - Math.abs((a.bRevenue - a.aRevenue)));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[10006]" onClick={onClose}>
      <div 
        ref={modalRef}
        className={`bg-white rounded-lg shadow-2xl w-full overflow-hidden flex flex-col custom-report-modal ${
          isBrokerReportActive 
            ? 'max-w-[95vw] max-h-[95vh]' 
            : 'max-w-6xl max-h-[90vh]'
        }`} 
        onClick={(e) => e.stopPropagation()}
        onScroll={handleModalScroll}
        onWheel={handleModalWheel}
      >
        <div className="flex items-center justify-between p-4 border-b bg-gray-50 relative z-10">
          <div>
            <h2 className="text-lg font-semibold">Custom Report Builder</h2>
            <p className="text-xs text-gray-600">
              {reportMode === 'comparison' 
                ? 'Compare two date ranges by customer or product' 
                : 'Generate distributor and sub-distributor performance report'}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>✕</Button>
        </div>

        {reportMode === 'broker' && isBrokerReportActive ? (
          // Resizable layout for broker report
          <div 
            ref={containerRef}
            className="flex-1 overflow-hidden relative"
            style={{ 
              height: 'calc(100vh - 200px)',
              display: 'grid',
              gridTemplateRows: `${splitterPosition}% 12px ${100 - splitterPosition}%`,
              zIndex: 1
            }}
            onScroll={handleContainerScroll}
            onWheel={handleModalWheel}
          >
            {/* Top panel - Configuration */}
            <div 
              ref={topPanelRef}
              className="overflow-y-auto border-b relative"
              style={{ 
                minHeight: '200px',
                maxHeight: '80vh',
                zIndex: 5
              }}
              onScroll={handleTopPanelScroll}
              onWheel={handleModalWheel}
            >
              <div className="p-4">
                {/* Report Mode Toggle */}
                <div className="mb-4 flex items-center gap-3 pb-3 border-b">
                  <span className="text-sm font-medium">Report Type:</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setReportMode('comparison');
                        setIsBrokerReportActive(false);
                      }}
                      className="px-3 py-1.5 text-sm rounded transition-colors bg-gray-200 text-gray-700 hover:bg-gray-300"
                    >
                      Comparison Report
                    </button>
                    <button
                      onClick={() => {
                        setReportMode('broker');
                        setIsBrokerReportActive(false);
                      }}
                      className="px-3 py-1.5 text-sm rounded transition-colors bg-blue-600 text-white"
                    >
                      Broker Report
                    </button>
                  </div>
                </div>

                {/* Broker Report Configuration */}
                <div className="space-y-4">
                  {/* Period Selection */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Select Periods</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {availablePeriods.map(period => (
                          <button
                            key={period}
                            onClick={() => togglePeriodSelection(period)}
                            className={`px-3 py-1.5 text-sm rounded border transition-colors ${
                              selectedPeriods.includes(period)
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {period}
                          </button>
                        ))}
                      </div>
                      {selectedPeriods.length > 0 && (
                        <div className="mt-3 text-sm text-gray-600">
                          Selected: {selectedPeriods.join(', ')}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Customer Selection */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Select Customers</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-3">
                        <button
                          onClick={toggleAllCustomers}
                          className="px-3 py-1.5 text-sm rounded border bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"
                        >
                          {selectedCustomers.length === 0 ? 'Select All' : 'Deselect All'}
                        </button>
                        <span className="ml-2 text-sm text-gray-600">
                          {selectedCustomers.length} customer{selectedCustomers.length !== 1 ? 's' : ''} selected
                        </span>
                      </div>
                      <div className="max-h-48 overflow-y-auto border rounded p-2 bg-gray-50">
                        <div className="grid grid-cols-1 gap-1">
                          {(() => {
                            // Use only customers from current dashboard data
                            const allCustomers = new Set<string>();
                            data.forEach(record => allCustomers.add(record.customerName));
                            return Array.from(allCustomers).sort().map(customer => (
                              <label key={customer} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 p-1 rounded">
                                <input
                                  type="checkbox"
                                  checked={selectedCustomers.includes(customer)}
                                  onChange={() => toggleCustomerSelection(customer)}
                                  className="rounded"
                                />
                                <span className="text-sm text-gray-700 truncate" title={customer}>
                                  {customer}
                                </span>
                              </label>
                            ));
                          })()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Sub-Customer Selection */}
                  {getAvailableSubCustomers().length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Select Sub-Customers</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="mb-3">
                          <button
                            onClick={toggleAllSubCustomers}
                            className="px-3 py-1.5 text-sm rounded border bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"
                          >
                            {selectedSubCustomers.length === 0 ? 'Select All' : 'Deselect All'}
                          </button>
                          <span className="ml-2 text-sm text-gray-600">
                            {getAvailableSubCustomers().length} sub-customer{getAvailableSubCustomers().length !== 1 ? 's' : ''} available | {selectedSubCustomers.length} selected
                          </span>
                        </div>
                        <div className="max-h-48 overflow-y-auto border rounded p-2 bg-gray-50">
                          <div className="grid grid-cols-1 gap-1">
                            {getAvailableSubCustomers().map(subCustomer => (
                              <label key={subCustomer} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 p-1 rounded">
                                <input
                                  type="checkbox"
                                  checked={selectedSubCustomers.includes(subCustomer)}
                                  onChange={() => toggleSubCustomerSelection(subCustomer)}
                                  className="rounded"
                                />
                                <span className="text-sm text-gray-700 truncate" title={subCustomer}>
                                  {subCustomer}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 mt-2">
                          Sub-customers are locations, stores, or accounts under the selected customers
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <div className="flex gap-2">
                    <Button onClick={handleGenerateBrokerReport}>Generate Broker Report</Button>
                  </div>
                </div>

                {error && (
                  <div className="mt-3 text-sm text-red-600">{error}</div>
                )}
              </div>
            </div>

            {/* Resizable Splitter */}
            <div 
              className="h-3 bg-gray-200 hover:bg-gray-300 cursor-ns-resize flex items-center justify-center border-y border-gray-300 relative"
              onMouseDown={handleMouseDown}
              style={{ 
                backgroundColor: isDragging ? '#d1d5db' : '#e5e7eb',
                zIndex: 15
              }}
            >
              <div className="w-12 h-1 bg-gray-500 rounded"></div>
            </div>

            {/* Bottom panel - Results */}
            <div 
              className="overflow-y-auto relative"
              style={{ 
                minHeight: '200px',
                maxHeight: '80vh',
                zIndex: 10
              }}
              onScroll={handleBottomPanelScroll}
              onWheel={handleModalWheel}
            >
              <div className="px-4 pb-4">
                {brokerResults.length === 0 ? (
                  <div className="text-sm text-gray-500">No results yet. Select periods, customers, and click Generate Broker Report.</div>
                ) : (
                  <>
                    {/* Bottom panel header with Download CSV button */}
                    <div className="flex justify-end items-center p-3 bg-white border-b border-gray-200 sticky top-0 z-20">
                      <Button onClick={handleDownloadCSV} variant="outline" size="sm">
                        Download CSV
                      </Button>
                    </div>
                    <table className={`w-full ${isBrokerReportActive ? 'text-base' : 'text-sm'}`}>
                      <thead className="bg-gray-50 sticky top-12 z-10">
                        <tr>
                          <th className={`${isBrokerReportActive ? 'p-3' : 'p-2'} text-left`}>Distributor</th>
                          <th className={`${isBrokerReportActive ? 'p-3' : 'p-2'} text-left`}>Customer</th>
                          <th className={`${isBrokerReportActive ? 'p-3' : 'p-2'} text-left`}>Sub-Customer</th>
                          <th className={`${isBrokerReportActive ? 'p-3' : 'p-2'} text-left`}>Product</th>
                          <th className={`${isBrokerReportActive ? 'p-3' : 'p-2'} text-right`}>Revenue</th>
                          <th className={`${isBrokerReportActive ? 'p-3' : 'p-2'} text-right`}>Cases</th>
                          <th className={`${isBrokerReportActive ? 'p-3' : 'p-2'} text-right`}>Weight (lbs)</th>
                          <th className={`${isBrokerReportActive ? 'p-3' : 'p-2'} text-left`}>Period</th>
                        </tr>
                      </thead>
                      <tbody>
                        {brokerResults.map((row, index) => (
                          <tr key={index} className="border-t hover:bg-gray-50">
                            <td className={`${isBrokerReportActive ? 'p-3' : 'p-2'}`}>{row.distributor}</td>
                            <td className={`${isBrokerReportActive ? 'p-3' : 'p-2'}`}>{row.customer}</td>
                            <td className={`${isBrokerReportActive ? 'p-3' : 'p-2'}`}>{row.subCustomer || '-'}</td>
                            <td className={`${isBrokerReportActive ? 'p-3' : 'p-2'}`}>{row.productName}</td>
                            <td className={`${isBrokerReportActive ? 'p-3' : 'p-2'} text-right tabular-nums`}>{formatCurrency(row.revenue)}</td>
                            <td className={`${isBrokerReportActive ? 'p-3' : 'p-2'} text-right tabular-nums`}>{row.cases.toLocaleString()}</td>
                            <td className={`${isBrokerReportActive ? 'p-3' : 'p-2'} text-right tabular-nums`}>{row.weight ? row.weight.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '-'}</td>
                            <td className={`${isBrokerReportActive ? 'p-3' : 'p-2'}`}>{row.period}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        {(() => {
                          const total = brokerResults.reduce((acc, r) => {
                            // Exclude sub-distributors from totals to avoid double-counting
                            if (r.distributor.includes('Sub-Distributor')) return acc;
                            acc.revenue += r.revenue;
                            acc.cases += r.cases;
                            acc.weight += r.weight || 0;
                            return acc;
                          }, { revenue: 0, cases: 0, weight: 0 });
                          return (
                            <tr className="border-t bg-gray-50 font-semibold">
                              <td className={`${isBrokerReportActive ? 'p-3' : 'p-2'}`} colSpan={4}>Total (excl. sub-distributors)</td>
                              <td className={`${isBrokerReportActive ? 'p-3' : 'p-2'} text-right tabular-nums`}>{formatCurrency(total.revenue)}</td>
                              <td className={`${isBrokerReportActive ? 'p-3' : 'p-2'} text-right tabular-nums`}>{total.cases.toLocaleString()}</td>
                              <td className={`${isBrokerReportActive ? 'p-3' : 'p-2'} text-right tabular-nums`}>{total.weight.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                              <td className={`${isBrokerReportActive ? 'p-3' : 'p-2'}`}>-</td>
                            </tr>
                          );
                        })()}
                      </tfoot>
                    </table>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          // Original layout for comparison report and broker report configuration
          <>
            <div className="p-4 border-b overflow-y-auto flex-1">
              {/* Report Mode Toggle */}
              <div className="mb-4 flex items-center gap-3 pb-3 border-b">
                <span className="text-sm font-medium">Report Type:</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setReportMode('comparison');
                      setIsBrokerReportActive(false);
                    }}
                    className={`px-3 py-1.5 text-sm rounded transition-colors ${
                      reportMode === 'comparison'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Comparison Report
                  </button>
                  <button
                    onClick={() => {
                      setReportMode('broker');
                      setIsBrokerReportActive(false);
                    }}
                    className={`px-3 py-1.5 text-sm rounded transition-colors ${
                      reportMode === 'broker'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Broker Report
                  </button>
                </div>
              </div>

              {reportMode === 'comparison' ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Range A</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className="text-sm">From</span>
                  <select value={rangeAStart} onChange={(e) => setRangeAStart(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm">
                    {availablePeriods.map(p => (
                      <option key={`a-start-${p}`} value={p}>{p}</option>
                    ))}
                  </select>
                  <span className="text-sm">to</span>
                  <select value={rangeAEnd} onChange={(e) => setRangeAEnd(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm">
                    {availablePeriods.map(p => (
                      <option key={`a-end-${p}`} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Range B</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className="text-sm">From</span>
                  <select value={rangeBStart} onChange={(e) => setRangeBStart(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm">
                    {availablePeriods.map(p => (
                      <option key={`b-start-${p}`} value={p}>{p}</option>
                    ))}
                  </select>
                  <span className="text-sm">to</span>
                  <select value={rangeBEnd} onChange={(e) => setRangeBEnd(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm">
                    {availablePeriods.map(p => (
                      <option key={`b-end-${p}`} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm">Group by:</span>
              <select value={groupMode} onChange={(e) => setGroupMode(e.target.value as GroupMode)} className="border border-gray-300 rounded px-2 py-1 text-sm">
                <option value="customer">Customers</option>
                <option value="product">Products</option>
              </select>
            </div>
            <Button onClick={handleGenerate} className="sm:ml-auto">Generate</Button>
          </div>
            </>
          ) : (
            <>
              {/* Broker Report Mode - Configuration Only */}
              <div className="space-y-4">
                {/* Period Selection */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Select Periods</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {availablePeriods.map(period => (
                        <button
                          key={period}
                          onClick={() => togglePeriodSelection(period)}
                          className={`px-3 py-1.5 text-sm rounded border transition-colors ${
                            selectedPeriods.includes(period)
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {period}
                        </button>
                      ))}
                    </div>
                    {selectedPeriods.length > 0 && (
                      <div className="mt-3 text-sm text-gray-600">
                        Selected: {selectedPeriods.join(', ')}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Customer Selection */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Select Customers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-3">
                      <button
                        onClick={toggleAllCustomers}
                        className="px-3 py-1.5 text-sm rounded border bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"
                      >
                        {selectedCustomers.length === 0 ? 'Select All' : 'Deselect All'}
                      </button>
                      <span className="ml-2 text-sm text-gray-600">
                        {selectedCustomers.length} customer{selectedCustomers.length !== 1 ? 's' : ''} selected
                      </span>
                    </div>
                    <div className="max-h-48 overflow-y-auto border rounded p-2 bg-gray-50">
                      <div className="grid grid-cols-1 gap-1">
                        {(() => {
                          // Use only customers from current dashboard data
                          const allCustomers = new Set<string>();
                          data.forEach(record => allCustomers.add(record.customerName));
                          return Array.from(allCustomers).sort().map(customer => (
                            <label key={customer} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 p-1 rounded">
                              <input
                                type="checkbox"
                                checked={selectedCustomers.includes(customer)}
                                onChange={() => toggleCustomerSelection(customer)}
                                className="rounded"
                              />
                              <span className="text-sm text-gray-700 truncate" title={customer}>
                                {customer}
                              </span>
                            </label>
                          ));
                        })()}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Sub-Customer Selection */}
                {getAvailableSubCustomers().length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Select Sub-Customers</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-3">
                        <button
                          onClick={toggleAllSubCustomers}
                          className="px-3 py-1.5 text-sm rounded border bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"
                        >
                          {selectedSubCustomers.length === 0 ? 'Select All' : 'Deselect All'}
                        </button>
                        <span className="ml-2 text-sm text-gray-600">
                          {getAvailableSubCustomers().length} sub-customer{getAvailableSubCustomers().length !== 1 ? 's' : ''} available | {selectedSubCustomers.length} selected
                        </span>
                      </div>
                      <div className="max-h-48 overflow-y-auto border rounded p-2 bg-gray-50">
                        <div className="grid grid-cols-1 gap-1">
                          {getAvailableSubCustomers().map(subCustomer => (
                            <label key={subCustomer} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 p-1 rounded">
                              <input
                                type="checkbox"
                                checked={selectedSubCustomers.includes(subCustomer)}
                                onChange={() => toggleSubCustomerSelection(subCustomer)}
                                className="rounded"
                              />
                              <span className="text-sm text-gray-700 truncate" title={subCustomer}>
                                {subCustomer}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        Sub-customers are locations, stores, or accounts under the selected customers
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="flex gap-2">
                  <Button onClick={handleGenerateBrokerReport}>Generate Broker Report</Button>
                  {brokerResults.length > 0 && (
                    <Button onClick={handleDownloadCSV} variant="outline">Download CSV</Button>
                  )}
                </div>
              </div>
            </>
          )}

              {error && (
                <div className="mt-3 text-sm text-red-600">{error}</div>
              )}
            </div>

            <div className="p-4 overflow-y-auto flex-1">
          {reportMode === 'comparison' ? (
            results.length === 0 ? (
              <div className="text-sm text-gray-500">No results yet. Select ranges and click Generate.</div>
            ) : (
              <>
                <div className="mb-3 text-sm text-gray-600">
                  Showing {results.length} {groupMode === 'customer' ? 'customers' : 'products'} | A: {rangeAStart} to {rangeAEnd} vs B: {rangeBStart} to {rangeBEnd}
                </div>
                <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="p-2 text-left w-64">{groupMode === 'customer' ? 'Customer' : 'Product'}</th>
                    <th className="p-2 text-right">A Revenue</th>
                    <th className="p-2 text-right">B Revenue</th>
                    <th className="p-2 text-right">Δ Revenue</th>
                    <th className="p-2 text-right">Δ %</th>
                    <th className="p-2 text-right">A Cases</th>
                    <th className="p-2 text-right">B Cases</th>
                    <th className="p-2 text-right">Δ Cases</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((row) => {
                    const deltaRevenue = row.bRevenue - row.aRevenue;
                    const pct = row.aRevenue > 0 ? (deltaRevenue / row.aRevenue) * 100 : (row.bRevenue > 0 ? 100 : 0);
                    const deltaCases = row.bCases - row.aCases;
                    const productBreakdown = groupMode === 'customer' ? getProductBreakdown(row.key) : null;
                    const showTooltip = groupMode === 'customer' && productBreakdown && productBreakdown.length > 0;
                    
                    return (
                      <tr 
                        key={row.key} 
                        className={`border-t ${showTooltip ? 'cursor-pointer' : ''}`}
                        onMouseEnter={(e) => {
                          if (showTooltip) {
                            cancelHoverClose();
                            setHoveredCustomer(row.key);
                            const rect = e.currentTarget.getBoundingClientRect();
                            // Position tooltip above the row, accounting for its height
                            const tooltipHeight = 500; // Estimated tooltip height
                            const topPosition = Math.max(20, rect.top - tooltipHeight);
                            setTooltipPosition({
                              left: Math.max(20, Math.min(rect.left, window.innerWidth - 820)), // 800px width + 20px margin
                              top: topPosition
                            });
                          }
                        }}
                        onMouseLeave={() => showTooltip ? scheduleHoverClose() : undefined}
                      >
                        <td className="p-2 relative" data-customer={row.key}>
                          <div className="truncate" title={row.key}>{row.key}</div>
                          {hoveredCustomer === row.key && showTooltip && (
                            <div 
                              className="fixed w-[800px] bg-white border border-gray-300 rounded-lg shadow-2xl z-[10010] p-4"
                              style={{
                                left: tooltipPosition.left,
                                top: tooltipPosition.top,
                                maxHeight: '90vh'
                              }}
                              onMouseEnter={() => cancelHoverClose()}
                              onMouseLeave={() => scheduleHoverClose()}
                            >
                              <div className="text-sm font-semibold text-gray-800 mb-3 border-b pb-2">
                                Product Breakdown: {row.key}
                              </div>
                              <div className="text-xs text-gray-600 mb-3">
                                A: {rangeAStart} to {rangeAEnd} vs B: {rangeBStart} to {rangeBEnd}
                              </div>
                              <div className="max-h-[70vh] overflow-auto">
                                <table className="w-full text-xs border-collapse">
                                  <thead className="bg-gray-100 sticky top-0">
                                    <tr>
                                      <th className="p-2 text-left border-b">Product</th>
                                      <th className="p-2 text-right border-b">A Revenue</th>
                                      <th className="p-2 text-right border-b">B Revenue</th>
                                      <th className="p-2 text-right border-b">Revenue Δ</th>
                                      <th className="p-2 text-right border-b">A Cases</th>
                                      <th className="p-2 text-right border-b">B Cases</th>
                                      <th className="p-2 text-right border-b">Cases Δ</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {productBreakdown!.map((product) => {
                                      const prodDeltaRevenue = product.bRevenue - product.aRevenue;
                                      const prodDeltaCases = product.bCases - product.aCases;
                                      return (
                                        <tr key={product.productName} className="hover:bg-gray-50">
                                          <td className="p-2 border-b truncate max-w-[200px]" title={product.productName}>
                                            {product.productName}
                                          </td>
                                          <td className="p-2 text-right tabular-nums border-b font-medium">
                                            {formatCurrency(product.aRevenue)}
                                          </td>
                                          <td className="p-2 text-right tabular-nums border-b font-medium">
                                            {formatCurrency(product.bRevenue)}
                                          </td>
                                          <td className={`p-2 text-right tabular-nums border-b font-semibold ${prodDeltaRevenue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {prodDeltaRevenue >= 0 ? '+' : ''}{formatCurrency(prodDeltaRevenue)}
                                          </td>
                                          <td className="p-2 text-right tabular-nums border-b">
                                            {product.aCases.toLocaleString()}
                                          </td>
                                          <td className="p-2 text-right tabular-nums border-b">
                                            {product.bCases.toLocaleString()}
                                          </td>
                                          <td className={`p-2 text-right tabular-nums border-b font-semibold ${prodDeltaCases >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {prodDeltaCases >= 0 ? '+' : ''}{prodDeltaCases.toLocaleString()}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                              <div className="mt-3 pt-2 border-t text-xs text-gray-500">
                                Showing {productBreakdown!.length} products • Hover over product names for details
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="p-2 text-right tabular-nums">{formatCurrency(row.aRevenue)}</td>
                        <td className="p-2 text-right tabular-nums">{formatCurrency(row.bRevenue)}</td>
                        <td className={`p-2 text-right tabular-nums ${deltaRevenue >= 0 ? 'text-green-600' : 'text-red-600'}`}>{deltaRevenue >= 0 ? '+' : ''}{formatCurrency(deltaRevenue)}</td>
                        <td className={`p-2 text-right tabular-nums ${pct >= 0 ? 'text-green-600' : 'text-red-600'}`}>{pct >= 0 ? '+' : ''}{pct.toFixed(1)}%</td>
                        <td className="p-2 text-right tabular-nums">{row.aCases.toLocaleString()}</td>
                        <td className="p-2 text-right tabular-nums">{row.bCases.toLocaleString()}</td>
                        <td className={`p-2 text-right tabular-nums ${deltaCases >= 0 ? 'text-green-600' : 'text-red-600'}`}>{deltaCases >= 0 ? '+' : ''}{deltaCases.toLocaleString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  {(() => {
                    const tot = results.reduce((acc, r) => {
                      acc.aRev += r.aRevenue; acc.bRev += r.bRevenue; acc.aCases += r.aCases; acc.bCases += r.bCases; return acc;
                    }, { aRev: 0, bRev: 0, aCases: 0, bCases: 0 });
                    const dRev = tot.bRev - tot.aRev;
                    const dPct = tot.aRev > 0 ? (dRev / tot.aRev) * 100 : (tot.bRev > 0 ? 100 : 0);
                    const dCases = tot.bCases - tot.aCases;
                    return (
                      <tr className="border-t bg-gray-50 font-semibold">
                        <td className="p-2">Total</td>
                        <td className="p-2 text-right tabular-nums">{formatCurrency(tot.aRev)}</td>
                        <td className="p-2 text-right tabular-nums">{formatCurrency(tot.bRev)}</td>
                        <td className={`p-2 text-right tabular-nums ${dRev >= 0 ? 'text-green-600' : 'text-red-600'}`}>{dRev >= 0 ? '+' : ''}{formatCurrency(dRev)}</td>
                        <td className={`p-2 text-right tabular-nums ${dPct >= 0 ? 'text-green-600' : 'text-red-600'}`}>{dPct >= 0 ? '+' : ''}{dPct.toFixed(1)}%</td>
                        <td className="p-2 text-right tabular-nums">{tot.aCases.toLocaleString()}</td>
                        <td className="p-2 text-right tabular-nums">{tot.bCases.toLocaleString()}</td>
                        <td className={`p-2 text-right tabular-nums ${dCases >= 0 ? 'text-green-600' : 'text-red-600'}`}>{dCases >= 0 ? '+' : ''}{dCases.toLocaleString()}</td>
                      </tr>
                    );
                  })()}
                </tfoot>
              </table>
            </>
          )
        ) : (
          // Broker report results in original layout (when not active)
          brokerResults.length === 0 ? (
            <div className="text-sm text-gray-500">No results yet. Select periods, customers, and click Generate Broker Report.</div>
          ) : (
            <>
              <div className="mb-3 text-sm text-gray-600">
                Showing {brokerResults.length} product line{brokerResults.length !== 1 ? 's' : ''} | Periods: {selectedPeriods.join(', ')} | {selectedCustomers.length} customer{selectedCustomers.length !== 1 ? 's' : ''} selected{selectedSubCustomers.length > 0 ? ` | ${selectedSubCustomers.length} sub-customer${selectedSubCustomers.length !== 1 ? 's' : ''} selected` : ''}
              </div>
              <table className={`w-full ${isBrokerReportActive ? 'text-base' : 'text-sm'}`}>
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className={`${isBrokerReportActive ? 'p-3' : 'p-2'} text-left`}>Distributor</th>
                    <th className={`${isBrokerReportActive ? 'p-3' : 'p-2'} text-left`}>Customer</th>
                    <th className={`${isBrokerReportActive ? 'p-3' : 'p-2'} text-left`}>Sub-Customer</th>
                    <th className={`${isBrokerReportActive ? 'p-3' : 'p-2'} text-left`}>Product</th>
                    <th className={`${isBrokerReportActive ? 'p-3' : 'p-2'} text-right`}>Revenue</th>
                    <th className={`${isBrokerReportActive ? 'p-3' : 'p-2'} text-right`}>Cases</th>
                    <th className={`${isBrokerReportActive ? 'p-3' : 'p-2'} text-right`}>Weight (lbs)</th>
                    <th className={`${isBrokerReportActive ? 'p-3' : 'p-2'} text-left`}>Period</th>
                  </tr>
                </thead>
                <tbody>
                  {brokerResults.map((row, index) => (
                    <tr key={index} className="border-t hover:bg-gray-50">
                      <td className={`${isBrokerReportActive ? 'p-3' : 'p-2'}`}>{row.distributor}</td>
                      <td className={`${isBrokerReportActive ? 'p-3' : 'p-2'}`}>{row.customer}</td>
                      <td className={`${isBrokerReportActive ? 'p-3' : 'p-2'}`}>{row.subCustomer || '-'}</td>
                      <td className={`${isBrokerReportActive ? 'p-3' : 'p-2'}`}>{row.productName}</td>
                      <td className={`${isBrokerReportActive ? 'p-3' : 'p-2'} text-right tabular-nums`}>{formatCurrency(row.revenue)}</td>
                      <td className={`${isBrokerReportActive ? 'p-3' : 'p-2'} text-right tabular-nums`}>{row.cases.toLocaleString()}</td>
                      <td className={`${isBrokerReportActive ? 'p-3' : 'p-2'} text-right tabular-nums`}>{row.weight ? row.weight.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '-'}</td>
                      <td className={`${isBrokerReportActive ? 'p-3' : 'p-2'}`}>{row.period}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  {(() => {
                    const total = brokerResults.reduce((acc, r) => {
                      // Exclude sub-distributors from totals to avoid double-counting
                      if (r.distributor.includes('Sub-Distributor')) return acc;
                      acc.revenue += r.revenue;
                      acc.cases += r.cases;
                      acc.weight += r.weight || 0;
                      return acc;
                    }, { revenue: 0, cases: 0, weight: 0 });
                    return (
                      <tr className="border-t bg-gray-50 font-semibold">
                        <td className={`${isBrokerReportActive ? 'p-3' : 'p-2'}`} colSpan={4}>Total (excl. sub-distributors)</td>
                        <td className={`${isBrokerReportActive ? 'p-3' : 'p-2'} text-right tabular-nums`}>{formatCurrency(total.revenue)}</td>
                        <td className={`${isBrokerReportActive ? 'p-3' : 'p-2'} text-right tabular-nums`}>{total.cases.toLocaleString()}</td>
                        <td className={`${isBrokerReportActive ? 'p-3' : 'p-2'} text-right tabular-nums`}>{total.weight.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                        <td className={`${isBrokerReportActive ? 'p-3' : 'p-2'}`}>-</td>
                      </tr>
                    );
                  })()}
                </tfoot>
              </table>
            </>
          )
        )}
            </div>
          </>
        )}

        <div className="p-3 border-t bg-gray-50 text-[11px] text-gray-600 flex-shrink-0">
          Data source: current dashboard selection. Period ranges are inclusive.
        </div>
      </div>
    </div>
  );
};

export default CustomReportModal;


