import React from 'react';
import { toTitleCase } from '../lib/utils';
import { X, TrendingUp, TrendingDown, Package, Calendar, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import { AlpineSalesRecord, CustomerProgressAnalysis } from '../utils/alpineParser';

// Function to calculate Alpine customer data with all missing fields
function calculateAlpineCustomerData(alpineData: AlpineSalesRecord[], customerName: string) {
  const customerRecords = alpineData.filter(record => record.customerName === customerName);
  
  // Group by product and period
  const productData: Record<string, {
    periods: Record<string, AlpineSalesRecord[]>;
    size?: string;
    productCode?: string;
    mfgItemNumber?: string;
  }> = {};

  customerRecords.forEach(record => {
    if (!productData[record.productName]) {
      productData[record.productName] = {
        periods: {},
        size: record.size,
        productCode: record.productCode,
        mfgItemNumber: record.mfgItemNumber
      };
    }
    if (!productData[record.productName].periods[record.period]) {
      productData[record.productName].periods[record.period] = [];
    }
    productData[record.productName].periods[record.period].push(record);
  });

  // Determine available periods across ALL records for this customer (not just first product)
  const allPeriodsSet = new Set<string>();
  customerRecords.forEach(r => allPeriodsSet.add(r.period));
  const sortedPeriods = Array.from(allPeriodsSet).sort((a, b) => a.localeCompare(b));

  const purchaseRecords: CustomerPurchaseRecord[] = [];

  Object.entries(productData).forEach(([productName, data]) => {
    const currentPeriod = sortedPeriods[sortedPeriods.length - 1];
    const previousPeriod = sortedPeriods.length >= 2 ? sortedPeriods[sortedPeriods.length - 2] : currentPeriod;

    const currentRecords = data.periods[currentPeriod] || [];
    const previousRecords = data.periods[previousPeriod] || [];

    const currentQuantity = currentRecords.reduce((sum, r) => sum + r.pieces, 0);
    const currentCases = currentRecords.reduce((sum, r) => sum + r.cases, 0);
    const currentNetLbs = currentRecords.reduce((sum, r) => sum + (r.netLbs || 0), 0);
    const currentRevenue = currentRecords.reduce((sum, r) => sum + r.revenue, 0);

    const previousQuantity = previousRecords.reduce((sum, r) => sum + r.pieces, 0);
    const previousCases = previousRecords.reduce((sum, r) => sum + r.cases, 0);
    const previousNetLbs = previousRecords.reduce((sum, r) => sum + (r.netLbs || 0), 0);
    const previousRevenue = previousRecords.reduce((sum, r) => sum + r.revenue, 0);

    const quantityChange = currentQuantity - previousQuantity;
    const revenueChange = currentRevenue - previousRevenue;
    const changePercentage = previousQuantity > 0 ? (quantityChange / previousQuantity) * 100 : 
      (currentQuantity > 0 ? 100 : -100);

    let status: 'increased' | 'decreased' | 'no-change' | 'new' | 'discontinued';
    if (previousQuantity === 0 && currentQuantity > 0) {
      status = 'new';
    } else if (currentQuantity === 0 && previousQuantity > 0) {
      status = 'discontinued';
    } else if (quantityChange === 0) {
      status = 'no-change';
    } else if (quantityChange > 0) {
      status = 'increased';
    } else {
      status = 'decreased';
    }

    purchaseRecords.push({
      productName,
      size: data.size,
      productCode: data.productCode,
      mfgItemNumber: data.mfgItemNumber,
      currentQuantity,
      previousQuantity,
      currentCases,
      previousCases,
      currentNetLbs,
      previousNetLbs,
      quantityChange,
      currentRevenue,
      previousRevenue,
      revenueChange,
      changePercentage,
      status
    });
  });

  // Sort by revenue change impact
  purchaseRecords.sort((a, b) => {
    if (a.status === 'discontinued' && b.status !== 'discontinued') return -1;
    if (b.status === 'discontinued' && a.status !== 'discontinued') return 1;
    
    const aImpact = Math.abs(a.revenueChange);
    const bImpact = Math.abs(b.revenueChange);
    return bImpact - aImpact;
  });

  // Calculate totals using the same period logic as above
  const totalCurrentRevenue = customerRecords
    .filter(r => r.period === sortedPeriods[sortedPeriods.length - 1])
    .reduce((sum, r) => sum + r.revenue, 0);
  const totalPreviousRevenue = customerRecords
    .filter(r => r.period === (sortedPeriods.length >= 2 ? sortedPeriods[sortedPeriods.length - 2] : sortedPeriods[sortedPeriods.length - 1]))
    .reduce((sum, r) => sum + r.revenue, 0);
  const totalRevenueChange = totalCurrentRevenue - totalPreviousRevenue;
  const totalRevenueChangePercent = totalPreviousRevenue > 0 ? (totalRevenueChange / totalPreviousRevenue) * 100 : 0;

  const totalCurrentQuantity = customerRecords
    .filter(r => r.period === sortedPeriods[sortedPeriods.length - 1])
    .reduce((sum, r) => sum + r.pieces, 0);
  const totalPreviousQuantity = customerRecords
    .filter(r => r.period === (sortedPeriods.length >= 2 ? sortedPeriods[sortedPeriods.length - 2] : sortedPeriods[sortedPeriods.length - 1]))
    .reduce((sum, r) => sum + r.pieces, 0);

  const currentProductCount = new Set(customerRecords
    .filter(r => r.period === sortedPeriods[sortedPeriods.length - 1])
    .map(r => r.productName)).size;
  const previousProductCount = new Set(customerRecords
    .filter(r => r.period === (sortedPeriods.length >= 2 ? sortedPeriods[sortedPeriods.length - 2] : sortedPeriods[sortedPeriods.length - 1]))
    .map(r => r.productName)).size;

  return {
    purchaseRecords,
    periods: {
      current: sortedPeriods[sortedPeriods.length - 1],
      previous: sortedPeriods.length >= 2 ? sortedPeriods[sortedPeriods.length - 2] : sortedPeriods[sortedPeriods.length - 1]
    },
    totals: {
      totalCurrentRevenue,
      totalPreviousRevenue,
      totalRevenueChange,
      totalRevenueChangePercent: Math.round(totalRevenueChangePercent * 100) / 100,
      totalCurrentQuantity,
      totalPreviousQuantity,
      currentProductCount,
      previousProductCount
    }
  };
}

interface CustomerPurchaseRecord {
  productName: string;
  size?: string;
  productCode?: string;
  mfgItemNumber?: string;
  currentQuantity: number;
  previousQuantity: number;
  currentCases: number;
  previousCases: number;
  currentNetLbs: number;
  previousNetLbs: number;
  quantityChange: number;
  currentRevenue: number;
  previousRevenue: number;
  revenueChange: number;
  changePercentage: number;
  status: 'increased' | 'decreased' | 'no-change' | 'new' | 'discontinued';
}

interface CustomerDetailModalProps {
  customerName: string;
  currentInvoices: Array<{ customerName: string; productName: string; quantity: number; revenue: number; date: string }>;
  previousInvoices: Array<{ customerName: string; productName: string; quantity: number; revenue: number; date: string }>;
  isOpen: boolean;
  onClose: () => void;
  alpineData?: AlpineSalesRecord[];
  progressAnalysis?: CustomerProgressAnalysis;
  selectedMonth?: string;
  onMonthChange?: (month: string) => void;
}

const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
  customerName,
  currentInvoices,
  previousInvoices,
  isOpen,
  onClose,
  alpineData,
  progressAnalysis,
  selectedMonth,
  onMonthChange
}) => {
  const [localSelectedMonth, setLocalSelectedMonth] = React.useState<string>('');
  const [periodRange, setPeriodRange] = React.useState<{start: number, end: number} | null>(null);
  const PERIOD_WINDOW_SIZE = 3;

  // Helper function to format period as MM/YYYY
  const formatPeriodAsMMYYYY = (period: string) => {
    const [year, month] = period.split('-');
    return `${month}/${year}`;
  };

  // Get available periods for this customer
  const availablePeriods = React.useMemo(() => {
    if (alpineData && alpineData.length > 0) {
      const customerRecords = alpineData.filter(record => record.customerName === customerName);
      const periods = Array.from(new Set(customerRecords.map(r => r.period))).sort();
      return periods;
    }
    return [];
  }, [alpineData, customerName]);

  // Initialize month selection and period range
  React.useEffect(() => {
    if (availablePeriods.length > 0) {
      const defaultMonth = selectedMonth || availablePeriods[availablePeriods.length - 1];
      setLocalSelectedMonth(defaultMonth);
      
      // Initialize period range to show current month on the right
      if (availablePeriods.length > PERIOD_WINDOW_SIZE && !periodRange) {
        const currentIndex = availablePeriods.findIndex(period => period === defaultMonth);
        if (currentIndex >= 0) {
          const end = currentIndex;
          const start = Math.max(0, end - PERIOD_WINDOW_SIZE + 1);
          setPeriodRange({ start, end });
        } else {
          const start = Math.max(0, availablePeriods.length - PERIOD_WINDOW_SIZE);
          const end = availablePeriods.length - 1;
          setPeriodRange({ start, end });
        }
      }
    }
  }, [availablePeriods, selectedMonth, periodRange]);

  // Navigation functions for period range
  const navigatePeriodRange = (direction: 'left' | 'right') => {
    if (!periodRange || availablePeriods.length <= PERIOD_WINDOW_SIZE) return;
    
    let newStart, newEnd;
    if (direction === 'left') {
      newStart = Math.max(0, periodRange.start - 1);
      newEnd = Math.min(availablePeriods.length - 1, newStart + PERIOD_WINDOW_SIZE - 1);
    } else {
      newEnd = Math.min(availablePeriods.length - 1, periodRange.end + 1);
      newStart = Math.max(0, newEnd - PERIOD_WINDOW_SIZE + 1);
    }
    
    setPeriodRange({ start: newStart, end: newEnd });
  };

  // Handle month selection
  const handleMonthSelect = (month: string) => {
    setLocalSelectedMonth(month);
    if (onMonthChange) {
      onMonthChange(month);
    }
  };

  // Calculate customer-specific data
  const customerData = React.useMemo(() => {
    // Handle Alpine data vs CSV invoice data
    if (alpineData && alpineData.length > 0) {
      // If a specific month is selected, filter data to that month and the previous month
      if (localSelectedMonth && localSelectedMonth !== '') {
        const selectedIndex = availablePeriods.indexOf(localSelectedMonth);
        const previousMonth = selectedIndex > 0 ? availablePeriods[selectedIndex - 1] : localSelectedMonth;
        
        // Filter data to only include selected and previous periods
        const filteredData = alpineData.filter(record => 
          record.customerName === customerName && 
          (record.period === localSelectedMonth || record.period === previousMonth)
        );
        
        return calculateAlpineCustomerData(filteredData, customerName);
      }
      return calculateAlpineCustomerData(alpineData, customerName);
    }

    // Filter invoices for this specific customer
    const currentCustomerInvoices = currentInvoices.filter(inv => inv.customerName === customerName);
    const previousCustomerInvoices = previousInvoices.filter(inv => inv.customerName === customerName);

    // Calculate purchase records for each product
    const purchaseRecords: CustomerPurchaseRecord[] = [];
    
    // Get all unique products from both periods
    const allProducts = new Set([
      ...currentCustomerInvoices.map(inv => inv.productName),
      ...previousCustomerInvoices.map(inv => inv.productName)
    ]);

    for (const product of Array.from(allProducts)) {
      // Current period data
      const currentProductSales = currentCustomerInvoices.filter(inv => inv.productName === product);
      const currentQuantity = currentProductSales.reduce((sum, sale) => sum + sale.quantity, 0);
      const currentRevenue = currentProductSales.reduce((sum, sale) => sum + sale.revenue, 0);

      // Previous period data
      const previousProductSales = previousCustomerInvoices.filter(inv => inv.productName === product);
      const previousQuantity = previousProductSales.reduce((sum, sale) => sum + sale.quantity, 0);
      const previousRevenue = previousProductSales.reduce((sum, sale) => sum + sale.revenue, 0);

      const quantityChange = currentQuantity - previousQuantity;
      const revenueChange = currentRevenue - previousRevenue;
      const changePercentage = previousQuantity > 0 ? (quantityChange / previousQuantity) * 100 : 
        (currentQuantity > 0 ? 100 : -100);

      // Determine status
      let status: 'increased' | 'decreased' | 'no-change' | 'new' | 'discontinued';
      if (previousQuantity === 0 && currentQuantity > 0) {
        status = 'new';
      } else if (currentQuantity === 0 && previousQuantity > 0) {
        status = 'discontinued';
      } else if (quantityChange === 0) {
        status = 'no-change';
      } else if (quantityChange > 0) {
        status = 'increased';
      } else {
        status = 'decreased';
      }

      purchaseRecords.push({
        productName: product,
        currentQuantity,
        previousQuantity,
        currentCases: 0,
        previousCases: 0,
        currentNetLbs: 0,
        previousNetLbs: 0,
        quantityChange,
        currentRevenue,
        previousRevenue,
        revenueChange,
        changePercentage,
        status
      });
    }

    // Sort by revenue change (greatest increases first, then decreases)
    purchaseRecords.sort((a, b) => {
      // Prioritize discontinued products (biggest negative changes)
      if (a.status === 'discontinued' && b.status !== 'discontinued') return -1;
      if (b.status === 'discontinued' && a.status !== 'discontinued') return 1;
      
      // Then sort by revenue change amount (absolute value for decreases)
      const aImpact = Math.abs(a.revenueChange);
      const bImpact = Math.abs(b.revenueChange);
      return bImpact - aImpact;
    });

    // Calculate customer totals
    const totalCurrentRevenue = currentCustomerInvoices.reduce((sum, inv) => sum + inv.revenue, 0);
    const totalPreviousRevenue = previousCustomerInvoices.reduce((sum, inv) => sum + inv.revenue, 0);
    const totalRevenueChange = totalCurrentRevenue - totalPreviousRevenue;
    const totalRevenueChangePercent = totalPreviousRevenue > 0 ? (totalRevenueChange / totalPreviousRevenue) * 100 : 0;

    const totalCurrentQuantity = currentCustomerInvoices.reduce((sum, inv) => sum + inv.quantity, 0);
    const totalPreviousQuantity = previousCustomerInvoices.reduce((sum, inv) => sum + inv.quantity, 0);

    return {
      purchaseRecords,
      periods: {
        current: "Current",
        previous: "Previous"
      },
      totals: {
        totalCurrentRevenue,
        totalPreviousRevenue,
        totalRevenueChange,
        totalRevenueChangePercent: Math.round(totalRevenueChangePercent * 100) / 100,
        totalCurrentQuantity,
        totalPreviousQuantity,
        currentProductCount: new Set(currentCustomerInvoices.map(inv => inv.productName)).size,
        previousProductCount: new Set(previousCustomerInvoices.map(inv => inv.productName)).size
      }
    };
  }, [customerName, currentInvoices, previousInvoices, alpineData, localSelectedMonth, availablePeriods]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatNumber = (num: number, decimals: number = 2) => {
    return num.toFixed(decimals);
  };

  const getTrendIcon = (status: string, changePercentage: number) => {
    switch (status) {
      case 'increased':
      case 'new':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'decreased':
      case 'discontinued':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'increased':
      case 'new':
        return 'bg-green-100 border-green-200 text-green-800';
      case 'decreased':
      case 'discontinued':
        return 'bg-red-100 border-red-200 text-red-800';
      default:
        return 'bg-gray-100 border-gray-200 text-gray-800';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[10000]">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{customerName}</h2>
            {alpineData && alpineData.length > 0 && alpineData[0].customerId && (
              <p className="text-sm text-blue-600 font-medium">Customer ID: {alpineData[0].customerId}</p>
            )}
            <p className="text-sm text-gray-600">Purchase Comparison Analysis</p>
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

        {/* Month Navigation Controls */}
        {alpineData && alpineData.length > 0 && availablePeriods.length > 0 && (
          <div className="p-4 border-b border-gray-200 bg-blue-50">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-blue-800">Month Navigation</h4>
              <div className="flex items-center gap-3">
                {/* Navigation controls for range */}
                {availablePeriods.length > PERIOD_WINDOW_SIZE && (
                  <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border">
                    <button
                      onClick={() => navigatePeriodRange('left')}
                      className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
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
                      className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
                      disabled={!periodRange || periodRange.end === availablePeriods.length - 1}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
                
                {/* Month selection buttons */}
                <div className="flex gap-2">
                  {(periodRange ? 
                    availablePeriods.slice(periodRange.start, periodRange.end + 1) : 
                    availablePeriods
                  ).map((period) => (
                    <button
                      key={period}
                      onClick={() => handleMonthSelect(period)}
                      className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        localSelectedMonth === period
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-100 border'
                      }`}
                    >
                      {formatPeriodAsMMYYYY(period)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Customer Summary */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className={`text-lg font-bold ${
                customerData.totals.totalRevenueChange >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(customerData.totals.totalCurrentRevenue)}
              </div>
              <div className="text-xs text-gray-600">
                {alpineData && alpineData.length > 0 
                  ? formatPeriodAsMMYYYY(customerData.periods.current)
                  : customerData.periods.current
                }
              </div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-gray-700">
                {formatCurrency(customerData.totals.totalPreviousRevenue)}
              </div>
              <div className="text-xs text-gray-600">
                {alpineData && alpineData.length > 0 
                  ? formatPeriodAsMMYYYY(customerData.periods.previous)
                  : customerData.periods.previous
                }
              </div>
            </div>
            <div className="text-center">
              <div className={`text-lg font-bold ${
                customerData.totals.totalRevenueChange >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {customerData.totals.totalRevenueChange >= 0 ? '+' : ''}{formatCurrency(customerData.totals.totalRevenueChange)}
              </div>
              <div className="text-xs text-gray-600">Revenue Change</div>
            </div>
            <div className="text-center">
              <div className={`text-lg font-bold ${
                customerData.totals.totalRevenueChangePercent >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {customerData.totals.totalRevenueChangePercent >= 0 ? '+' : ''}{customerData.totals.totalRevenueChangePercent.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-600">% Change</div>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <span className="font-medium text-blue-600">{customerData.totals.currentProductCount}</span>
              <span className="text-gray-600"> Current Products</span>
            </div>
            <div className="text-center">
              <span className="font-medium text-gray-600">{customerData.totals.previousProductCount}</span>
              <span className="text-gray-600"> Previous Products</span>
            </div>
            <div className="text-center">
              <span className="font-medium text-purple-600">{customerData.totals.totalCurrentQuantity}</span>
              <span className="text-gray-600"> Current Units</span>
            </div>
            <div className="text-center">
              <span className="font-medium text-gray-600">{customerData.totals.totalPreviousQuantity}</span>
              <span className="text-gray-600"> Previous Units</span>
            </div>
          </div>

          {/* Alpine Progress Trend Summary */}
          {progressAnalysis && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4" />Customer Trends Across Alpine Periods
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-blue-700 font-medium mb-1">Status:</div>
                  <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                    progressAnalysis.trends.status === 'active' ? 'bg-green-100 text-green-800' :
                    progressAnalysis.trends.status === 'declining' ? 'bg-red-100 text-red-800' :
                    progressAnalysis.trends.status === 'emerging' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    <Users className="w-3 h-3" />
                    {progressAnalysis.trends.status.toUpperCase()}
                  </div>
                </div>
                <div>
                  <div className="text-blue-700 font-medium mb-1">Revenue:</div>
                  <div className={`flex items-center gap-1 ${
                    progressAnalysis.trends.revenueTrend === 'increasing' ? 'text-green-600' :
                    progressAnalysis.trends.revenueTrend === 'decreasing' ? 'text-red-600' :
                    'text-gray-600'
                  }`}>
                    {getTrendIcon(progressAnalysis.trends.revenueTrend, 0)}
                    {progressAnalysis.trends.revenueTrend}
                  </div>
                </div>
                <div>
                  <div className="text-blue-700 font-medium mb-1">Volume:</div>
                  <div className={`flex items-center gap-1 ${
                    progressAnalysis.trends.caseTrend === 'increasing' ? 'text-green-600' :
                    progressAnalysis.trends.caseTrend === 'decreasing' ? 'text-red-600' :
                    'text-gray-600'
                  }`}>
                    {getTrendIcon(progressAnalysis.trends.caseTrend, 0)}
                    {progressAnalysis.trends.caseTrend}
                  </div>
                </div>
                <div>
                  <div className="text-blue-700 font-medium mb-1">Products:</div>
                  <div className={`flex items-center gap-1 ${
                    progressAnalysis.trends.productTrend === 'expanding' ? 'text-green-600' :
                    progressAnalysis.trends.productTrend === 'contracting' ? 'text-red-600' :
                    'text-gray-600'
                  }`}>
                    <Package className="w-3 h-3" />
                    {progressAnalysis.trends.productTrend}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Purchase Records */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-500" />
              Product Purchase Changes
              <span className="text-sm text-gray-500">(Sorted by Impact)</span>
            </h3>
            
            <div className="space-y-3">
              {customerData.purchaseRecords.map((record, index) => (
                <div 
                  key={`${record.productName}-${index}`}
                  className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${getStatusColor(record.status)}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {getTrendIcon(record.status, record.changePercentage)}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold break-words">{toTitleCase(record.productName)}</h4>
                        {(record.size || record.productCode || record.mfgItemNumber) && (
                          <div className="text-xs text-gray-500 flex gap-2 mt-1">
                            {record.size && <span>Size: {record.size}</span>}
                            {record.productCode && <span>Code: {record.productCode}</span>}
                            {record.mfgItemNumber && <span>MFG: {record.mfgItemNumber}</span>}
                          </div>
                        )}
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                        {record.status.replace('-', ' ')}
                      </span>
                    </div>
                    <div className={`text-right ${
                      record.revenueChange >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      <div className="font-bold">
                        {record.revenueChange >= 0 ? '+' : ''}{formatCurrency(record.revenueChange)}
                      </div>
                      <div className="text-xs">Revenue Impact</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-gray-600 text-xs mb-1">
                        {alpineData && alpineData.length > 0 
                          ? formatPeriodAsMMYYYY(customerData.periods.current)
                          : customerData.periods.current
                        }
                      </div>
                      <div className="font-medium">{formatNumber(record.currentQuantity)} pieces</div>
                      {record.currentCases > 0 && <div className="text-xs text-gray-500">{formatNumber(record.currentCases, 0)} cases</div>}
                      {record.currentNetLbs > 0 && <div className="text-xs text-gray-500">{formatNumber(record.currentNetLbs)} lbs</div>}
                      <div className="text-xs text-gray-500">{formatCurrency(record.currentRevenue)}</div>
                    </div>
                    <div>
                      <div className="text-gray-600 text-xs mb-1">
                        {alpineData && alpineData.length > 0 
                          ? formatPeriodAsMMYYYY(customerData.periods.previous)
                          : customerData.periods.previous
                        }
                      </div>
                      <div className="font-medium">{formatNumber(record.previousQuantity)} pieces</div>
                      {record.previousCases > 0 && <div className="text-xs text-gray-500">{formatNumber(record.previousCases, 0)} cases</div>}
                      {record.previousNetLbs > 0 && <div className="text-xs text-gray-500">{formatNumber(record.previousNetLbs)} lbs</div>}
                      <div className="text-xs text-gray-500">{formatCurrency(record.previousRevenue)}</div>
                    </div>
                    <div>
                      <div className="text-gray-600 text-xs mb-1">Quantity Change</div>
                      <div className={`font-medium ${record.quantityChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {record.quantityChange >= 0 ? '+' : ''}{formatNumber(record.quantityChange)} pieces
                      </div>
                      {record.currentCases > 0 && record.previousCases > 0 && (
                        <div className={`text-xs ${(record.currentCases - record.previousCases) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {(record.currentCases - record.previousCases) >= 0 ? '+' : ''}{formatNumber(record.currentCases - record.previousCases, 0)} cases
                        </div>
                      )}
                      <div className={`text-xs ${record.changePercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {record.changePercentage >= 0 ? '+' : ''}{record.changePercentage.toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600 text-xs mb-1">Revenue Change</div>
                      <div className={`font-medium ${record.revenueChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {record.revenueChange >= 0 ? '+' : ''}{formatCurrency(record.revenueChange)}
                      </div>
                      <div className={`text-xs ${record.changePercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {record.changePercentage >= 0 ? '+' : ''}{record.changePercentage.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {customerData.purchaseRecords.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No purchase data found</p>
                <p className="text-sm">This customer has no invoice data for comparison</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Analysis generated from current and previous invoice data
            </div>
            <Button onClick={onClose}>
              Close Analysis
            </Button>
          </div>
        </div>
      </div>

    </div>
  );
};

export default CustomerDetailModal;