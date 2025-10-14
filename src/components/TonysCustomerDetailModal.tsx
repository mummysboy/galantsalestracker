import React, { useState, useMemo } from 'react';
import { X, Package, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from './ui/button';
import { AlpineSalesRecord } from '../utils/alpineParser';
import { toTitleCase } from '../lib/utils';

// Calculate product data for a store (Level 3 -> Products) with all periods
function calculateStoreProductDataAllPeriods(tonysData: AlpineSalesRecord[], storeName: string, viewMode: 'month' | 'quarter' = 'month') {
  const storeRecords = tonysData.filter(record => record.customerName === storeName);
  
  // Get all unique products for this store
  const productsMap = new Map<string, Map<string, number>>();
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
  storeRecords.forEach(record => {
    const recordPeriod = viewMode === 'quarter' ? periodToQuarter(record.period) : record.period;
    processedPeriods.add(recordPeriod);
  });
  
  const sortedPeriods = Array.from(processedPeriods).sort();

  storeRecords.forEach(record => {
    // Use productName directly as the product identifier
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

// This function is no longer needed since we're showing products directly for each store

interface TonysCustomerDetailModalProps {
  customerName: string; // This is now the store name (Column C)
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
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [viewMode, setViewMode] = useState<'month' | 'quarter'>('month');
  const [isPeriodDropdownOpen, setIsPeriodDropdownOpen] = useState(false);
  const [periodRange, setPeriodRange] = useState<{start: number, end: number} | null>(null);
  
  const PERIOD_WINDOW_SIZE = 3;

  // Get available periods for this store
  const availablePeriods = useMemo(() => {
    const storeRecords = tonysData.filter(record => record.customerName === customerName);
    const periods = Array.from(new Set(storeRecords.map(r => r.period))).sort();
    
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

  if (!isOpen) return null;

  // Show products for this store with visible periods only
  const { products } = calculateStoreProductDataAllPeriods(tonysData, customerName, viewMode);
  
  // Filter periods to only show visible ones
  const periods = visiblePeriods;
  
  // Debug: Log what we found
  console.log('Tonys Modal Debug:', {
    customerName,
    totalRecords: tonysData.length,
    storeRecords: tonysData.filter(r => r.customerName === customerName).length,
    productsFound: products.length,
    periods,
    viewMode,
    sampleProducts: products.slice(0, 3).map(p => ({
      productName: p.productName,
      periodData: Object.fromEntries(p.periodData)
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

        {/* Products List */}
        <div className="flex-1 overflow-y-auto">
          
          {products.length > 0 ? (
            <div className="px-6 pb-4">
              <div className="bg-white">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left px-4 py-3 text-sm font-bold text-gray-900">Product</th>
                      <th className="text-center px-4 py-3 text-sm font-bold text-gray-900">Code</th>
                      <th className="text-center px-4 py-3 text-sm font-bold text-gray-900">Size</th>
                      {periods.map((period) => (
                        <th key={period} className="text-right px-4 py-3 text-sm font-bold text-gray-900">
                          {period}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product, index) => (
                      <tr key={`${product.productName}-${index}`} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <span className="font-medium">{toTitleCase(product.productName)}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-center text-gray-900">
                          {product.productCode || ''}
                        </td>
                        <td className="px-4 py-3 text-sm text-center text-gray-900">
                          {product.size || ''}
                        </td>
                        {periods.map((period) => (
                          <td key={period} className="px-4 py-3 text-sm text-right text-gray-900">
                            {product.periodData.get(period) || 0}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {/* Total Row */}
                    <tr className="border-t border-gray-200">
                      <td className="px-4 py-3 text-sm font-bold text-gray-900">Total</td>
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
          ) : (
            <div className="text-center py-8 text-gray-500 px-6">
              <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No product data found</p>
              <p className="text-sm mt-2">Product data may not be populated in the uploaded data</p>
            </div>
          )}
          
          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Sum of Cases by Product • Store: {customerName}
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

