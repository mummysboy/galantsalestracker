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
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import CustomerDetailModal from './components/CustomerDetailModal';
import PeriodComparison from './components/PeriodComparison';
import AlpineReportUpload from './components/AlpineReportUpload';
import CSVUpload from './components/CSVUpload';
import { AlpineSalesRecord, analyzeCustomerProgress } from './utils/alpineParser';
import { alpineData, customerProgressions } from './data/alpineData';
import { Upload, BarChart3, ChevronDown } from 'lucide-react';

// Revenue by Customer Component
interface RevenueByCustomerProps {
  revenueByCustomer: Array<{ id: string; customer: string; fullCustomerName: string; customerId: string; revenue: number }>;
  alpineData: AlpineSalesRecord[];
  onCustomerClick?: (customerName: string) => void;
  isComparisonMode?: boolean;
}

const RevenueByCustomerComponent: React.FC<RevenueByCustomerProps> = ({ 
  revenueByCustomer, 
  alpineData,
  onCustomerClick,
  isComparisonMode = false 
}) => {
  const [showAll, setShowAll] = useState(false);
  
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
    if (onCustomerClick && isComparisonMode) {
      onCustomerClick(fullCustomerName);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Top Customers</h3>
      
      {/* Top 5 Customers */}
      <div className="space-y-3">
        {topCustomers.map((customer) => (
          <div 
            key={customer.id}
            className={`flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors ${
              isComparisonMode ? 'cursor-pointer' : ''
            }`}
            onClick={() => handleCustomerClick(customer.fullCustomerName)}
            title={isComparisonMode ? "Click to see detailed comparison" : "Customer revenue"}
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">
                  {customer.customer}
                </div>
              {customer.customerId && (
                <div className="text-xs text-blue-600 font-medium">ID: {customer.customerId}</div>
              )}
              <div className="text-xs text-gray-500">{getPercentage(customer.revenue)}% of total</div>
              </div>
            <div className="text-sm font-semibold text-gray-900">
              {formatRevenue(customer.revenue)}
            </div>
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
                  className={`flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors ${
                    isComparisonMode ? 'cursor-pointer' : ''
                  }`}
                  onClick={() => handleCustomerClick(customer.fullCustomerName)}
                  title={isComparisonMode ? "Click to see detailed comparison" : "Customer revenue"}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                    {customer.customer}
                  </div>
                  {customer.customerId && (
                    <div className="text-xs text-blue-600 font-medium">ID: {customer.customerId}</div>
                  )}
                  <div className="text-xs text-gray-500">{getPercentage(customer.revenue)}% of total</div>
                </div>
                  <div className="text-sm font-semibold text-gray-900">
                    {formatRevenue(customer.revenue)}
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
      <h3 className="text-lg font-semibold text-gray-900">Top Products</h3>
      
      {/* Top 5 Products */}
      <div className="space-y-3">
        {topProducts.map((product) => (
          <div 
            key={product.id}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">
                  {product.product}
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
                    <div className="text-sm font-medium text-gray-900 truncate">
                    {product.product}
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
  const [currentAlpineData, setCurrentAlpineData] = useState<AlpineSalesRecord[]>(alpineData);
  const [currentCustomerProgressions, setCurrentCustomerProgressions] = useState<Map<string, any>>(customerProgressions);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);
  const [lastUploadedInvoiceMonth, setLastUploadedInvoiceMonth] = useState<string | null>(null);

  // Get available periods and set default to most recent
  const availablePeriods = useMemo(() => {
    const periods = Array.from(new Set(currentAlpineData.map(r => r.period))).sort();
    return periods;
  }, [currentAlpineData]);

  // Add "All" option to periods, with most recent first
  const allPeriodOptions = useMemo(() => {
    return ['all', ...availablePeriods.reverse()];
  }, [availablePeriods]);

  // Filter data based on selected month
  const filteredAlpineData = useMemo(() => {
    if (!selectedMonth || selectedMonth === 'all') return currentAlpineData;
    return currentAlpineData.filter(record => record.period === selectedMonth);
  }, [currentAlpineData, selectedMonth]);

  // Set default month to most recent when data changes
  React.useEffect(() => {
    if (availablePeriods.length > 0 && !selectedMonth) {
      setSelectedMonth(availablePeriods[availablePeriods.length - 1]);
    }
  }, [availablePeriods, selectedMonth]);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isMonthDropdownOpen && !target.closest('.month-dropdown')) {
        setIsMonthDropdownOpen(false);
      }
    };

    if (isMonthDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMonthDropdownOpen]);

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

  const handleClearAlpineData = () => {
    console.log('Clearing Alpine data, resetting to original state');
    setCurrentAlpineData(alpineData);
    setCurrentCustomerProgressions(customerProgressions);
  };

  const handleCSVDataUploaded = (data: { currentInvoices: any[]; previousInvoices: any[] }) => {
    console.log('CSV data uploaded:', data);
    // Derive month from latest date in current invoices
    const parseToMonthYear = (isoDate: string) => {
      const d = new Date(isoDate);
      if (isNaN(d.getTime())) return null;
      const formatter = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });
      return formatter.format(d);
    };
    const latestDate = data.currentInvoices
      .map(i => i.date)
      .filter(Boolean)
      .sort()
      .slice(-1)[0];
    const monthYear = latestDate ? parseToMonthYear(latestDate) : null;
    if (monthYear) {
      setLastUploadedInvoiceMonth(monthYear);
    }
  };

  const handleClearCSVData = () => {
    // Clear CSV data if needed
    console.log('CSV data cleared');
  };

  // Calculate KPIs based on filtered data
  const kpis = useMemo(() => {
    const totalRevenue = filteredAlpineData.reduce((sum, record) => sum + record.revenue, 0);
    const totalCases = filteredAlpineData.reduce((sum, record) => sum + record.cases, 0);
    
    // Top customer by revenue
    const customerRevenue = filteredAlpineData.reduce((acc, record) => {
      acc[record.customerName] = (acc[record.customerName] || 0) + record.revenue;
      return acc;
    }, {} as Record<string, number>);
    const topCustomer = Object.entries(customerRevenue).sort(([,a], [,b]) => b - a)[0];

    // Top product by revenue
    const productRevenue = filteredAlpineData.reduce((acc, record) => {
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
  }, [filteredAlpineData]);

  // Revenue over time data (grouped by periods)
  const revenueOverTime = useMemo(() => {
    const periodRevenue = filteredAlpineData.reduce((acc, record) => {
      const period = record.period;
      acc[period] = (acc[period] || 0) + record.revenue;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(periodRevenue)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, revenue]) => ({
        period,
        revenue: Math.round(revenue * 100) / 100,
      }));
  }, [filteredAlpineData]);

  // Revenue by customer data
  const revenueByCustomer = useMemo(() => {
    const customerRevenue = filteredAlpineData.reduce((acc, record) => {
      acc[record.customerName] = (acc[record.customerName] || 0) + record.revenue;
      return acc;
    }, {} as Record<string, number>);

    const customerIds = filteredAlpineData.reduce((acc, record) => {
      acc[record.customerName] = record.customerId || '';
      return acc;
    }, {} as Record<string, string>);

    return Object.entries(customerRevenue)
      .sort(([,a], [,b]) => b - a)
      .map(([customer, revenue], index) => ({
        id: `${customer}-${index}`,
        customer: customer.length > 20 ? customer.substring(0, 20) + '...' : customer,
        fullCustomerName: customer,
        customerId: customerIds[customer] || '',
        revenue: Math.round(revenue * 100) / 100,
      }));
  }, [filteredAlpineData]);

  // Revenue by product data
  const revenueByProduct = useMemo(() => {
    const productRevenue = filteredAlpineData.reduce((acc, record) => {
      acc[record.productName] = (acc[record.productName] || 0) + record.revenue;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(productRevenue)
      .sort(([,a], [,b]) => b - a)
      .map(([product, revenue], index) => ({
        id: `${product}-${index}`,
        product: product.length > 20 ? product.substring(0, 20) + '...' : product,
        fullProduct: product,
        revenue: Math.round(revenue * 100) / 100,
      }));
  }, [filteredAlpineData]);

  // Product mix pie chart data
  const productMix = useMemo(() => {
    const total = filteredAlpineData.reduce((sum, record) => sum + record.revenue, 0);

    return revenueByProduct
      .slice(0, 8) // Top 8 products
      .map((product) => ({
        name: product.product.length > 12 ? product.product.substring(0, 12) + '...' : product.product,
        value: Math.round((product.revenue / total) * 100 * 100) / 100,
      }));
  }, [revenueByProduct, filteredAlpineData]);

  const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#F97316', '#06B6D4', '#84CC16'];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Alpine Sales Dashboard</h1>
              <div className="flex items-center gap-3 mt-2">
                <p className="text-gray-600">Alpine distributor sales analysis for</p>
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
                    <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                      <div className="py-1">
                        {allPeriodOptions.map((period) => (
                          <button
                            key={period}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setSelectedMonth(period);
                              setIsMonthDropdownOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                              selectedMonth === period ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'
                            }`}
                          >
                            {period === 'all' ? 'All Periods' : getMonthName(period)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {filteredAlpineData.length} sales records{selectedMonth !== 'all' ? ` for ${selectedMonth === 'all' ? 'all periods' : getMonthName(selectedMonth)}` : ` from ${availablePeriods.join(', ')} periods`}
              </p>
              {lastUploadedInvoiceMonth && (
                <p className="text-sm text-green-700 mt-1">Last uploaded invoice month: {lastUploadedInvoiceMonth}</p>
              )}
            </div>
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

        {/* Upload Section */}
        {showUploadSection && (
          <div className="mb-8 space-y-6">
            <AlpineReportUpload
              onDataParsed={handleAlpineDataParsed}
              onClearData={handleClearAlpineData}
              onProcessingComplete={() => setShowUploadSection(false)}
            />
            <CSVUpload
              onDataUploaded={handleCSVDataUploaded}
              onClearData={handleClearCSVData}
            />
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="flex-1">
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
                <div className="flex-1">
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
                <div className="flex-1">
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
                <div className="flex-1">
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
                <LineChart data={revenueOverTime}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                  <Tooltip 
                      formatter={(value: number) => [`$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Revenue']}
                      labelFormatter={(label) => `Period: ${label}`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                      dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
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
                    <Tooltip formatter={(value: number) => [`${value}%`, 'Percentage']} />
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
                alpineData={filteredAlpineData}
                onCustomerClick={handleCustomerClick}
                isComparisonMode={true}
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
                alpineData={filteredAlpineData}
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
            <PeriodComparison alpineData={currentAlpineData} selectedMonth={selectedMonth} />
          </CardContent>
        </Card>

        {/* Customer Detail Modal */}
        {selectedCustomerForModal && (
          <CustomerDetailModal
            customerName={selectedCustomerForModal}
            currentInvoices={[]} // Alpine data doesn't use invoice format
            previousInvoices={[]}
            isOpen={isCustomerModalOpen}
            onClose={handleCloseCustomerModal}
            alpineData={currentAlpineData}
            progressAnalysis={currentCustomerProgressions.get(selectedCustomerForModal)}
          />
        )}
      </div>
    </div>
  );
};

export default Dashboard;