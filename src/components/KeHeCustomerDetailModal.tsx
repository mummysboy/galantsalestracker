import React, { useState, useMemo } from 'react';
import { X, TrendingUp, TrendingDown, Package, ChevronDown, ChevronRight, Calendar, Download, ChevronLeft } from 'lucide-react';
import { Button } from './ui/button';
import { AlpineSalesRecord } from '../utils/alpineParser';
import { toTitleCase } from '../lib/utils';

// Function to format company names for better readability
const formatCompanyName = (companyName: string): string => {
  // If it's already a readable name (doesn't contain codes like MPC), return as is
  if (!companyName.includes('MPC') && !companyName.includes('/')) {
    return companyName;
  }
  
  // Try to extract meaningful parts from codes like "SPROUTS/MPC 328 DENVER-DELI/CH"
  const parts = companyName.split('/');
  if (parts.length >= 2) {
    const storePart = parts[0]; // "SPROUTS"
    const locationPart = parts[1].replace(/MPC \d+\s*/, '').replace(/DELI\/CH$/, '').trim(); // Extract location
    
    if (locationPart && locationPart !== '') {
      return `${storePart} - ${locationPart}`;
    }
  }
  
  // Fallback: clean up the original name
  return companyName
    .replace(/MPC \d+\s*/, '') // Remove MPC number
    .replace(/DELI\/CH$/, '') // Remove DELI/CH suffix
    .replace(/\s+/g, ' ') // Clean up multiple spaces
    .trim();
};

// Calculate customer data for a retailer (Level 1 -> Level 2) with all periods
function calculateRetailerCustomerDataAllPeriods(keheData: AlpineSalesRecord[], retailerName: string, viewMode: 'month' | 'quarter' = 'month') {
  const retailerRecords = keheData.filter(record => record.customerName === retailerName);
  
  // Get all unique customers for this retailer
  const customersMap = new Map<string, Map<string, number>>();

  // Determine periods
  const allPeriods = Array.from(new Set(retailerRecords.map(r => r.period))).sort();
  
  // Convert to quarter format if needed
  const periodToQuarter = (period: string) => {
    const [year, monthStr] = period.split('-');
    const month = parseInt(monthStr, 10);
    const quarter = Math.floor((month - 1) / 3) + 1;
    return `${year}-Q${quarter}`;
  };

  // Get processed periods based on view mode
  const processedPeriods = new Set<string>();
  retailerRecords.forEach(record => {
    const recordPeriod = viewMode === 'quarter' ? periodToQuarter(record.period) : record.period;
    processedPeriods.add(recordPeriod);
  });
  
  const sortedPeriods = Array.from(processedPeriods).sort();

  retailerRecords.forEach(record => {
    // Use accountName directly as customer name (Column C)
    const customerName = record.accountName || 'Unknown Customer';
    const recordPeriod = viewMode === 'quarter' ? periodToQuarter(record.period) : record.period;
    
    if (!customersMap.has(customerName)) {
      customersMap.set(customerName, new Map());
    }

    const customerData = customersMap.get(customerName)!;
    const currentQuantity = customerData.get(recordPeriod) || 0;
    customerData.set(recordPeriod, currentQuantity + record.cases);
  });

  // Convert to array format
  const customers = Array.from(customersMap.entries()).map(([customerName, periodData]) => ({
    customerName,
    periodData: periodData,
  }));

  // Sort by total quantity across all periods
  customers.sort((a, b) => {
    const aTotal = Array.from(a.periodData.values()).reduce((sum, qty) => sum + qty, 0);
    const bTotal = Array.from(b.periodData.values()).reduce((sum, qty) => sum + qty, 0);
    return bTotal - aTotal;
  });

  return { customers, periods: sortedPeriods };
}

