import React from 'react';
import { toTitleCase } from '../lib/utils';
import { X, Download } from 'lucide-react';
import { Button } from './ui/button';
import { AlpineSalesRecord } from '../utils/alpineParser';
import { getItemNumberForProduct } from '../utils/productMapping';

interface MhdCustomerDetailModalProps {
  retailerName: string;
  mhdData: AlpineSalesRecord[];
  isOpen: boolean;
  onClose: () => void;
  selectedMonth?: string;
}

const MhdCustomerDetailModal: React.FC<MhdCustomerDetailModalProps> = ({
  retailerName,
  mhdData,
  isOpen,
  onClose,
  selectedMonth,
}) => {
  const [localSelectedMonth, setLocalSelectedMonth] = React.useState<string>('');
  const [filterText, setFilterText] = React.useState<string>('');
  const [viewMode, setViewMode] = React.useState<'month' | 'quarter'>('month');

  // Get available periods for this customer
  const availablePeriods = React.useMemo(() => {
    const customerRecords = mhdData.filter(record => record.customerName === retailerName);
    const periods = Array.from(new Set(customerRecords.map(r => r.period))).sort();
    return periods;
  }, [mhdData, retailerName]);

  // Initialize month selection
  React.useEffect(() => {
    if (availablePeriods.length > 0) {
      const defaultMonth = selectedMonth || availablePeriods[availablePeriods.length - 1];
      setLocalSelectedMonth(defaultMonth);
    }
  }, [availablePeriods, selectedMonth]);

  // Calculate product data for the selected period
  const productData = React.useMemo(() => {
    if (!localSelectedMonth) return [];
    
    const customerRecords = mhdData.filter(record => 
      record.customerName === retailerName && record.period === localSelectedMonth
    );

    // Group by product
    const productMap = new Map<string, {
      productName: string;
      itemNumber: string;
      vendorCode: string;
      totalCases: number;
      totalPieces: number;
      totalRevenue: number;
    }>();

    customerRecords.forEach(record => {
      const key = record.productName;
      if (!productMap.has(key)) {
        productMap.set(key, {
          productName: record.productName,
          itemNumber: getItemNumberForProduct(record.productName) || '',
          vendorCode: record.productCode || '',
          totalCases: 0,
          totalPieces: 0,
          totalRevenue: 0
        });
      }
      
      const product = productMap.get(key)!;
      product.totalCases += record.cases;
      product.totalPieces += record.pieces;
      product.totalRevenue += record.revenue;
    });

    return Array.from(productMap.values()).sort((a, b) => a.productName.localeCompare(b.productName));
  }, [mhdData, retailerName, localSelectedMonth]);

  // Filter products based on search text
  const filteredProducts = React.useMemo(() => {
    if (!filterText.trim()) return productData;
    
    const searchLower = filterText.toLowerCase();
    return productData.filter(product => 
      product.productName.toLowerCase().includes(searchLower) ||
      product.itemNumber.toLowerCase().includes(searchLower) ||
      product.vendorCode.toLowerCase().includes(searchLower)
    );
  }, [productData, filterText]);

  // Calculate totals
  const totals = React.useMemo(() => {
    return filteredProducts.reduce((acc, product) => ({
      totalCases: acc.totalCases + product.totalCases,
      totalPieces: acc.totalPieces + product.totalPieces,
      totalRevenue: acc.totalRevenue + product.totalRevenue
    }), { totalCases: 0, totalPieces: 0, totalRevenue: 0 });
  }, [filteredProducts]);

  // Helper function to format period as MM/YYYY
  const formatPeriodAsMMYYYY = (period: string) => {
    const [year, month] = period.split('-');
    return `${month}/${year}`;
  };

  // Export to CSV
  const exportToCSV = () => {
    const csvContent = [
      ['Product', 'Item #', 'Vendor Code', formatPeriodAsMMYYYY(localSelectedMonth)],
      ...filteredProducts.map(product => [
        product.productName,
        product.itemNumber,
        product.vendorCode,
        product.totalCases.toString()
      ]),
      ['Total', '', '', totals.totalCases.toString()]
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${retailerName}_${localSelectedMonth}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[10000]">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-base font-medium text-gray-900">
            {retailerName} • All Invoices
          </h2>
          <div className="flex items-center gap-2">
            <Button
              onClick={exportToCSV}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1.5 h-auto"
            >
              <Download className="w-3 h-3 mr-1" />
              CSV
            </Button>
            <input
              type="text"
              placeholder="Filter by product, item #"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="px-2 py-1.5 border border-gray-300 rounded text-sm w-48 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-semibold text-gray-900 text-sm">Product</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-900 text-sm">Item #</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-900 text-sm">Vendor Code</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-900 text-sm">
                    {localSelectedMonth ? formatPeriodAsMMYYYY(localSelectedMonth) : 'Period'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product, index) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="py-2 px-3 text-gray-900 text-sm">{toTitleCase(product.productName)}</td>
                    <td className="py-2 px-3 text-gray-600 text-sm">{product.itemNumber}</td>
                    <td className="py-2 px-3 text-gray-600 text-sm">{product.vendorCode}</td>
                    <td className="py-2 px-3 text-right text-gray-900 text-sm">
                      {product.totalCases}
                    </td>
                  </tr>
                ))}
                {filteredProducts.length > 0 && (
                  <tr className="border-t border-gray-200">
                    <td className="py-2 px-3 font-semibold text-gray-900 text-sm">Total</td>
                    <td className="py-2 px-3"></td>
                    <td className="py-2 px-3"></td>
                    <td className="py-2 px-3 text-right font-semibold text-gray-900 text-sm">
                      {totals.totalCases}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {filteredProducts.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p className="text-lg font-medium">No data found</p>
                <p className="text-sm">
                  {filterText ? 'No products match your filter criteria' : 'No sales data available for this period'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Sum of Cases by Product • Columns = Months
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setViewMode('month')}
                className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                  viewMode === 'month'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Month
              </button>
              <button
                onClick={() => setViewMode('quarter')}
                className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                  viewMode === 'quarter'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Quarter
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MhdCustomerDetailModal;