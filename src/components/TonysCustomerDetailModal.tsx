import React, { useState, useMemo } from 'react';
import { X, Package, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from './ui/button';
import { getItemNumberForProduct } from '../utils/productMapping';
import { AlpineSalesRecord } from '../utils/alpineParser';
import { toTitleCase } from '../lib/utils';
import { loadMasterPricingData, MasterPricingProduct } from '../utils/masterPricingLoader';

// Calculate customer and product data for Tony's hierarchical structure
function calculateTonysCustomerDataAllPeriods(tonysData: AlpineSalesRecord[], mainCustomerName: string, viewMode: 'month' | 'quarter' = 'month') {
  const mainCustomerRecords = tonysData.filter(record => record.customerName === mainCustomerName);
  
  // Group by customerId (sub-customers like "Tony's Fine Foods - Reed") to create sub-customers
  const customersMap = new Map<string, Map<string, number>>();
  const customerMetadata = new Map<string, { accountName?: string }>();
  const productsMap = new Map<string, Map<string, Map<string, number>>>();
  const productMetadata = new Map<string, { size?: string; productCode?: string }>();

  // Convert to quarter format if needed
  const periodToQuarter = (period: string) => {
    const [year, monthStr] = period.split('-');
    const month = parseInt(monthStr, 10);
    const quarter = Math.floor((month - 1) / 3) + 1;
    return `${year}-Q${quarter}`;
  };

  // Get processed periods based on view mode
  const processedPeriods = new Set<string>();
  mainCustomerRecords.forEach(record => {
    const recordPeriod = viewMode === 'quarter' ? periodToQuarter(record.period) : record.period;
    processedPeriods.add(recordPeriod);
  });
  
  const sortedPeriods = Array.from(processedPeriods).sort();

  mainCustomerRecords.forEach(record => {
    const customerId = record.customerId || 'Unknown';
    const productName = record.productName;
    const recordPeriod = viewMode === 'quarter' ? periodToQuarter(record.period) : record.period;
    
    // Initialize customer data
    if (!customersMap.has(customerId)) {
      customersMap.set(customerId, new Map());
      customerMetadata.set(customerId, {
        accountName: record.accountName,
      });
    }

    // Initialize product data for this customer
    if (!productsMap.has(customerId)) {
      productsMap.set(customerId, new Map());
    }
    if (!productsMap.get(customerId)!.has(productName)) {
      productsMap.get(customerId)!.set(productName, new Map());
      productMetadata.set(productName, {
        size: record.size,
        productCode: record.productCode,
      });
    }

    // Add to customer totals
    const customerData = customersMap.get(customerId)!;
    const currentCustomerQty = customerData.get(recordPeriod) || 0;
    customerData.set(recordPeriod, currentCustomerQty + record.cases);

    // Add to product totals for this customer
    const productData = productsMap.get(customerId)!.get(productName)!;
    const currentProductQty = productData.get(recordPeriod) || 0;
    productData.set(recordPeriod, currentProductQty + record.cases);
  });

  // Convert to array format
  const customers = Array.from(customersMap.entries()).map(([customerId, periodData]) => ({
    customerId,
    periodData: periodData,
    accountName: customerMetadata.get(customerId)?.accountName,
    products: Array.from(productsMap.get(customerId)!.entries()).map(([productName, productPeriodData]) => ({
      productName,
      periodData: productPeriodData,
      size: productMetadata.get(productName)?.size,
      productCode: productMetadata.get(productName)?.productCode,
    })).sort((a, b) => {
      const aTotal = Array.from(a.periodData.values()).reduce((sum, qty) => sum + qty, 0);
      const bTotal = Array.from(b.periodData.values()).reduce((sum, qty) => sum + qty, 0);
      return bTotal - aTotal;
    })
  }));

  // Sort customers alphabetically by customerId (sub-customer name)
  customers.sort((a, b) => {
    return a.customerId.localeCompare(b.customerId);
  });

  return { customers, periods: sortedPeriods };
}

// This function is no longer needed since we're showing products directly for each store

interface TonysCustomerDetailModalProps {
  customerName: string; // This is now the main customer name (e.g., "Raley's")
  tonysData: AlpineSalesRecord[];
  isOpen: boolean;
  onClose: () => void;
  selectedMonth?: string;
}

const TonysCustomerDetailModal: React.FC<TonysCustomerDetailModalProps> = ({
  customerName,
  tonysData,
  isOpen,
  onClose,
  selectedMonth,
}) => {
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set());
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [viewMode, setViewMode] = useState<'month' | 'quarter'>('month');
  const [isPeriodDropdownOpen, setIsPeriodDropdownOpen] = useState(false);
  const [periodRange, setPeriodRange] = useState<{start: number, end: number} | null>(null);
  const [masterPricingData, setMasterPricingData] = useState<MasterPricingProduct[]>([]);
  const [isLoadingPricing, setIsLoadingPricing] = useState(false);
  
  const PERIOD_WINDOW_SIZE = 3;

  const toggleCustomerExpansion = (customerId: string) => {
    setExpandedCustomers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(customerId)) {
        newSet.delete(customerId);
      } else {
        newSet.add(customerId);
      }
      return newSet;
    });
  };

  // Get available periods for this main customer
  const availablePeriods = useMemo(() => {
    const mainCustomerRecords = tonysData.filter(record => record.customerName === customerName);
    const periods = Array.from(new Set(mainCustomerRecords.map(r => r.period))).sort();
    
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
  }, [tonysData, customerName, viewMode]);

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

  // Reset selected period when switching view modes
  React.useEffect(() => {
    if (availablePeriods.length > 0) {
      setSelectedPeriod(availablePeriods[availablePeriods.length - 1]);
    }
    // Reset period range when switching view modes
    setPeriodRange(null);
  }, [viewMode, availablePeriods]);

  // Load Master Pricing data when modal opens
  React.useEffect(() => {
    if (isOpen && masterPricingData.length === 0 && !isLoadingPricing) {
      setIsLoadingPricing(true);
      loadMasterPricingData()
        .then(data => {
          setMasterPricingData(data.products);
          setIsLoadingPricing(false);
        })
        .catch(error => {
          console.error('Error loading Master Pricing data:', error);
          setIsLoadingPricing(false);
        });
    }
  }, [isOpen, masterPricingData.length, isLoadingPricing]);

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

  // Helper function to find Master Pricing data for a product
  const findMasterPricingProduct = useMemo(() => {
    return (productName: string, productCode?: string): MasterPricingProduct | undefined => {
      if (masterPricingData.length === 0) return undefined;
      
      // First try to find by product code/item number (exact match)
      if (productCode) {
        const byItemNumber = masterPricingData.find(p => p.itemNumber === productCode);
        if (byItemNumber) return byItemNumber;
      }
      
      // Try to find by DOT number if productCode is a DOT number
      if (productCode) {
        const byDotNumber = masterPricingData.find(p => p.dotNumber === productCode);
        if (byDotNumber) return byDotNumber;
      }
      
      // Try to find by item number in the product name
      const itemNumberMatch = productName.match(/\b(\d{3,4})\b/);
      if (itemNumberMatch) {
        const byItemNumber = masterPricingData.find(p => p.itemNumber === itemNumberMatch[1]);
        if (byItemNumber) return byItemNumber;
      }
      
      // Try exact product name match (case insensitive)
      const exactMatch = masterPricingData.find(p => 
        p.productDescription.toLowerCase() === productName.toLowerCase()
      );
      if (exactMatch) return exactMatch;
      
      // Try partial product name matching with better logic
      const partialMatch = masterPricingData.find(p => {
        const masterDesc = p.productDescription.toLowerCase();
        const tonysDesc = productName.toLowerCase();
        
        // Check if one contains the other
        if (masterDesc.includes(tonysDesc) || tonysDesc.includes(masterDesc)) {
          return true;
        }
        
        // Check for key words matching (breakfast, burrito, sandwich, etc.)
        const keyWords = [
          'breakfast', 'burrito', 'sandwich', 'wrap', 'chorizo', 'bacon', 'turkey', 'sausage', 
          'black bean', 'clara', 'kitchen', 'piroshki', 'beef', 'cheese', 'paramount', 'thai', 'spicy', 'chicken'
        ];
        const masterWords = keyWords.filter(word => masterDesc.includes(word));
        const tonysWords = keyWords.filter(word => tonysDesc.includes(word));
        
        // If they share at least 2 key words, consider it a match
        const commonWords = masterWords.filter(word => tonysWords.includes(word));
        return commonWords.length >= 2;
      });
      
      if (partialMatch) return partialMatch;
      
      // Try very loose matching for products that might be variations
      const looseMatch = masterPricingData.find(p => {
        const masterDesc = p.productDescription.toLowerCase();
        const tonysDesc = productName.toLowerCase();
        
        // Extract main product type words
        const extractMainWords = (desc: string): string[] => {
          const words = desc.split(/[\s,]+/).filter((w: string) => w.length > 2);
          return words.filter((w: string) => 
            !['clear', 'label', 'style', 'kitchen', 'wrap', 'breakfast'].includes(w.toLowerCase())
          );
        };
        
        const masterMainWords = extractMainWords(masterDesc);
        const tonysMainWords = extractMainWords(tonysDesc);
        
        // If they share at least 2 main words, consider it a match
        const commonMainWords = masterMainWords.filter((word: string) => 
          tonysMainWords.some((tonysWord: string) => 
            word.includes(tonysWord) || tonysWord.includes(word)
          )
        );
        
        return commonMainWords.length >= 2;
      });
      
      if (looseMatch) return looseMatch;
      
      return undefined;
    };
  }, [masterPricingData]);

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

  // Show hierarchical data for this distributor with visible periods only
  const { customers } = calculateTonysCustomerDataAllPeriods(tonysData, customerName, viewMode);
  
  // Filter periods to only show visible ones
  const periods = visiblePeriods;
  
  // Debug: Log what we found
  console.log('Tonys Modal Debug:', {
    customerName,
    totalRecords: tonysData.length,
    mainCustomerRecords: tonysData.filter(r => r.customerName === customerName).length,
    subCustomersFound: customers.length,
    periods,
    viewMode,
    sampleCustomers: customers.slice(0, 3).map(c => ({
      customerId: c.customerId,
      accountName: c.accountName,
      productCount: c.products.length,
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
              <h3 className="text-lg font-bold text-gray-900">{customerName} • All Invoices</h3>
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


        {/* Hierarchical Customer List */}
        <div className="flex-1 overflow-y-auto">
          
          {customers.length > 0 ? (
            <div className="px-6 pb-4">
              <div className="bg-white">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left px-4 py-3 text-sm font-bold text-gray-900">Distributor</th>
                      {periods.map((period) => (
                        <th key={period} className="text-right px-4 py-3 text-sm font-bold text-gray-900">
                          {period}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((customer, index) => {
                      const isExpanded = expandedCustomers.has(customer.customerId);
                      const products = customer.products;
                      
                      return (
                        <React.Fragment key={`${customer.customerId}-${index}`}>
                          {/* Customer Row */}
                          <tr className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => toggleCustomerExpansion(customer.customerId)}
                                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                                >
                                  {isExpanded ? (
                                    <ChevronRight className="w-4 h-4 rotate-90" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4" />
                                  )}
                                </button>
                                <div>
                                  <div className="font-medium text-blue-600">
                                    {customer.customerId}
                                  </div>
                                  {customer.accountName && (
                                    <div className="text-xs text-gray-500">
                                      {customer.accountName}
                                    </div>
                                  )}
                                </div>
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
                                          <th className="text-center px-4 py-3 text-sm font-bold text-gray-900 bg-gray-50">Item#</th>
                                          <th className="text-center px-4 py-3 text-sm font-bold text-gray-900 bg-gray-50">Code</th>
                                          {periods.map((period) => (
                                            <th key={period} className="text-center px-4 py-3 text-sm font-bold text-gray-900 bg-gray-50">
                                              {period}
                                            </th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {products.map((product, productIndex) => {
                                          const masterProduct = findMasterPricingProduct(product.productName, product.productCode);
                                          
                                          return (
                                            <tr key={`${product.productName}-${productIndex}`} className="border-b border-gray-100 hover:bg-gray-50">
                                              <td className="px-4 py-3 text-sm text-gray-900">
                                                <span className="font-medium">
                                                  {masterProduct?.productDescription ? toTitleCase(masterProduct.productDescription) : toTitleCase(product.productName)}
                                                </span>
                                              </td>
                                              <td className="px-4 py-3 text-sm text-center text-gray-900">
                                                {masterProduct?.itemNumber || getItemNumberForProduct(product.productName) || ''}
                                              </td>
                                              <td className="px-4 py-3 text-sm text-center text-gray-900">
                                                {masterProduct?.dotNumber || product.productCode || ''}
                                              </td>
                                              {periods.map((period) => (
                                                <td key={period} className="px-4 py-3 text-sm text-right text-gray-900">
                                                  {product.periodData.get(period) || 0}
                                                </td>
                                              ))}
                                            </tr>
                                          );
                                        })}
                                        {/* Product Total Row */}
                                        <tr className="border-t border-gray-200 bg-gray-100">
                                          <td className="px-4 py-3 text-sm font-bold text-gray-900">Subtotal</td>
                                          <td className="px-4 py-3 text-sm font-bold text-center text-gray-900"></td>
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
                    <tr className="border-t-2 border-gray-300 bg-blue-50">
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
              <p className="text-sm mt-2">Customer data may not be populated in the uploaded data</p>
            </div>
          )}
          
          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Sum of Cases by Distributor • Main Customer: {customerName}
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

export default TonysCustomerDetailModal;