// Calculate product data for a specific customer (Column N data) with all periods
function calculateCustomerProductDataAllPeriods(keheData: AlpineSalesRecord[], retailerName: string, customerName: string, viewMode: 'month' | 'quarter' = 'month') {
  const customerRecords = keheData.filter(record => 
    record.customerName === retailerName && 
    record.accountName === customerName
  );
  
  // Get all unique products for this customer
  const productsMap = new Map<string, Map<string, number>>();
  const productMetadata = new Map<string, { size?: string; productCode?: string }>();

  // Determine periods
  const allPeriods = Array.from(new Set(customerRecords.map(r => r.period))).sort();
  
  // Convert to quarter format if needed
  const periodToQuarter = (period: string) => {
    const [year, monthStr] = period.split('-');
    const month = parseInt(monthStr, 10);
    const quarter = Math.floor((month - 1) / 3) + 1;
    return `${year}-Q${quarter}`;
  };

  // Get processed periods based on view mode
  const processedPeriods = new Set<string>();
  customerRecords.forEach(record => {
    const recordPeriod = viewMode === 'quarter' ? periodToQuarter(record.period) : record.period;
    processedPeriods.add(recordPeriod);
  });
  
  const sortedPeriods = Array.from(processedPeriods).sort();

  customerRecords.forEach(record => {
    // Use productName directly (Column D) as the product identifier
    const productName = record.productName;
    const recordPeriod = viewMode === 'quarter' ? periodToQuarter(record.period) : record.period;
    
    if (!productsMap.has(productName)) {
      productsMap.set(productName, new Map());
      productMetadata.set(productName, {
        size: record.size,
        productCode: record.productCode,
      });
    }

    const productData = productsMap.get(productName)!;
    const currentQuantity = productData.get(recordPeriod) || 0;
    productData.set(recordPeriod, currentQuantity + record.cases);
  });

  // Convert to array format
  const products = Array.from(productsMap.entries()).map(([productName, periodData]) => ({
    productName,
    periodData: periodData,
    size: productMetadata.get(productName)?.size,
    productCode: productMetadata.get(productName)?.productCode,
  }));

  // Sort by total quantity across all periods
  products.sort((a, b) => {
    const aTotal = Array.from(a.periodData.values()).reduce((sum, qty) => sum + qty, 0);
    const bTotal = Array.from(b.periodData.values()).reduce((sum, qty) => sum + qty, 0);
    return bTotal - aTotal;
  });

  return { products, periods: sortedPeriods };
}

interface KeHeCustomerDetailModalProps {
  retailerName: string;
  keheData: AlpineSalesRecord[];
  isOpen: boolean;
  onClose: () => void;
  selectedMonth?: string;
}

