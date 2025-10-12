import React, { useState, useMemo } from 'react';
import { X, TrendingUp, TrendingDown, Package, ChevronDown, ChevronRight, Calendar } from 'lucide-react';
import { Button } from './ui/button';
import { AlpineSalesRecord } from '../utils/alpineParser';
import { toTitleCase } from '../lib/utils';

// Calculate customer data for a retailer (Level 1 -> Level 2)
function calculateRetailerCustomerData(keheData: AlpineSalesRecord[], retailerName: string, selectedPeriod?: string, viewMode: 'month' | 'quarter' = 'month') {
  const retailerRecords = keheData.filter(record => record.customerName === retailerName);
  
  // Get all unique customers for this retailer
  const customersMap = new Map<string, {
    currentRevenue: number;
    previousRevenue: number;
    currentQuantity: number;
    previousQuantity: number;
  }>();

  // Determine periods
  const allPeriods = Array.from(new Set(retailerRecords.map(r => r.period))).sort();
  
  // Convert to quarter format if needed
  const periodToQuarter = (period: string) => {
    const [year, monthStr] = period.split('-');
    const month = parseInt(monthStr, 10);
    const quarter = Math.floor((month - 1) / 3) + 1;
    return `${year}-Q${quarter}`;
  };

  const currentPeriod = selectedPeriod || allPeriods[allPeriods.length - 1];
  const previousPeriod = allPeriods.length >= 2 ? allPeriods[allPeriods.length - 2] : currentPeriod;

  retailerRecords.forEach(record => {
    // Use accountName directly as customer name (Column C)
    const customerName = record.accountName || 'Unknown Customer';
    
    if (!customersMap.has(customerName)) {
      customersMap.set(customerName, {
        currentRevenue: 0,
        previousRevenue: 0,
        currentQuantity: 0,
        previousQuantity: 0,
      });
    }

    const customerData = customersMap.get(customerName)!;
    const recordPeriod = viewMode === 'quarter' ? periodToQuarter(record.period) : record.period;
    
    if (recordPeriod === currentPeriod) {
      customerData.currentRevenue += record.revenue;
      customerData.currentQuantity += record.cases;
    } else if (recordPeriod === previousPeriod) {
      customerData.previousRevenue += record.revenue;
      customerData.previousQuantity += record.cases;
    }
  });

  // Convert to array and calculate changes
  const customers = Array.from(customersMap.entries()).map(([customerName, data]) => ({
    customerName,
    currentRevenue: data.currentRevenue,
    previousRevenue: data.previousRevenue,
    currentQuantity: data.currentQuantity,
    previousQuantity: data.previousQuantity,
    revenueChange: data.currentRevenue - data.previousRevenue,
    changePercentage: data.previousRevenue > 0 
      ? ((data.currentRevenue - data.previousRevenue) / data.previousRevenue) * 100 
      : (data.currentRevenue > 0 ? 100 : 0),
  }));

  // Sort by current revenue
  customers.sort((a, b) => b.currentRevenue - a.currentRevenue);

  return customers;
}

