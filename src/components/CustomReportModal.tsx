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
  const [error, setError] = React.useState<string>('');
  
  // Broker report specific states
  const [selectedPeriods, setSelectedPeriods] = React.useState<string[]>([]);
  const [selectedCustomers, setSelectedCustomers] = React.useState<string[]>([]);
  const [selectedSubCustomers, setSelectedSubCustomers] = React.useState<string[]>([]);
  const [brokerResults, setBrokerResults] = React.useState<BrokerReportRow[]>([]);

  // Initialize broker report defaults when opened, clear state when closed
  React.useEffect(() => {
    if (!isOpen) {
      // Clear all state when modal closes to prevent cached data from showing
      setBrokerResults([]);
      setError('');
      return;
    }
    
    if (availablePeriods.length === 0) return;

    const periods = [...availablePeriods];
    const last = periods[periods.length - 1];
    
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
          // Calculate weight for Vistar: (pack × sizeOz × cases) / 16 to convert oz to lbs
          let weight: number | undefined = undefined;
          if (record.pack && record.sizeOz && record.cases) {
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

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
      '', // Empty row for separation
      `TOTALS (excl. sub-distributors),,,,${totals.revenue.toFixed(2)},${totals.cases},${totals.weight.toFixed(2)},`
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


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[10006]" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl w-full overflow-hidden flex flex-col max-w-[95vw] max-h-[95vh]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <div>
            <h2 className="text-lg font-semibold">Broker Report Builder</h2>
            <p className="text-xs text-gray-600">
              Generate distributor and sub-distributor performance report
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>✕</Button>
          </div>
        </div>

        <div className="p-4 border-b overflow-y-auto flex-1">
          {/* Broker Report Only */}
          <div className="mb-4 pb-3 border-b">
            <h3 className="text-lg font-semibold text-gray-800">Broker Performance Report</h3>
            <p className="text-sm text-gray-600">Generate detailed distributor and sub-distributor performance reports</p>
          </div>

          {/* Broker Report Mode */}
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

                {/* Sub-Distributor Selection - Disabled for now as sub-distributors are already marked in data */}
                {/* <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Select Sub-Distributors</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedSubDistributors.includes("Pete's Coffee")}
                          onChange={() => toggleSubDistributorSelection("Pete's Coffee")}
                          className="rounded"
                        />
                        <span className="text-sm text-gray-700">Pete's Coffee (Sub-Distributor)</span>
                      </label>
                      <div className="text-xs text-gray-500">
                        Sub-distributors are marked separately to avoid double-counting in totals
                      </div>
                    </div>
                  </CardContent>
                </Card> */}

                <div className="flex gap-2">
                  <Button onClick={handleGenerateBrokerReport}>Generate Broker Report</Button>
                  {brokerResults.length > 0 && (
                    <Button onClick={handleDownloadCSV} variant="outline">Download CSV</Button>
                  )}
                </div>
              </div>

          {error && (
            <div className="mt-3 text-sm text-red-600">{error}</div>
          )}
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          {brokerResults.length === 0 ? (
            <div className="text-sm text-gray-500">No results yet. Select periods, customers, and click Generate Broker Report.</div>
          ) : (
            <>
              <div className="mb-3 text-sm text-gray-600">
                Showing {brokerResults.length} product line{brokerResults.length !== 1 ? 's' : ''} | Periods: {selectedPeriods.join(', ')} | {selectedCustomers.length} customer{selectedCustomers.length !== 1 ? 's' : ''} selected{selectedSubCustomers.length > 0 ? ` | ${selectedSubCustomers.length} sub-customer${selectedSubCustomers.length !== 1 ? 's' : ''} selected` : ''}
              </div>
              <table className="w-full text-base">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="p-3 text-left">Distributor</th>
                    <th className="p-3 text-left">Customer</th>
                    <th className="p-3 text-left">Sub-Customer</th>
                    <th className="p-3 text-left">Product</th>
                    <th className="p-3 text-right">Revenue</th>
                    <th className="p-3 text-right">Cases</th>
                    <th className="p-3 text-right">Weight (lbs)</th>
                    <th className="p-3 text-left">Period</th>
                  </tr>
                </thead>
                <tbody>
                  {brokerResults.map((row, index) => (
                    <tr key={index} className="border-t hover:bg-gray-50">
                      <td className="p-3">{row.distributor}</td>
                      <td className="p-3">{row.customer}</td>
                      <td className="p-3">{row.subCustomer || '-'}</td>
                      <td className="p-3">{row.productName}</td>
                      <td className="p-3 text-right tabular-nums">{formatCurrency(row.revenue)}</td>
                      <td className="p-3 text-right tabular-nums">{row.cases.toLocaleString()}</td>
                      <td className="p-3 text-right tabular-nums">{row.weight ? row.weight.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '-'}</td>
                      <td className="p-3">{row.period}</td>
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
                        <td className="p-3" colSpan={4}>Total (excl. sub-distributors)</td>
                        <td className="p-3 text-right tabular-nums">{formatCurrency(total.revenue)}</td>
                        <td className="p-3 text-right tabular-nums">{total.cases.toLocaleString()}</td>
                        <td className="p-3 text-right tabular-nums">{total.weight.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                        <td className="p-3">-</td>
                      </tr>
                    );
                  })()}
                </tfoot>
              </table>
            </>
          )}
        </div>

        <div className="p-3 border-t bg-gray-50 text-[11px] text-gray-600 flex-shrink-0">
          Data source: current dashboard selection. Period ranges are inclusive.
        </div>
      </div>

    </div>
  );
};

export default CustomReportModal;