const KeHeCustomerDetailModal: React.FC<KeHeCustomerDetailModalProps> = ({
  retailerName,
  keheData,
  isOpen,
  onClose,
  selectedMonth,
}) => {
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set());
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [viewMode, setViewMode] = useState<'month' | 'quarter'>('month');
  const [isPeriodDropdownOpen, setIsPeriodDropdownOpen] = useState(false);
  const [periodRange, setPeriodRange] = useState<{start: number, end: number} | null>(null);
  
  const PERIOD_WINDOW_SIZE = 3;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (change < 0) return <TrendingDown className="w-4 h-4 text-red-600" />;
    return null;
  };

  const toggleCustomerExpansion = (customerName: string) => {
    setExpandedCustomers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(customerName)) {
        newSet.delete(customerName);
      } else {
        newSet.add(customerName);
      }
      return newSet;
    });
  };

  // Get available periods for this retailer
  const availablePeriods = useMemo(() => {
    const retailerRecords = keheData.filter(record => record.customerName === retailerName);
    const periods = Array.from(new Set(retailerRecords.map(r => r.period))).sort();
    
    if (viewMode === 'quarter') {
      const quarterPeriods = Array.from(new Set(periods.map(p => {
        const [year, monthStr] = p.split('-');
        const month = parseInt(monthStr, 10);
        const quarter = Math.floor((month - 1) / 3) + 1;
        return `${year}-Q${quarter}`;
      }))).sort();
      return quarterPeriods;
    }
    
    return periods;
  }, [keheData, retailerName, viewMode]);

  // Set default period when data changes and initialize period range
  React.useEffect(() => {
    if (availablePeriods.length > 0 && !selectedPeriod) {
      setSelectedPeriod(availablePeriods[availablePeriods.length - 1]);
    }
    
    // Initialize period range to show current month on the right
    if (availablePeriods.length > PERIOD_WINDOW_SIZE && !periodRange) {
      const currentPeriod = selectedMonth && selectedMonth !== 'all' ? selectedMonth : availablePeriods[availablePeriods.length - 1];
      const currentIndex = availablePeriods.findIndex(period => period === currentPeriod);
      
      if (currentIndex >= 0) {
        // Position current month on the right (last position in the 3-month window)
        const end = currentIndex;
        const start = Math.max(0, end - PERIOD_WINDOW_SIZE + 1);
        setPeriodRange({ start, end });
      } else {
        // Fallback to showing the most recent months
        const start = Math.max(0, availablePeriods.length - PERIOD_WINDOW_SIZE);
        const end = availablePeriods.length - 1;
        setPeriodRange({ start, end });
      }
    }
  }, [availablePeriods, selectedPeriod, selectedMonth, periodRange]);

  // Ensure we always have a selected period
  const effectiveSelectedPeriod = selectedPeriod || (availablePeriods.length > 0 ? availablePeriods[availablePeriods.length - 1] : '');

  // Reset selected period when switching view modes
  React.useEffect(() => {
    if (availablePeriods.length > 0) {
      setSelectedPeriod(availablePeriods[availablePeriods.length - 1]);
    }
    // Reset period range when switching view modes
    setPeriodRange(null);
  }, [viewMode]);

  // Navigation functions for period range
  const navigatePeriodRange = (direction: 'left' | 'right') => {
    if (!periodRange || availablePeriods.length <= PERIOD_WINDOW_SIZE) return;
    
    let newStart, newEnd;
    if (direction === 'left') {
      // Move window left by 1 period
      newStart = Math.max(0, periodRange.start - 1);
      newEnd = Math.min(availablePeriods.length - 1, newStart + PERIOD_WINDOW_SIZE - 1);
    } else {
      // Move window right by 1 period
      newEnd = Math.min(availablePeriods.length - 1, periodRange.end + 1);
      newStart = Math.max(0, newEnd - PERIOD_WINDOW_SIZE + 1);
    }
    
    setPeriodRange({ start: newStart, end: newEnd });
  };

  // Get visible periods based on range
  const visiblePeriods = useMemo(() => {
    if (!periodRange || availablePeriods.length <= PERIOD_WINDOW_SIZE) {
      return availablePeriods;
    }
    return availablePeriods.slice(periodRange.start, periodRange.end + 1);
  }, [availablePeriods, periodRange]);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isPeriodDropdownOpen && !target.closest('.period-dropdown')) {
        setIsPeriodDropdownOpen(false);
      }
    };

    if (isPeriodDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPeriodDropdownOpen]);

  // Function to export customer data as CSV
  const exportToCSV = () => {
    const { customers, periods } = calculateRetailerCustomerDataAllPeriods(keheData, retailerName, viewMode);
    
    // CSV Headers
    const headers = ['Company', ...periods];
    
    // CSV Rows
    const rows = customers.map(customer => [
      customer.customerName,
      ...periods.map(period => (customer.periodData.get(period) || 0).toString())
    ]);
    
    // Add totals row
    const totalsRow = ['Total', ...periods.map(period => {
      const periodTotal = customers.reduce((sum, customer) => {
        return sum + (customer.periodData.get(period) || 0);
      }, 0);
      return periodTotal.toString();
    })];
    
    rows.push(totalsRow);
    
    // Convert to CSV format
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => {
        // Escape cells containing commas, quotes, or newlines
        const cellStr = String(cell);
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(','))
    ].join('\n');
    
    // Create download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${retailerName}_Cases_By_Company_All_Periods.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  // Show customers (Column C) summary for retailer with visible periods only
  const { customers, periods: allPeriods } = calculateRetailerCustomerDataAllPeriods(keheData, retailerName, viewMode);
  
  // Filter periods to only show visible ones
  const periods = visiblePeriods;
  
  // Debug: Log what we found
  console.log('KeHe Modal Debug:', {
    retailerName,
    totalRecords: keheData.length,
    retailerRecords: keheData.filter(r => r.customerName === retailerName).length,
    customersFound: customers.length,
    periods,
    viewMode,
    sampleCustomers: customers.slice(0, 3).map(c => ({
      customerName: c.customerName,
      periodData: Object.fromEntries(c.periodData)
    }))
  });
  

    return (
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[10000]"
        onClick={onClose}
      >
        <div 
          className="bg-white rounded-lg shadow-xl max-w-5xl w-full h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 pb-0">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">{retailerName} • All Invoices</h3>
              <div className="flex items-center gap-3">
                {/* Navigation controls for period range */}
                {availablePeriods.length > PERIOD_WINDOW_SIZE && (
                  <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2">
                    <button
                      onClick={() => navigatePeriodRange('left')}
                      className="p-1 hover:bg-gray-200 rounded disabled:opacity-50"
                      disabled={!periodRange || periodRange.start === 0}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm text-gray-700 px-2 whitespace-nowrap">
                      {periodRange ? 
                        `${availablePeriods[periodRange.start]} - ${availablePeriods[periodRange.end]}` :
                        `${availablePeriods.length} periods`
                      }
                    </span>
                    <button
                      onClick={() => navigatePeriodRange('right')}
                      className="p-1 hover:bg-gray-200 rounded disabled:opacity-50"
                      disabled={!periodRange || periodRange.end === availablePeriods.length - 1}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

        {/* Customers List */}
        <div className="flex-1 overflow-y-auto">
          
          {customers.length > 0 ? (
            <div className="px-6 pb-4">
              <div className="bg-white">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left px-4 py-3 text-sm font-bold text-gray-900">Company</th>
                      {periods.map((period) => (
                        <th key={period} className="text-right px-4 py-3 text-sm font-bold text-gray-900">
                          {period}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((customer, index) => {
                      const isExpanded = expandedCustomers.has(customer.customerName);
                      const { products } = calculateCustomerProductDataAllPeriods(keheData, retailerName, customer.customerName, viewMode);
                      
                      return (
                        <React.Fragment key={`${customer.customerName}-${index}`}>
                          <tr 
                            className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                            onClick={() => toggleCustomerExpansion(customer.customerName)}
                          >
                            <td className="px-4 py-3 text-sm text-gray-900">
                              <div className="flex items-center gap-2">
                                {products.length > 0 && (
                                  <div className="flex items-center gap-1">
                                    {isExpanded ? (
                                      <ChevronDown className="w-4 h-4 text-gray-400" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4 text-gray-400" />
                                    )}
                                  </div>
                                )}
                                <span className="font-medium">{formatCompanyName(customer.customerName)}</span>
                              </div>
                            </td>
                            {periods.map((period) => (
                              <td key={period} className="px-4 py-3 text-sm text-right text-gray-900">
                                {customer.periodData.get(period) || 0}
                              </td>
                            ))}
                          </tr>
                          
                          {/* Product Breakdown Row */}
                          <tr className="bg-gray-50">
                            <td colSpan={periods.length + 1} className="p-0">
                              <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                <div className="px-4 py-4">
                                  <div className="bg-white border border-gray-200 rounded-lg">
                                    <table className="w-full border-collapse">
                                      <thead>
                                        <tr className="border-b border-gray-200">
                                          <th className="text-left px-4 py-3 text-sm font-bold text-gray-900 bg-gray-50">Product</th>
                                          <th className="text-center px-4 py-3 text-sm font-bold text-gray-900 bg-gray-50">Code</th>
                                          {periods.map((period) => (
                                            <th key={period} className="text-center px-4 py-3 text-sm font-bold text-gray-900 bg-gray-50">
                                              {period}
                                            </th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {products.map((product, productIndex) => (
                                          <tr key={`${product.productName}-${productIndex}`} className="border-b border-gray-100">
                                            <td className="px-4 py-3 text-sm text-gray-900">
                                              {toTitleCase(product.productName)}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-center text-gray-900">
                                              {product.productCode || ''}
                                            </td>
                                            {periods.map((period) => (
                                              <td key={period} className="px-4 py-3 text-sm text-right text-gray-900">
                                                {product.periodData.get(period) || 0}
                                              </td>
                                            ))}
                                          </tr>
                                        ))}
                                        {/* Product Totals Row */}
                                        <tr className="border-t border-gray-300">
                                          <td className="px-4 py-3 text-sm font-bold text-gray-900">Total</td>
                                          <td className="px-4 py-3 text-sm font-bold text-center text-gray-900"></td>
                                          {periods.map((period) => {
                                            const periodTotal = products.reduce((sum, product) => {
                                              return sum + (product.periodData.get(period) || 0);
                                            }, 0);
                                            return (
                                              <td key={period} className="px-4 py-3 text-sm font-bold text-right text-gray-900">
                                                {periodTotal}
                                              </td>
                                            );
                                          })}
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    })}
                    {/* Total Row */}
                    <tr className="border-t border-gray-200">
                      <td className="px-4 py-3 text-sm font-bold text-gray-900">Total</td>
                      {periods.map((period) => {
                        const periodTotal = customers.reduce((sum, customer) => {
                          return sum + (customer.periodData.get(period) || 0);
                        }, 0);
                        return (
                          <td key={period} className="px-4 py-3 text-sm font-bold text-right text-gray-900">
                            {periodTotal}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 px-6">
              <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No customer data found</p>
              <p className="text-sm mt-2">Column C (Customer Name) may not be populated in the uploaded data</p>
            </div>
          )}
          
          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Sum of Cases by Company • Click companies to view product breakdown
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('month')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    viewMode === 'month' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Month
                </button>
                <button
                  onClick={() => setViewMode('quarter')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    viewMode === 'quarter' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Quarter
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KeHeCustomerDetailModal;

