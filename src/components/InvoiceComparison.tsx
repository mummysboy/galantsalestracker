import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { ArrowUp, ArrowDown, Minus, Search, Filter, Download } from 'lucide-react';

interface InvoiceComparisonData {
  customerName: string;
  productName: string;
  previousQuantity: number;
  currentQuantity: number;
  quantityChange: number;
  previousRevenue: number;
  currentRevenue: number;
  revenueChange: number;
  changePercentage: number;
  status: 'increased' | 'decreased' | 'no-change' | 'new' | 'discontinued';
}

interface InvoiceComparisonProps {
  currentInvoices: Array<{ customerName: string; productName: string; quantity: number; revenue: number; date: string }>;
  previousInvoices: Array<{ customerName: string; productName: string; quantity: number; revenue: number; date: string }>;
}

const InvoiceComparison: React.FC<InvoiceComparisonProps> = ({ 
  currentInvoices, 
  previousInvoices 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [sortField, setSortField] = useState<'customer' | 'product' | 'changePercentage'>('changePercentage');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showOnlyChanges, setShowOnlyChanges] = useState(true);

  const comparisonData = useMemo((): InvoiceComparisonData[] => {
    const results: InvoiceComparisonData[] = [];
    
    // Get all unique combinations of customer + product
    const combinations = new Set<string>();
    
    currentInvoices.forEach(inv => {
      combinations.add(`${inv.customerName}|${inv.productName}`);
    });
    previousInvoices.forEach(inv => {
      combinations.add(`${inv.customerName}|${inv.productName}`);
    });

    combinations.forEach(combination => {
      const [customerName, productName] = combination.split('|');
      
      // Current period data
      const currentSales = currentInvoices.filter(inv => 
        inv.customerName === customerName && inv.productName === productName
      );
      const currentQuantity = currentSales.reduce((sum, sale) => sum + sale.quantity, 0);
      const currentRevenue = currentSales.reduce((sum, sale) => sum + sale.revenue, 0);

      // Previous period data
      const previousSales = previousInvoices.filter(inv => 
        inv.customerName === customerName && inv.productName === productName
      );
      const previousQuantity = previousSales.reduce((sum, sale) => sum + sale.quantity, 0);
      const previousRevenue = previousSales.reduce((sum, sale) => sum + sale.revenue, 0);

      const quantityChange = currentQuantity - previousQuantity;
      const revenueChange = currentRevenue - previousRevenue;
      const changePercentage = previousRevenue !== 0 ? (revenueChange / previousRevenue) * 100 : 
        (currentRevenue > 0 ? 100 : 0);

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

      results.push({
        customerName,
        productName,
        previousQuantity,
        currentQuantity,
        quantityChange,
        previousRevenue,
        currentRevenue,
        revenueChange,
        changePercentage,
        status
      });
    });

    return results;
  }, [currentInvoices, previousInvoices]);

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    let filtered = comparisonData.filter(item => {
      const matchesSearch = !searchTerm || 
        item.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.productName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCustomer = !selectedCustomer || item.customerName === selectedCustomer;
      
      const matchesChangeFilter = !showOnlyChanges || 
        item.status !== 'no-change';
      
      return matchesSearch && matchesCustomer && matchesChangeFilter;
    });

    // Sort data
    filtered.sort((a, b) => {
      let comparison = 0;
      
      if (sortField === 'customer') {
        comparison = a.customerName.localeCompare(b.customerName);
      } else if (sortField === 'product') {
        comparison = a.productName.localeCompare(b.productName);
      } else {
        comparison = Math.abs(a.changePercentage) - Math.abs(b.changePercentage);
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [comparisonData, searchTerm, selectedCustomer, sortField, sortDirection, showOnlyChanges]);

  // Get unique customers for filter
  const uniqueCustomers = useMemo(() => {
    return Array.from(new Set(comparisonData.map(item => item.customerName))).sort();
  }, [comparisonData]);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const discontinued = comparisonData.filter(item => item.status === 'discontinued');
    const newProducts = comparisonData.filter(item => item.status === 'new');
    const increasing = comparisonData.filter(item => item.status === 'increased');
    const decreasing = comparisonData.filter(item => item.status === 'decreased');

    const totalRevenueChange = comparisonData.reduce((sum, item) => sum + item.revenueChange, 0);

    return {
      discontinued: discontinued.length,
      newProducts: newProducts.length,
      increasing: increasing.length,
      decreasing: decreasing.length,
      totalRevenueChange
    };
  }, [comparisonData]);

  const getStatusIcon = (status: string, changePercentage: number) => {
    switch (status) {
      case 'increased':
        return <ArrowUp className="w-4 h-4 text-green-600" />;
      case 'decreased':
        return <ArrowDown className="w-4 h-4 text-red-600" />;
      case 'new':
        return <ArrowUp className="w-4 h-4 text-blue-600" />;
      case 'discontinued':
        return <Minus className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'increased':
      case 'new':
        return 'bg-green-50 border-green-200';
      case 'decreased':
      case 'discontinued':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const exportData = () => {
    const csvContent = [
      ['Customer', 'Product', 'Previous Qty', 'Current Qty', 'Qty Change', 'Previous Revenue', 'Current Revenue', 'Revenue Change', 'Change %', 'Status'],
      ...filteredAndSortedData.map(item => [
        item.customerName,
        item.productName,
        item.previousQuantity,
        item.currentQuantity,
        item.quantityChange,
        item.previousRevenue,
        item.currentRevenue,
        item.revenueChange,
        item.changePercentage.toFixed(2),
        item.status
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-comparison-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Card className="bg-white shadow-lg">
      <CardHeader className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className="text-base sm:text-lg font-semibold">
            Invoice Comparison Analysis
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={exportData}
            className="text-xs"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search customers/products"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>

          <select
            value={selectedCustomer}
            onChange={(e) => setSelectedCustomer(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="">All Customers</option>
            {uniqueCustomers.map(customer => (
              <option key={customer} value={customer}>{customer}</option>
            ))}
          </select>

          <select
            value={`${sortField}-${sortDirection}`}
            onChange={(e) => {
              const [field, direction] = e.target.value.split('-');
              setSortField(field as 'customer' | 'product' | 'changePercentage');
              setSortDirection(direction as 'asc' | 'desc');
            }}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="changePercentage-desc">Change % (High to Low)</option>
            <option value="changePercentage-asc">Change % (Low to High)</option>
            <option value="customer-asc">Customer (A-Z)</option>
            <option value="product-asc">Product (A-Z)</option>
          </select>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showOnlyChanges}
              onChange={(e) => setShowOnlyChanges(e.target.checked)}
              className="rounded"
            />
            Show changes only
          </label>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 pt-0">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
          <div className="text-center bg-blue-50 p-3 rounded-lg">
            <div className="text-lg font-bold text-blue-600">{summaryStats.discontinued}</div>
            <div className="text-xs text-gray-600">Discontinued</div>
          </div>
          <div className="text-center bg-green-50 p-3 rounded-lg">
            <div className="text-lg font-bold text-green-600">{summaryStats.newProducts}</div>
            <div className="text-xs text-gray-600">New Products</div>
          </div>
          <div className="text-center bg-green-50 p-3 rounded-lg">
            <div className="text-lg font-bold text-green-600">{summaryStats.increasing}</div>
            <div className="text-xs text-gray-600">Increasing</div>
          </div>
          <div className="text-center bg-red-50 p-3 rounded-lg">
            <div className="text-lg font-bold text-red-600">{summaryStats.decreasing}</div>
            <div className="text-xs text-gray-600">Decreasing</div>
          </div>
          <div className="text-center bg-purple-50 p-3 rounded-lg col-span-2">
            <div className={`text-lg font-bold ${summaryStats.totalRevenueChange < 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(summaryStats.totalRevenueChange)}
            </div>
            <div className="text-xs text-gray-600">Total Revenue Change</div>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left p-3 font-medium">Customer</th>
                <th className="text-left p-3 font-medium">Product</th>
                <th className="text-center p-3 font-medium">Previous</th>
                <th className="text-center p-3 font-medium">Current</th>
                <th className="text-center p-3 font-medium">Change</th>
                <th className="text-right p-3 font-medium">Revenue Impact</th>
                <th className="text-center p-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedData.map((item, index) => (
                <tr key={`${item.customerName}-${item.productName}-${index}`} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-3 font-medium truncate max-w-[150px]" title={item.customerName}>
                    {item.customerName}
                  </td>
                  <td className="p-3 truncate max-w-[150px]" title={item.productName}>
                    {item.productName}
                  </td>
                  <td className="p-3 text-center">{item.previousQuantity}</td>
                  <td className="p-3 text-center font-medium">{item.currentQuantity}</td>
                  <td className={`p-3 text-center font-medium ${item.quantityChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {item.quantityChange >= 0 ? '+' : ''}{item.quantityChange}
                  </td>
                  <td className={`p-3 text-right font-medium ${item.revenueChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {item.revenueChange >= 0 ? '+' : ''}{formatCurrency(item.revenueChange)}
                  </td>
                  <td className="p-3 text-center">
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${getStatusColor(item.status)}`}>
                      {getStatusIcon(item.status, item.changePercentage)}
                      <span className="capitalize">{item.status}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredAndSortedData.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p className="text-lg font-medium">No data found</p>
              <p className="text-sm">Try adjusting your filters or search terms</p>
            </div>
          )}

          {filteredAndSortedData.length > 0 && (
            <div className="text-center py-4 text-gray-500 text-sm border-t mt-4">
              Showing {filteredAndSortedData.length} of {comparisonData.length} products
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default InvoiceComparison;