// Calculate product data for a specific customer (Column N data)
function calculateCustomerProductData(keheData: AlpineSalesRecord[], retailerName: string, customerName: string, selectedPeriod?: string, viewMode: 'month' | 'quarter' = 'month') {
  const customerRecords = keheData.filter(record => 
    record.customerName === retailerName && 
    record.accountName === customerName
  );
  
  // Get all unique products for this customer
  const productsMap = new Map<string, {
    currentRevenue: number;
    previousRevenue: number;
    currentCases: number;
    previousCases: number;
    size?: string;
    productCode?: string;
  }>();

  // Determine periods
  const allPeriods = Array.from(new Set(customerRecords.map(r => r.period))).sort();
  
  // Convert to quarter format if needed
  const periodToQuarter = (period: string) => {
    const [year, monthStr] = period.split('-');
    const month = parseInt(monthStr, 10);
    const quarter = Math.floor((month - 1) / 3) + 1;
    return `${year}-Q${quarter}`;
  };

  const currentPeriod = selectedPeriod || allPeriods[allPeriods.length - 1];
  const previousPeriod = allPeriods.length >= 2 ? allPeriods[allPeriods.length - 2] : currentPeriod;

  customerRecords.forEach(record => {
    // Use productName directly (Column D) as the product identifier
    const productName = record.productName;
    
    if (!productsMap.has(productName)) {
      productsMap.set(productName, {
        currentRevenue: 0,
        previousRevenue: 0,
        currentCases: 0,
        previousCases: 0,
        size: record.size,
        productCode: record.productCode,
      });
    }

    const productData = productsMap.get(productName)!;
    const recordPeriod = viewMode === 'quarter' ? periodToQuarter(record.period) : record.period;
    
    if (recordPeriod === currentPeriod) {
      productData.currentRevenue += record.revenue;
      productData.currentCases += record.cases;
    } else if (recordPeriod === previousPeriod) {
      productData.previousRevenue += record.revenue;
      productData.previousCases += record.cases;
    }
  });

  // Convert to array and calculate changes
  const products = Array.from(productsMap.entries()).map(([productName, data]) => ({
      productName,
      size: data.size,
      productCode: data.productCode,
    currentRevenue: data.currentRevenue,
    previousRevenue: data.previousRevenue,
    currentCases: data.currentCases,
    previousCases: data.previousCases,
    revenueChange: data.currentRevenue - data.previousRevenue,
    casesChange: data.currentCases - data.previousCases,
    changePercentage: data.previousRevenue > 0 
      ? ((data.currentRevenue - data.previousRevenue) / data.previousRevenue) * 100 
      : (data.currentRevenue > 0 ? 100 : 0),
  }));

  // Sort by current revenue
  products.sort((a, b) => b.currentRevenue - a.currentRevenue);

  return products;
}

interface KeHeCustomerDetailModalProps {
  retailerName: string;
  keheData: AlpineSalesRecord[];
  isOpen: boolean;
  onClose: () => void;
}

const KeHeCustomerDetailModal: React.FC<KeHeCustomerDetailModalProps> = ({
  retailerName,
  keheData,
  isOpen,
  onClose,
}) => {
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set());
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [viewMode, setViewMode] = useState<'month' | 'quarter'>('month');
  const [isPeriodDropdownOpen, setIsPeriodDropdownOpen] = useState(false);

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

  // Set default period when data changes
  React.useEffect(() => {
    if (availablePeriods.length > 0 && !selectedPeriod) {
      setSelectedPeriod(availablePeriods[availablePeriods.length - 1]);
    }
  }, [availablePeriods, selectedPeriod]);

  // Reset selected period when switching view modes
  React.useEffect(() => {
    if (availablePeriods.length > 0) {
      setSelectedPeriod(availablePeriods[availablePeriods.length - 1]);
    }
  }, [viewMode]);

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

  if (!isOpen) return null;

  // Show customers (Column C) summary for retailer
  const customers = calculateRetailerCustomerData(keheData, retailerName, selectedPeriod, viewMode);
  
  // Get the actual periods for labeling
  const retailerRecords = keheData.filter(record => record.customerName === retailerName);
  const allPeriods = Array.from(new Set(retailerRecords.map(r => r.period))).sort();
  
  // Format period names for display
  const formatPeriodName = (period: string) => {
    if (viewMode === 'quarter') {
      return period; // Already in Q1-2025 format
    }
    const [year, month] = period.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthIndex = parseInt(month) - 1;
    const monthName = monthNames[monthIndex] || month;
    const shortYear = year.slice(-2);
    return `${monthName}-${shortYear}`;
  };
  
  const currentPeriodName = selectedPeriod ? formatPeriodName(selectedPeriod) : 'Current';
  const previousPeriodName = availablePeriods.length >= 2 ? formatPeriodName(availablePeriods[availablePeriods.length - 2]) : 'Previous';
    
    // Debug: Log what we found
    console.log('KeHe Modal Debug:', {
      retailerName,
      totalRecords: keheData.length,
      retailerRecords: keheData.filter(r => r.customerName === retailerName).length,
      customersFound: customers.length,
      selectedPeriod,
      viewMode,
      currentPeriodName,
      previousPeriodName,
      availablePeriods,
      sampleRecords: keheData.filter(r => r.customerName === retailerName).slice(0, 3).map(r => ({
        customerName: r.customerName,
        accountName: r.accountName,
        productName: r.productName
      }))
    });
    
    const totalCurrentRevenue = customers.reduce((sum, c) => sum + c.currentRevenue, 0);
    const totalPreviousRevenue = customers.reduce((sum, c) => sum + c.previousRevenue, 0);
  const totalCurrentCases = customers.reduce((sum, c) => sum + c.currentQuantity, 0);
  const totalPreviousCases = customers.reduce((sum, c) => sum + c.previousQuantity, 0);
    const totalChange = totalCurrentRevenue - totalPreviousRevenue;
  const totalCasesChange = totalCurrentCases - totalPreviousCases;
  const totalChangePercent = totalPreviousRevenue > 0 
    ? ((totalCurrentRevenue - totalPreviousRevenue) / totalPreviousRevenue) * 100 
    : (totalCurrentRevenue > 0 ? 100 : 0);
  const totalCasesChangePercent = totalPreviousCases > 0 
    ? ((totalCurrentCases - totalPreviousCases) / totalPreviousCases) * 100 
    : (totalCurrentCases > 0 ? 100 : 0);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[10000]">
        <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900">{retailerName}</h2>
              <p className="text-sm text-gray-600">Customer Revenue Summary (Column C)</p>
              
              {/* Period Selection Controls */}
              <div className="flex items-center gap-3 mt-3">
                <div className="relative period-dropdown">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsPeriodDropdownOpen(!isPeriodDropdownOpen)}
                    className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
                  >
                    <Calendar className="w-4 h-4" />
                    {selectedPeriod ? formatPeriodName(selectedPeriod) : 'Select Period'}
                    <ChevronDown className={`w-4 h-4 transition-transform ${isPeriodDropdownOpen ? 'rotate-180' : ''}`} />
                  </Button>
                  
                  {isPeriodDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                      <div className="py-1">
                        {availablePeriods.map((period) => (
                          <button
                            key={period}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setSelectedPeriod(period);
                              setIsPeriodDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                              selectedPeriod === period ? 'text-blue-700 font-medium bg-blue-50' : 'text-gray-700'
                            }`}
                          >
                            {formatPeriodName(period)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* View Mode Toggle */}
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('month')}
                    className={`px-3 py-1 text-sm rounded transition-colors ${
                      viewMode === 'month' 
                        ? 'bg-white text-gray-900 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Month
                  </button>
                  <button
                    onClick={() => setViewMode('quarter')}
                    className={`px-3 py-1 text-sm rounded transition-colors ${
                      viewMode === 'quarter' 
                        ? 'bg-white text-gray-900 shadow-sm' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Quarter
                  </button>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

        {/* Summary */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-sm font-medium text-gray-700 mb-2">{currentPeriodName} Revenue</div>
              <div className="text-lg font-bold text-blue-600">
                {formatCurrency(totalCurrentRevenue)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-700 mb-2">{currentPeriodName} Cases</div>
              <div className="text-lg font-bold text-blue-600">
                {totalCurrentCases.toLocaleString()}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-700 mb-2">Revenue Change</div>
              <div className={`text-lg font-bold ${
                totalChange >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {totalChange >= 0 ? '+' : ''}{formatCurrency(totalChange)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-gray-700 mb-2">Cases Change</div>
              <div className={`text-lg font-bold ${
                totalCasesChange >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {totalCasesChange >= 0 ? '+' : ''}{totalCasesChange.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Customers List */}
        <div className="flex-1 overflow-y-auto p-6">
          <h3 className="text-lg font-semibold mb-4">Customers by Revenue ({customers.length})</h3>
          {customers.length > 0 ? (
            <div className="space-y-3">
              {customers.map((customer, index) => {
                const isExpanded = expandedCustomers.has(customer.customerName);
                const products = calculateCustomerProductData(keheData, retailerName, customer.customerName, selectedPeriod, viewMode);
                
                return (
                  <div
                    key={`${customer.customerName}-${index}`}
                    className="border rounded-lg overflow-hidden"
                  >
                    {/* Customer Header - Clickable */}
                    <div 
                      className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => toggleCustomerExpansion(customer.customerName)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-gray-900">{customer.customerName}</h4>
                            {products.length > 0 && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                {products.length} products
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <span className="text-gray-600">
                              {currentPeriodName}: <span className="font-medium">{formatCurrency(customer.currentRevenue)}</span>
                            </span>
                            <span className="text-gray-600">
                              {currentPeriodName}: <span className="font-medium">{customer.currentQuantity.toLocaleString()}</span>
                            </span>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                            <span>{previousPeriodName}: {formatCurrency(customer.previousRevenue)}</span>
                            <span>{previousPeriodName}: {customer.previousQuantity.toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            {getTrendIcon(customer.revenueChange)}
                          </div>
                          <div className="text-right">
                            <div className={`font-bold text-sm ${
                              customer.revenueChange >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {customer.revenueChange >= 0 ? '+' : ''}{formatCurrency(customer.revenueChange)}
                            </div>
                            <div className={`text-xs ${
                              customer.changePercentage >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {customer.changePercentage >= 0 ? '+' : ''}{customer.changePercentage.toFixed(1)}%
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`font-bold text-sm ${
                              (customer.currentQuantity - customer.previousQuantity) >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {(customer.currentQuantity - customer.previousQuantity) >= 0 ? '+' : ''}{(customer.currentQuantity - customer.previousQuantity).toLocaleString()} cases
                            </div>
                            <div className={`text-xs ${
                              customer.previousQuantity > 0 ? 
                                ((customer.currentQuantity - customer.previousQuantity) / customer.previousQuantity * 100) >= 0 ? 'text-green-600' : 'text-red-600'
                                : 'text-gray-500'
                            }`}>
                              {customer.previousQuantity > 0 ? 
                                `${((customer.currentQuantity - customer.previousQuantity) / customer.previousQuantity * 100) >= 0 ? '+' : ''}${((customer.currentQuantity - customer.previousQuantity) / customer.previousQuantity * 100).toFixed(1)}%`
                                : 'N/A'
                              }
                            </div>
                          </div>
                          {products.length > 0 && (
                            <div className="ml-2">
                              {isExpanded ? (
                                <ChevronDown className="w-5 h-5 text-gray-400" />
                              ) : (
                                <ChevronRight className="w-5 h-5 text-gray-400" />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Product Dropdown */}
                    {isExpanded && products.length > 0 && (
                      <div className="border-t bg-gray-50 p-4">
                        <h5 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                          <Package className="w-4 h-4" />
                          Products ({products.length})
                        </h5>
                        <div className="space-y-2">
                          {products.map((product, productIndex) => (
                            <div
                              key={`${product.productName}-${productIndex}`}
                              className="bg-white border rounded-lg p-3"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="font-medium text-gray-900">{toTitleCase(product.productName)}</div>
                      {(product.size || product.productCode) && (
                        <div className="text-xs text-gray-500 flex gap-2 mt-1">
                          {product.size && <span>Size: {product.size}</span>}
                          {product.productCode && <span>Code: {product.productCode}</span>}
                        </div>
                      )}
                    </div>
                                <div className="flex items-center gap-4 text-sm">
                                  <div className="text-right">
                                    <div className="text-gray-600">Cases</div>
                                    <div className="font-medium">
                                      {product.currentCases} / {product.previousCases}
                  </div>
                                    <div className={`text-xs ${
                                      product.casesChange >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                                      {product.casesChange >= 0 ? '+' : ''}{product.casesChange}
                  </div>
                </div>
                                  <div className="text-right">
                                    <div className="text-gray-600">Revenue</div>
                                    <div className="font-medium">
                                      {formatCurrency(product.currentRevenue)}
                  </div>
                                    <div className={`text-xs ${
                                      product.revenueChange >= 0 ? 'text-green-600' : 'text-red-600'
                                    }`}>
                      {product.revenueChange >= 0 ? '+' : ''}{formatCurrency(product.revenueChange)}
                    </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No customer data found</p>
              <p className="text-sm mt-2">Column C (Customer Name) may not be populated in the uploaded data</p>
            </div>
          )}
        </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Click on customers to view their product details (Column N data)
            </div>
              <Button onClick={onClose}>Close</Button>
            </div>
          </div>
      </div>
    </div>
  );
};

export default KeHeCustomerDetailModal;

