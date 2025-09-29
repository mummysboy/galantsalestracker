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

// Revenue by Customer Component
interface RevenueByCustomerProps {
  revenueByCustomer: Array<{ customer: string; fullCustomerName: string; revenue: number }>;
  salesData: Array<{ customerName: string; productName: string; revenue: number; quantity: number }>;
}

const RevenueByCustomerComponent: React.FC<RevenueByCustomerProps> = ({ revenueByCustomer, salesData }) => {
  const [showAll, setShowAll] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  
  const topCustomers = revenueByCustomer.slice(0, 5);
  const remainingCustomers = revenueByCustomer.slice(5);
  const totalRevenue = revenueByCustomer.reduce((sum, customer) => sum + customer.revenue, 0);
  
  const formatRevenue = (revenue: number) => {
    return `$${revenue.toLocaleString()}`;
  };

  const getPercentage = (revenue: number) => {
    return ((revenue / totalRevenue) * 100).toFixed(1);
  };

  // Get top products for a customer
  const getTopProductsForCustomer = (customerName: string) => {
    const customerSales = salesData.filter(sale => sale.customerName === customerName);
    const productRevenue = customerSales.reduce((acc, sale) => {
      acc[sale.productName] = (acc[sale.productName] || 0) + sale.revenue;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(productRevenue)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([product, revenue], index) => ({
        id: `${customerName}-${product}-${index}-${revenue}`,
        product: product.length > 20 ? product.substring(0, 20) + '...' : product,
        fullProduct: product,
        revenue: Math.round(revenue * 100) / 100,
      }));
  };

  const handleCustomerClick = (fullCustomerName: string, event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setSelectedCustomer(fullCustomerName);
    // Position dropdown in viewport with better spacing
    const dropdownTop = Math.min(rect.bottom + 8, window.innerHeight - 350);
    const dropdownLeft = Math.min(rect.left, window.innerWidth - 320);
    
    setDropdownPosition({
      top: dropdownTop,
      left: dropdownLeft
    });
  };

  const closeDropdown = () => {
    setSelectedCustomer(null);
    setDropdownPosition(null);
  };

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectedCustomer && dropdownPosition) {
        const target = event.target as Element;
        // Don't close if clicking on the dropdown itself
        if (!target.closest('.customer-dropdown')) {
          closeDropdown();
        }
      }
    };

    if (selectedCustomer) {
      // Use a small delay to prevent immediate closing
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);
      
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [selectedCustomer, dropdownPosition]);

  return (
    <div className="space-y-3 sm:space-y-4 relative">
      {/* Top 5 Customers */}
      <div className="space-y-2 sm:space-y-3">
        {topCustomers.map((customer, index) => (
          <div key={`top-${customer.fullCustomerName}-${index}`} className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
              <div className="flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 text-blue-600 rounded-full font-semibold text-xs sm:text-sm flex-shrink-0">
                {index + 1}
              </div>
              <div className="min-w-0 flex-1">
                <div 
                  className="font-medium text-gray-900 text-sm sm:text-base truncate cursor-pointer hover:text-blue-600 transition-colors hover:bg-blue-50 px-2 py-1 rounded-md -mx-2 -my-1"
                  onClick={(e) => handleCustomerClick(customer.fullCustomerName, e)}
                  title="Click to see top products"
                >
                  {customer.customer}
                </div>
                <div className="text-xs sm:text-sm text-gray-500">{getPercentage(customer.revenue)}% of total</div>
              </div>
            </div>
            <div className="text-right flex-shrink-0 ml-2">
              <div className="font-semibold text-green-600 text-sm sm:text-base">{formatRevenue(customer.revenue)}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Show More/Less Button */}
      {remainingCustomers.length > 0 && (
        <div className="border-t pt-3 sm:pt-4">
          <Button
            variant="outline"
            onClick={() => setShowAll(!showAll)}
            className="w-full text-xs sm:text-sm"
          >
            {showAll ? 'Show Less' : `Show ${remainingCustomers.length} More`}
          </Button>
        </div>
      )}

      {/* Remaining Customers (Collapsible) */}
      {showAll && remainingCustomers.length > 0 && (
        <div className="space-y-2 border-t pt-3 sm:pt-4">
          {remainingCustomers.map((customer, index) => (
            <div key={`remaining-${customer.fullCustomerName}-${index}`} className="flex items-center justify-between p-2 bg-gray-25 rounded">
              <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                <div className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 bg-gray-100 text-gray-600 rounded-full font-medium text-xs flex-shrink-0">
                  {index + 6}
                </div>
                <div className="min-w-0 flex-1">
                  <div 
                    className="text-xs sm:text-sm font-medium text-gray-700 truncate cursor-pointer hover:text-blue-600 transition-colors hover:bg-blue-50 px-2 py-1 rounded-md -mx-2 -my-1"
                    onClick={(e) => handleCustomerClick(customer.fullCustomerName, e)}
                    title="Click to see top products"
                  >
                    {customer.customer}
                  </div>
                  <div className="text-xs text-gray-500">{getPercentage(customer.revenue)}% of total</div>
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-2">
                <div className="text-xs sm:text-sm font-medium text-green-600">{formatRevenue(customer.revenue)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 pt-3 sm:pt-4 border-t">
        <div className="text-center">
          <div className="text-lg sm:text-2xl font-bold text-blue-600">{revenueByCustomer.length}</div>
          <div className="text-xs sm:text-sm text-gray-500">Total Customers</div>
        </div>
        <div className="text-center">
          <div className="text-lg sm:text-2xl font-bold text-green-600">{formatRevenue(totalRevenue)}</div>
          <div className="text-xs sm:text-sm text-gray-500">Total Revenue</div>
        </div>
      </div>

      {/* Customer Products Dropdown */}
      {selectedCustomer && dropdownPosition && (
          <div
            className="customer-dropdown fixed z-[9999] bg-white border border-gray-200 rounded-lg shadow-xl p-4 min-w-[300px] max-w-[400px] animate-in fade-in-0 zoom-in-95 duration-200"
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
            }}
          >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 text-sm">
              Top Products - {selectedCustomer}
            </h3>
            <button
              onClick={closeDropdown}
              className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-1 transition-colors"
              title="Close"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="space-y-2">
            {getTopProductsForCustomer(selectedCustomer).map((product, index) => (
              <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer group">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-6 h-6 bg-gradient-to-br from-orange-100 to-orange-200 text-orange-700 rounded-full font-semibold text-xs shadow-sm">
                    {index + 1}
                  </div>
                  <span className="text-sm font-medium text-gray-900 truncate group-hover:text-gray-700" title={product.fullProduct}>
                    {product.product}
                  </span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-sm font-semibold text-green-600">
                    ${product.revenue.toLocaleString()}
                  </span>
                  <span className="text-xs text-gray-500">
                    Revenue
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Revenue by Product Component
interface RevenueByProductProps {
  revenueByProduct: Array<{ id: string; product: string; fullProduct: string; revenue: number }>;
  salesData: Array<{ customerName: string; productName: string; revenue: number; quantity: number }>;
}

const RevenueByProductComponent: React.FC<RevenueByProductProps> = ({ revenueByProduct, salesData }) => {
  const [showAll, setShowAll] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  
  const topProducts = revenueByProduct.slice(0, 5);
  const remainingProducts = revenueByProduct.slice(5);
  const totalRevenue = revenueByProduct.reduce((sum, product) => sum + product.revenue, 0);
  
  const formatRevenue = (revenue: number) => {
    return `$${revenue.toLocaleString()}`;
  };

  const getPercentage = (revenue: number) => {
    return ((revenue / totalRevenue) * 100).toFixed(1);
  };

  // Get top customers for a product
  const getTopCustomersForProduct = (productName: string) => {
    const productSales = salesData.filter(sale => sale.productName === productName);
    const customerRevenue = productSales.reduce((acc, sale) => {
      acc[sale.customerName] = (acc[sale.customerName] || 0) + sale.revenue;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(customerRevenue)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([customer, revenue], index) => ({
        id: `${productName}-${customer}-${index}-${revenue}`,
        customer: customer.length > 20 ? customer.substring(0, 20) + '...' : customer,
        fullCustomer: customer,
        revenue: Math.round(revenue * 100) / 100,
      }));
  };

  const handleProductClick = (fullProductName: string, event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setSelectedProduct(fullProductName);
    
    // Mobile-first positioning logic
    const isMobile = window.innerWidth < 768;
    const dropdownWidth = isMobile ? Math.min(320, window.innerWidth - 32) : 400;
    const dropdownHeight = isMobile ? 280 : 350;
    
    // Calculate optimal position
    let dropdownTop, dropdownLeft;
    
    if (isMobile) {
      // On mobile, center the dropdown and position it below the element
      dropdownTop = Math.min(rect.bottom + 8, window.innerHeight - dropdownHeight - 16);
      dropdownLeft = Math.max(16, (window.innerWidth - dropdownWidth) / 2);
    } else {
      // On desktop, position relative to the clicked element
      dropdownTop = Math.min(rect.bottom + 8, window.innerHeight - dropdownHeight);
      dropdownLeft = Math.min(rect.left, window.innerWidth - dropdownWidth);
    }
    
    setDropdownPosition({
      top: dropdownTop,
      left: dropdownLeft
    });
  };

  const closeDropdown = () => {
    setSelectedProduct(null);
    setDropdownPosition(null);
  };

  // Close dropdown when clicking outside or pressing escape
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (selectedProduct && dropdownPosition) {
        const target = event.target as Element;
        // Don't close if clicking on the dropdown itself
        if (!target.closest('.product-dropdown')) {
          closeDropdown();
        }
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && selectedProduct) {
        closeDropdown();
      }
    };

    if (selectedProduct) {
      // Use a small delay to prevent immediate closing
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);
        document.addEventListener('keydown', handleEscapeKey);
      }, 100);
      
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
        document.removeEventListener('keydown', handleEscapeKey);
      };
    }
  }, [selectedProduct, dropdownPosition]);

  return (
    <div className="space-y-3 sm:space-y-4 relative">
      {/* Top 5 Products */}
      <div className="space-y-2 sm:space-y-3">
        {topProducts.map((product, index) => (
          <div key={product.id} className="flex items-center justify-between p-2 sm:p-3 bg-orange-50 rounded-lg">
            <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
              <div className="flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 bg-orange-100 text-orange-600 rounded-full font-semibold text-xs sm:text-sm flex-shrink-0">
                {index + 1}
              </div>
              <div className="min-w-0 flex-1">
                <div 
                  className="font-medium text-gray-900 text-sm sm:text-base truncate cursor-pointer hover:text-orange-600 active:text-orange-700 transition-colors hover:bg-orange-100 active:bg-orange-200 px-3 py-2 rounded-md -mx-2 -my-1 touch-manipulation select-none"
                  onClick={(e) => handleProductClick(product.fullProduct, e)}
                  title="Tap to see top customers"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleProductClick(product.fullProduct, e as any);
                    }
                  }}
                >
                  {product.product}
                </div>
                <div className="text-xs sm:text-sm text-gray-500">{getPercentage(product.revenue)}% of total</div>
              </div>
            </div>
            <div className="text-right flex-shrink-0 ml-2">
              <div className="font-semibold text-green-600 text-sm sm:text-base">{formatRevenue(product.revenue)}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Show More/Less Button */}
      {remainingProducts.length > 0 && (
        <div className="border-t pt-3 sm:pt-4">
          <Button
            variant="outline"
            onClick={() => setShowAll(!showAll)}
            className="w-full text-xs sm:text-sm"
          >
            {showAll ? 'Show Less' : `Show ${remainingProducts.length} More`}
          </Button>
        </div>
      )}

      {/* Remaining Products (Collapsible) */}
      {showAll && remainingProducts.length > 0 && (
        <div className="space-y-2 border-t pt-3 sm:pt-4">
          {remainingProducts.map((product, index) => (
            <div key={product.id} className="flex items-center justify-between p-2 bg-gray-25 rounded">
              <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                <div className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 bg-gray-100 text-gray-600 rounded-full font-medium text-xs flex-shrink-0">
                  {index + 6}
                </div>
                <div className="min-w-0 flex-1">
                  <div 
                    className="text-xs sm:text-sm font-medium text-gray-700 truncate cursor-pointer hover:text-orange-600 active:text-orange-700 transition-colors hover:bg-orange-100 active:bg-orange-200 px-3 py-2 rounded-md -mx-2 -my-1 touch-manipulation select-none"
                    onClick={(e) => handleProductClick(product.fullProduct, e)}
                    title="Tap to see top customers"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleProductClick(product.fullProduct, e as any);
                      }
                    }}
                  >
                    {product.product}
                  </div>
                  <div className="text-xs text-gray-500">{getPercentage(product.revenue)}% of total</div>
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-2">
                <div className="text-xs sm:text-sm font-medium text-green-600">{formatRevenue(product.revenue)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 pt-3 sm:pt-4 border-t">
        <div className="text-center">
          <div className="text-lg sm:text-2xl font-bold text-orange-600">{revenueByProduct.length}</div>
          <div className="text-xs sm:text-sm text-gray-500">Total Products</div>
        </div>
        <div className="text-center">
          <div className="text-lg sm:text-2xl font-bold text-green-600">{formatRevenue(totalRevenue)}</div>
          <div className="text-xs sm:text-sm text-gray-500">Total Revenue</div>
        </div>
      </div>

      {/* Product Customers Dropdown */}
      {selectedProduct && dropdownPosition && (
        <div
          className="product-dropdown fixed z-[9999] bg-white border border-gray-200 rounded-lg shadow-xl p-3 sm:p-4 w-[calc(100vw-32px)] sm:min-w-[300px] sm:max-w-[400px] animate-in fade-in-0 zoom-in-95 duration-200 backdrop-blur-sm"
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: window.innerWidth < 768 ? 'calc(100vw - 32px)' : 'auto',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate pr-2">
              Top Customers - {selectedProduct}
            </h3>
            <button
              onClick={closeDropdown}
              className="text-gray-400 hover:text-gray-600 active:text-gray-800 hover:bg-gray-100 active:bg-gray-200 rounded-full p-2 transition-colors touch-manipulation flex-shrink-0"
              title="Close"
              aria-label="Close dropdown"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="space-y-2 max-h-48 sm:max-h-64 overflow-y-auto">
            {getTopCustomersForProduct(selectedProduct).map((customer, index) => (
              <div key={customer.id} className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors cursor-pointer group touch-manipulation">
                <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                  <div className="flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700 rounded-full font-semibold text-xs sm:text-sm shadow-sm flex-shrink-0">
                    {index + 1}
                  </div>
                  <span className="text-sm sm:text-base font-medium text-gray-900 truncate group-hover:text-gray-700" title={customer.fullCustomer}>
                    {customer.customer}
                  </span>
                </div>
                <div className="flex flex-col items-end flex-shrink-0 ml-2">
                  <span className="text-sm sm:text-base font-semibold text-green-600">
                    ${customer.revenue.toLocaleString()}
                  </span>
                  <span className="text-xs text-gray-500">
                    Revenue
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Mock Data Generation
const customers = [
  { id: 1, name: 'Fresh Market Co.', region: 'North' },
  { id: 2, name: 'Organic Foods Ltd.', region: 'South' },
  { id: 3, name: 'Green Valley Grocers', region: 'East' },
  { id: 4, name: 'Farm Fresh Distributors', region: 'West' },
  { id: 5, name: 'Natural Choice Markets', region: 'Central' },
  // Alpine customers from August 2025 sales report
  { id: 6, name: 'Capitol Distributing, Inc', region: 'Northwest' },
  { id: 7, name: 'Coffee Warehouse Inc., The', region: 'Northwest' },
  { id: 8, name: 'Core-Mark, Intern\'l Clackamas', region: 'Northwest' },
  { id: 9, name: 'Core-Mark Intern\'l Spokane', region: 'Northwest' },
  { id: 10, name: 'Core-Mark, Intern\'l Hayward', region: 'California' },
  { id: 11, name: 'Core-Mark Intern\'l Bakersfield', region: 'California' },
  { id: 12, name: 'Cotati Brand Eggs,Inc-Cotati', region: 'California' },
  { id: 13, name: '*Galant Enterprises Inc', region: 'Internal' },
  { id: 14, name: 'Dairy Fresh Farms-Port Angeles', region: 'Northwest' },
  { id: 15, name: 'Dairy Valley Distributors', region: 'California' },
  { id: 16, name: 'Harbor Wholesale Grocery Lacey', region: 'Northwest' },
  { id: 17, name: 'Glacier Wholesalers, Inc MT', region: 'Mountain' },
  { id: 18, name: 'Harbor Wholesale - MDC Modesto', region: 'California' },
  { id: 19, name: 'Harbor Wholesale Grocery Roseb', region: 'California' },
  { id: 20, name: 'Pete\'s Milk Delivery', region: 'California' },
  { id: 21, name: 'Rogge Produce', region: 'Northwest' },
  { id: 22, name: 'Stebo\'s Foodservice- Longview', region: 'Northwest' },
  { id: 23, name: 'UNFI Centralia Div-Frozen', region: 'Northwest' },
  { id: 24, name: 'UNFI Stockton Frozen', region: 'California' },
  { id: 25, name: 'U.R.M. Food Service-Frozen', region: 'California' },
  { id: 26, name: 'Vern\'s Dist Hermiston', region: 'Northwest' },
  // BiRite customers from 2024 sales data
  { id: 27, name: '18th Street Commissary', region: 'California' },
  { id: 28, name: 'Alvarado Brewery - Salinas', region: 'California' },
  { id: 29, name: 'Apple - AP01', region: 'California' },
  { id: 30, name: 'August Hall', region: 'California' },
  { id: 31, name: 'Boichik Bagels - Retail', region: 'California' },
  { id: 32, name: 'Burlingame Country Club', region: 'California' },
  { id: 33, name: 'Cheese Factory, The', region: 'California' },
  { id: 34, name: 'Coffee Cultures SF', region: 'California' },
  { id: 35, name: 'Depot Cafe & Bookstore', region: 'California' },
  { id: 36, name: 'Eiko\'s', region: 'California' },
  { id: 37, name: 'Island Savoy Market', region: 'California' },
  { id: 38, name: 'Ladle & Leaf - 1 CAL', region: 'California' },
  { id: 39, name: 'Ladle & Leaf - 580 CAL', region: 'California' },
  { id: 40, name: 'Ladle & Leaf - Battery', region: 'California' },
  { id: 41, name: 'Ladle & Leaf - Crocker G', region: 'California' },
  { id: 42, name: 'Ladle & Leaf - Montgomery', region: 'California' },
  { id: 43, name: 'Model Bakery The - Napa', region: 'California' },
  { id: 44, name: 'Model Bakery The - St He', region: 'California' },
  { id: 45, name: 'Napa Farms Market Int\'l', region: 'California' },
  { id: 46, name: 'Napa Farms Market T2', region: 'California' },
  { id: 47, name: 'Postscript', region: 'California' },
  { id: 48, name: 'Proper Food - Commissary', region: 'California' },
  { id: 49, name: 'Proper Food SFO', region: 'California' },
  { id: 50, name: 'Publico Urban Taqueria', region: 'California' },
  { id: 51, name: 'Servers Standing - S/M', region: 'California' },
  { id: 52, name: 'Solage Calistoga', region: 'California' },
  { id: 53, name: 'Tutus Food & Drink', region: 'California' },
  { id: 54, name: 'Velo Vino / Clif Family WN', region: 'California' },
];

const products = [
  { id: 1, name: 'Organic Pasta', category: 'Grains', price: 3.99 },
  { id: 2, name: 'Artisan Bread', category: 'Bakery', price: 4.50 },
  { id: 3, name: 'Premium Olive Oil', category: 'Oils', price: 12.99 },
  { id: 4, name: 'Aged Cheese', category: 'Dairy', price: 8.75 },
  { id: 5, name: 'Craft Sauce', category: 'Condiments', price: 6.25 },
  { id: 6, name: 'Specialty Rice', category: 'Grains', price: 5.50 },
  { id: 7, name: 'Gourmet Crackers', category: 'Snacks', price: 7.99 },
  { id: 8, name: 'Herbal Tea', category: 'Beverages', price: 9.25 },
  { id: 9, name: 'Natural Honey', category: 'Sweeteners', price: 11.50 },
  { id: 10, name: 'Protein Bars', category: 'Health', price: 15.99 },
  // Alpine products from August 2025 sales report
  { id: 11, name: 'GAL BAGEL DOG POLISH SSG', category: 'Frozen Foods', price: 4.56 },
  { id: 12, name: 'GAL BAGEL DOG JALA CHS', category: 'Frozen Foods', price: 4.56 },
  { id: 13, name: 'GAL BAGEL DOG POLISH', category: 'Frozen Foods', price: 4.58 },
  { id: 14, name: 'GAL BURR BRKFST BACON', category: 'Frozen Foods', price: 5.10 },
  { id: 15, name: 'GAL BURR BRKFST SAUSAGE', category: 'Frozen Foods', price: 5.10 },
  { id: 16, name: 'GAL BAGEL DOG BEEF', category: 'Frozen Foods', price: 4.58 },
  { id: 17, name: 'GAL BAGEL DOG BEEF FRANK', category: 'Frozen Foods', price: 4.56 },
  { id: 18, name: 'GAL PIROSHKI BEEF CHS N/S', category: 'Frozen Foods', price: 5.28 },
  { id: 19, name: 'GAL PIROS BF CHS 4.5Z N/S', category: 'Frozen Foods', price: 4.84 },
  { id: 20, name: 'GAL WRAP CHIC BAC RAN C/O', category: 'Frozen Foods', price: 5.08 },
  { id: 21, name: 'GAL SAND BRKFST CHORIZO', category: 'Frozen Foods', price: 7.28 },
  { id: 22, name: 'GAL BURR BFST CHORIZO', category: 'Frozen Foods', price: 5.10 },
  { id: 23, name: 'GAL BURR BRKFST VERDE', category: 'Frozen Foods', price: 5.10 },
  { id: 24, name: 'GAL SAND PROV PESTO', category: 'Frozen Foods', price: 9.00 },
  { id: 25, name: 'GAL SAND SSG TURKEY', category: 'Frozen Foods', price: 7.28 },
  { id: 26, name: 'GAL SAND BRKFST BACON', category: 'Frozen Foods', price: 5.10 },
  // BiRite products from 2024 sales data
  { id: 27, name: 'Mango Gold', category: 'Beverages', price: 4.50 },
  { id: 28, name: 'Peach Ginger', category: 'Beverages', price: 4.50 },
  { id: 29, name: 'Peach Ginger Probiot', category: 'Beverages', price: 4.75 },
  { id: 30, name: 'Pineapple Organic', category: 'Beverages', price: 4.75 },
  { id: 31, name: 'Rasp Lychee Organic', category: 'Beverages', price: 4.75 },
  { id: 32, name: 'Strawberry Passn Org', category: 'Beverages', price: 4.75 },
  { id: 33, name: 'Guava Rose', category: 'Beverages', price: 4.50 },
  { id: 34, name: 'Guava Rose Probiotic', category: 'Beverages', price: 4.75 },
  { id: 35, name: 'Pineapple Paradise', category: 'Beverages', price: 4.50 },
  { id: 36, name: 'Strawberry Passion', category: 'Beverages', price: 4.50 },
];

// Alpine August 2025 sales data from the report
const alpineSalesData = [
  // Capitol Distributing, Inc
  { customerName: 'Capitol Distributing, Inc', productName: 'GAL BAGEL DOG POLISH SSG', cases: 9, pieces: 33.75, revenue: 153.90 },
  { customerName: 'Capitol Distributing, Inc', productName: 'GAL BAGEL DOG JALA CHS', cases: 16, pieces: 60.00, revenue: 273.60 },
  
  // Coffee Warehouse Inc., The
  { customerName: 'Coffee Warehouse Inc., The', productName: 'GAL BAGEL DOG POLISH', cases: 10, pieces: 60.00, revenue: 274.80 },
  { customerName: 'Coffee Warehouse Inc., The', productName: 'GAL BURR BRKFST BACON', cases: 46, pieces: 276.00, revenue: 1407.60 },
  { customerName: 'Coffee Warehouse Inc., The', productName: 'GAL BURR BRKFST SAUSAGE', cases: 37, pieces: 222.00, revenue: 1132.20 },
  
  // Core-Mark, Intern'l Clackamas
  { customerName: 'Core-Mark, Intern\'l Clackamas', productName: 'GAL BAGEL DOG BEEF', cases: 32, pieces: 192.00, revenue: 685.73 },
  { customerName: 'Core-Mark, Intern\'l Clackamas', productName: 'GAL BAGEL DOG POLISH', cases: 64, pieces: 384.00, revenue: 1573.76 },
  
  // Core-Mark Intern'l Spokane
  { customerName: 'Core-Mark Intern\'l Spokane', productName: 'GAL BAGEL DOG BEEF FRANK', cases: 5, pieces: 18.75, revenue: 85.50 },
  { customerName: 'Core-Mark Intern\'l Spokane', productName: 'GAL BAGEL DOG POLISH SSG', cases: 5, pieces: 18.75, revenue: 85.50 },
  { customerName: 'Core-Mark Intern\'l Spokane', productName: 'GAL BAGEL DOG JALA CHS', cases: 5, pieces: 18.75, revenue: 85.50 },
  
  // Core-Mark, Intern'l Hayward
  { customerName: 'Core-Mark, Intern\'l Hayward', productName: 'GAL BAGEL DOG BEEF FRANK', cases: 5, pieces: 18.75, revenue: 85.50 },
  { customerName: 'Core-Mark, Intern\'l Hayward', productName: 'GAL BAGEL DOG POLISH SSG', cases: 10, pieces: 37.50, revenue: 171.00 },
  { customerName: 'Core-Mark, Intern\'l Hayward', productName: 'GAL BAGEL DOG JALA CHS', cases: 5, pieces: 18.75, revenue: 85.50 },
  
  // Core-Mark Intern'l Bakersfield
  { customerName: 'Core-Mark Intern\'l Bakersfield', productName: 'GAL BAGEL DOG POLISH SSG', cases: 5, pieces: 18.75, revenue: 85.50 },
  
  // Cotati Brand Eggs,Inc-Cotati
  { customerName: 'Cotati Brand Eggs,Inc-Cotati', productName: 'GAL PIROSHKI BEEF CHS N/S', cases: 10, pieces: 45.00, revenue: 237.60 },
  { customerName: 'Cotati Brand Eggs,Inc-Cotati', productName: 'GAL BAGEL DOG BEEF', cases: 10, pieces: 60.00, revenue: 274.80 },
  { customerName: 'Cotati Brand Eggs,Inc-Cotati', productName: 'GAL BAGEL DOG POLISH', cases: 6, pieces: 36.00, revenue: 164.88 },
  
  // *Galant Enterprises Inc
  { customerName: '*Galant Enterprises Inc', productName: 'GAL PIROS BF CHS 4.5Z N/S', cases: 24, pieces: 81.12, revenue: 392.40 },
  
  // Dairy Fresh Farms-Port Angeles
  { customerName: 'Dairy Fresh Farms-Port Angeles', productName: 'GAL BAGEL DOG JALA CHS', cases: 4, pieces: 15.00, revenue: 68.40 },
  { customerName: 'Dairy Fresh Farms-Port Angeles', productName: 'GAL WRAP CHIC BAC RAN C/O', cases: 4, pieces: 24.00, revenue: 121.92 },
  { customerName: 'Dairy Fresh Farms-Port Angeles', productName: 'GAL BAGEL DOG POLISH', cases: 8, pieces: 48.00, revenue: 219.84 },
  { customerName: 'Dairy Fresh Farms-Port Angeles', productName: 'GAL BURR BRKFST BACON', cases: 4, pieces: 24.00, revenue: 122.40 },
  { customerName: 'Dairy Fresh Farms-Port Angeles', productName: 'GAL SAND BRKFST CHORIZO', cases: 8, pieces: 30.00, revenue: 218.40 },
  { customerName: 'Dairy Fresh Farms-Port Angeles', productName: 'GAL BURR BRKFST SAUSAGE', cases: 4, pieces: 24.00, revenue: 122.40 },
  
  // Dairy Valley Distributors
  { customerName: 'Dairy Valley Distributors', productName: 'GAL BURR BFST CHORIZO', cases: 46, pieces: 276.00, revenue: 1407.60 },
  { customerName: 'Dairy Valley Distributors', productName: 'GAL BURR BRKFST VERDE', cases: 30, pieces: 180.00, revenue: 918.00 },
  
  // Harbor Wholesale Grocery Lacey
  { customerName: 'Harbor Wholesale Grocery Lacey', productName: 'GAL BAGEL DOG BEEF FRANK', cases: 17, pieces: 63.75, revenue: 290.70 },
  { customerName: 'Harbor Wholesale Grocery Lacey', productName: 'GAL BAGEL DOG POLISH SSG', cases: 25, pieces: 93.75, revenue: 427.50 },
  { customerName: 'Harbor Wholesale Grocery Lacey', productName: 'GAL BAGEL DOG JALA CHS', cases: 13, pieces: 48.75, revenue: 222.30 },
  
  // Glacier Wholesalers, Inc MT
  { customerName: 'Glacier Wholesalers, Inc MT', productName: 'GAL BAGEL DOG BEEF', cases: 2, pieces: 12.00, revenue: 54.96 },
  { customerName: 'Glacier Wholesalers, Inc MT', productName: 'GAL BAGEL DOG POLISH', cases: 2, pieces: 12.00, revenue: 54.96 },
  
  // Harbor Wholesale - MDC Modesto
  { customerName: 'Harbor Wholesale - MDC Modesto', productName: 'GAL BAGEL DOG BEEF FRANK', cases: 25, pieces: 93.75, revenue: 427.50 },
  { customerName: 'Harbor Wholesale - MDC Modesto', productName: 'GAL BAGEL DOG POLISH SSG', cases: 25, pieces: 93.75, revenue: 427.50 },
  { customerName: 'Harbor Wholesale - MDC Modesto', productName: 'GAL BAGEL DOG JALA CHS', cases: 13, pieces: 48.75, revenue: 222.30 },
  
  // Harbor Wholesale Grocery Roseb
  { customerName: 'Harbor Wholesale Grocery Roseb', productName: 'GAL BAGEL DOG BEEF FRANK', cases: 6, pieces: 22.50, revenue: 102.60 },
  { customerName: 'Harbor Wholesale Grocery Roseb', productName: 'GAL BAGEL DOG POLISH SSG', cases: 13, pieces: 48.75, revenue: 222.30 },
  { customerName: 'Harbor Wholesale Grocery Roseb', productName: 'GAL BAGEL DOG JALA CHS', cases: 2, pieces: 7.50, revenue: 34.20 },
  
  // Pete's Milk Delivery
  { customerName: 'Pete\'s Milk Delivery', productName: 'GAL BAGEL DOG POLISH', cases: 6, pieces: 36.00, revenue: 164.88 },
  { customerName: 'Pete\'s Milk Delivery', productName: 'GAL BURR BRKFST BACON', cases: 48, pieces: 288.00, revenue: 1468.80 },
  { customerName: 'Pete\'s Milk Delivery', productName: 'GAL SAND BRKFST CHORIZO', cases: 10, pieces: 37.50, revenue: 273.00 },
  { customerName: 'Pete\'s Milk Delivery', productName: 'GAL SAND PROV PESTO', cases: 2, pieces: 6.00, revenue: 54.00 },
  { customerName: 'Pete\'s Milk Delivery', productName: 'GAL SAND SSG TURKEY', cases: 9, pieces: 33.75, revenue: 245.70 },
  { customerName: 'Pete\'s Milk Delivery', productName: 'GAL BURR BRKFST VERDE', cases: 16, pieces: 96.00, revenue: 489.60 },
  { customerName: 'Pete\'s Milk Delivery', productName: 'GAL BURR BRKFST SAUSAGE', cases: 17, pieces: 102.00, revenue: 520.20 },
  
  // Rogge Produce
  { customerName: 'Rogge Produce', productName: 'GAL BAGEL DOG BEEF', cases: 4, pieces: 24.00, revenue: 109.92 },
  { customerName: 'Rogge Produce', productName: 'GAL BURR BRKFST BACON', cases: 1, pieces: 6.00, revenue: 30.60 },
  { customerName: 'Rogge Produce', productName: 'GAL BURR BRKFST SAUSAGE', cases: 1, pieces: 6.00, revenue: 30.60 },
  
  // Stebo's Foodservice- Longview
  { customerName: 'Stebo\'s Foodservice- Longview', productName: 'GAL BURR BRKFST BACON', cases: 3, pieces: 18.00, revenue: 91.80 },
  { customerName: 'Stebo\'s Foodservice- Longview', productName: 'GAL BURR BRKFST SAUSAGE', cases: 3, pieces: 18.00, revenue: 91.80 },
  
  // UNFI Centralia Div-Frozen
  { customerName: 'UNFI Centralia Div-Frozen', productName: 'GAL BAGEL DOG BEEF FRANK', cases: 150, pieces: 562.50, revenue: 2565.00 },
  
  // UNFI Stockton Frozen
  { customerName: 'UNFI Stockton Frozen', productName: 'GAL BAGEL DOG BEEF FRANK', cases: 100, pieces: 375.00, revenue: 1710.00 },
  
  // U.R.M. Food Service-Frozen
  { customerName: 'U.R.M. Food Service-Frozen', productName: 'GAL BAGEL DOG BEEF FRANK', cases: 12, pieces: 45.00, revenue: 205.20 },
  { customerName: 'U.R.M. Food Service-Frozen', productName: 'GAL BAGEL DOG JALA CHS', cases: 12, pieces: 45.00, revenue: 205.20 },
  { customerName: 'U.R.M. Food Service-Frozen', productName: 'GAL SAND PROV PESTO', cases: 1, pieces: 3.00, revenue: 27.00 },
  
  // Vern's Dist Hermiston
  { customerName: 'Vern\'s Dist Hermiston', productName: 'GAL BAGEL DOG BEEF FRANK', cases: 2, pieces: 7.50, revenue: 34.20 },
];

// BiRite 2024 sales data from CSV
const biriteSalesData = [
  // 18th Street Commissary
  { customerName: '18th Street Commissary', productName: 'Mango Gold', q1: 2, q2: 2, q3: 4 },
  { customerName: '18th Street Commissary', productName: 'Peach Ginger', q1: 2, q2: 2, q3: 0 },
  { customerName: '18th Street Commissary', productName: 'Peach Ginger Probiot', q1: 0, q2: 0, q3: 3 },
  { customerName: '18th Street Commissary', productName: 'Pineapple Organic', q1: 0, q2: 0, q3: 3 },
  { customerName: '18th Street Commissary', productName: 'Rasp Lychee Organic', q1: 0, q2: 0, q3: 6 },
  { customerName: '18th Street Commissary', productName: 'Strawberry Passn Org', q1: 0, q2: 0, q3: 6 },
  
  // Alvarado Brewery - Salinas
  { customerName: 'Alvarado Brewery - Salinas', productName: 'Mango Gold', q1: 1, q2: 1, q3: 1 },
  
  // Apple - AP01
  { customerName: 'Apple - AP01', productName: 'Guava Rose', q1: 1, q2: 1, q3: 0 },
  { customerName: 'Apple - AP01', productName: 'Peach Ginger', q1: 1, q2: 1, q3: 0 },
  { customerName: 'Apple - AP01', productName: 'Pineapple Paradise', q1: 1, q2: 1, q3: 0 },
  
  // August Hall
  { customerName: 'August Hall', productName: 'Guava Rose', q1: 2, q2: 2, q3: 0 },
  { customerName: 'August Hall', productName: 'Peach Ginger', q1: 2, q2: 2, q3: 0 },
  
  // Boichik Bagels - Retail
  { customerName: 'Boichik Bagels - Retail', productName: 'Mango Gold', q1: 14, q2: 14, q3: 0 },
  { customerName: 'Boichik Bagels - Retail', productName: 'Peach Ginger', q1: 10, q2: 10, q3: 0 },
  { customerName: 'Boichik Bagels - Retail', productName: 'Strawberry Passion', q1: 15, q2: 15, q3: 0 },
  
  // Burlingame Country Club
  { customerName: 'Burlingame Country Club', productName: 'Guava Rose', q1: 2, q2: 2, q3: 0 },
  { customerName: 'Burlingame Country Club', productName: 'Guava Rose Probiotic', q1: 0, q2: 0, q3: 1 },
  { customerName: 'Burlingame Country Club', productName: 'Peach Ginger', q1: 2, q2: 2, q3: 0 },
  { customerName: 'Burlingame Country Club', productName: 'Peach Ginger Probiot', q1: 0, q2: 0, q3: 2 },
  { customerName: 'Burlingame Country Club', productName: 'Strawberry Passion', q1: 2, q2: 2, q3: 0 },
  { customerName: 'Burlingame Country Club', productName: 'Strawberry Passn Org', q1: 0, q2: 0, q3: 2 },
  
  // Cheese Factory, The
  { customerName: 'Cheese Factory, The', productName: 'Guava Rose', q1: 2, q2: 2, q3: 0 },
  { customerName: 'Cheese Factory, The', productName: 'Mango Gold', q1: 2, q2: 2, q3: 0 },
  { customerName: 'Cheese Factory, The', productName: 'Peach Ginger', q1: 2, q2: 2, q3: 0 },
  { customerName: 'Cheese Factory, The', productName: 'Pineapple Paradise', q1: 2, q2: 2, q3: 0 },
  { customerName: 'Cheese Factory, The', productName: 'Strawberry Passion', q1: 2, q2: 2, q3: 0 },
  
  // Coffee Cultures SF
  { customerName: 'Coffee Cultures SF', productName: 'Mango Gold', q1: 5, q2: 5, q3: 0 },
  
  // Depot Cafe & Bookstore
  { customerName: 'Depot Cafe & Bookstore', productName: 'Guava Rose', q1: 15, q2: 15, q3: 0 },
  { customerName: 'Depot Cafe & Bookstore', productName: 'Guava Rose Probiotic', q1: 0, q2: 0, q3: 35 },
  { customerName: 'Depot Cafe & Bookstore', productName: 'Pineapple Organic', q1: 0, q2: 0, q3: 4 },
  
  // Eiko's
  { customerName: 'Eiko\'s', productName: 'Guava Rose', q1: 2, q2: 2, q3: 0 },
  { customerName: 'Eiko\'s', productName: 'Guava Rose Probiotic', q1: 0, q2: 0, q3: 3 },
  { customerName: 'Eiko\'s', productName: 'Mango Gold', q1: 3, q2: 3, q3: 2 },
  { customerName: 'Eiko\'s', productName: 'Peach Ginger', q1: 2, q2: 2, q3: 0 },
  
  // Island Savoy Market
  { customerName: 'Island Savoy Market', productName: 'Guava Rose', q1: 2, q2: 2, q3: 0 },
  { customerName: 'Island Savoy Market', productName: 'Guava Rose Probiotic', q1: 0, q2: 0, q3: 2 },
  { customerName: 'Island Savoy Market', productName: 'Mango Gold', q1: 3, q2: 3, q3: 1 },
  { customerName: 'Island Savoy Market', productName: 'Peach Ginger', q1: 3, q2: 3, q3: 0 },
  { customerName: 'Island Savoy Market', productName: 'Peach Ginger Probiot', q1: 0, q2: 0, q3: 2 },
  { customerName: 'Island Savoy Market', productName: 'Pineapple Organic', q1: 0, q2: 0, q3: 4 },
  { customerName: 'Island Savoy Market', productName: 'Pineapple Paradise', q1: 4, q2: 4, q3: 0 },
  { customerName: 'Island Savoy Market', productName: 'Rasp Lychee Organic', q1: 0, q2: 0, q3: 3 },
  { customerName: 'Island Savoy Market', productName: 'Strawberry Passion', q1: 3, q2: 3, q3: 0 },
  { customerName: 'Island Savoy Market', productName: 'Strawberry Passn Org', q1: 0, q2: 0, q3: 2 },
  
  // Ladle & Leaf locations (multiple locations)
  { customerName: 'Ladle & Leaf - 1 CAL', productName: 'Guava Rose', q1: 3, q2: 3, q3: 0 },
  { customerName: 'Ladle & Leaf - 1 CAL', productName: 'Guava Rose Probiotic', q1: 0, q2: 0, q3: 4 },
  { customerName: 'Ladle & Leaf - 1 CAL', productName: 'Mango Gold', q1: 2, q2: 2, q3: 4 },
  { customerName: 'Ladle & Leaf - 1 CAL', productName: 'Peach Ginger', q1: 3, q2: 3, q3: 0 },
  { customerName: 'Ladle & Leaf - 1 CAL', productName: 'Peach Ginger Probiot', q1: 0, q2: 0, q3: 3 },
  { customerName: 'Ladle & Leaf - 1 CAL', productName: 'Pineapple Organic', q1: 0, q2: 0, q3: 2 },
  { customerName: 'Ladle & Leaf - 1 CAL', productName: 'Strawberry Passion', q1: 4, q2: 4, q3: 0 },
  { customerName: 'Ladle & Leaf - 1 CAL', productName: 'Strawberry Passn Org', q1: 0, q2: 0, q3: 5 },
  
  // Model Bakery locations
  { customerName: 'Model Bakery The - Napa', productName: 'Mango Gold', q1: 45, q2: 45, q3: 32 },
  { customerName: 'Model Bakery The - St He', productName: 'Guava Rose', q1: 5, q2: 5, q3: 0 },
  { customerName: 'Model Bakery The - St He', productName: 'Guava Rose Probiotic', q1: 0, q2: 0, q3: 9 },
  
  // Napa Farms Market locations
  { customerName: 'Napa Farms Market Int\'l', productName: 'Guava Rose', q1: 14, q2: 14, q3: 0 },
  { customerName: 'Napa Farms Market Int\'l', productName: 'Mango Gold', q1: 11, q2: 11, q3: 0 },
  { customerName: 'Napa Farms Market Int\'l', productName: 'Peach Ginger', q1: 9, q2: 9, q3: 0 },
  { customerName: 'Napa Farms Market Int\'l', productName: 'Pineapple Paradise', q1: 14, q2: 14, q3: 0 },
  { customerName: 'Napa Farms Market Int\'l', productName: 'Strawberry Passion', q1: 12, q2: 12, q3: 0 },
  
  { customerName: 'Napa Farms Market T2', productName: 'Guava Rose', q1: 39, q2: 39, q3: 0 },
  { customerName: 'Napa Farms Market T2', productName: 'Mango Gold', q1: 33, q2: 33, q3: 0 },
  { customerName: 'Napa Farms Market T2', productName: 'Peach Ginger', q1: 37, q2: 37, q3: 0 },
  { customerName: 'Napa Farms Market T2', productName: 'Strawberry Passion', q1: 39, q2: 39, q3: 0 },
  
  // Proper Food locations
  { customerName: 'Proper Food - Commissary', productName: 'Mango Gold', q1: 258, q2: 258, q3: 290 },
  { customerName: 'Proper Food SFO', productName: 'Guava Rose', q1: 42, q2: 42, q3: 0 },
  { customerName: 'Proper Food SFO', productName: 'Guava Rose Probiotic', q1: 0, q2: 0, q3: 95 },
  { customerName: 'Proper Food SFO', productName: 'Pineapple Paradise', q1: 11, q2: 11, q3: 0 },
  { customerName: 'Proper Food SFO', productName: 'Strawberry Passion', q1: 48, q2: 48, q3: 0 },
  { customerName: 'Proper Food SFO', productName: 'Strawberry Passn Org', q1: 0, q2: 0, q3: 109 },
  
  // Publico Urban Taqueria
  { customerName: 'Publico Urban Taqueria', productName: 'Guava Rose', q1: 12, q2: 12, q3: 0 },
  { customerName: 'Publico Urban Taqueria', productName: 'Guava Rose Probiotic', q1: 0, q2: 0, q3: 10 },
  { customerName: 'Publico Urban Taqueria', productName: 'Mango Gold', q1: 8, q2: 8, q3: 8 },
  { customerName: 'Publico Urban Taqueria', productName: 'Peach Ginger', q1: 8, q2: 8, q3: 0 },
  { customerName: 'Publico Urban Taqueria', productName: 'Peach Ginger Probiot', q1: 0, q2: 0, q3: 10 },
  { customerName: 'Publico Urban Taqueria', productName: 'Pineapple Organic', q1: 0, q2: 0, q3: 9 },
  { customerName: 'Publico Urban Taqueria', productName: 'Pineapple Paradise', q1: 6, q2: 6, q3: 0 },
  { customerName: 'Publico Urban Taqueria', productName: 'Strawberry Passion', q1: 13, q2: 13, q3: 0 },
  { customerName: 'Publico Urban Taqueria', productName: 'Strawberry Passn Org', q1: 0, q2: 0, q3: 13 },
  
  // Servers Standing - S/M
  { customerName: 'Servers Standing - S/M', productName: 'Guava Rose', q1: 15, q2: 15, q3: 0 },
  { customerName: 'Servers Standing - S/M', productName: 'Guava Rose Probiotic', q1: 0, q2: 0, q3: 10 },
  { customerName: 'Servers Standing - S/M', productName: 'Mango Gold', q1: 15, q2: 15, q3: 7 },
  { customerName: 'Servers Standing - S/M', productName: 'Peach Ginger', q1: 15, q2: 15, q3: 0 },
  { customerName: 'Servers Standing - S/M', productName: 'Peach Ginger Probiot', q1: 0, q2: 0, q3: 9 },
  { customerName: 'Servers Standing - S/M', productName: 'Pineapple Organic', q1: 0, q2: 0, q3: 10 },
  { customerName: 'Servers Standing - S/M', productName: 'Pineapple Paradise', q1: 15, q2: 15, q3: 0 },
  { customerName: 'Servers Standing - S/M', productName: 'Rasp Lychee Organic', q1: 0, q2: 0, q3: 9 },
  { customerName: 'Servers Standing - S/M', productName: 'Strawberry Passion', q1: 13, q2: 13, q3: 0 },
  { customerName: 'Servers Standing - S/M', productName: 'Strawberry Passn Org', q1: 0, q2: 0, q3: 9 },
  
  // Solage Calistoga
  { customerName: 'Solage Calistoga', productName: 'Guava Rose', q1: 3, q2: 3, q3: 0 },
  { customerName: 'Solage Calistoga', productName: 'Guava Rose Probiotic', q1: 0, q2: 0, q3: 3 },
  { customerName: 'Solage Calistoga', productName: 'Peach Ginger Probiot', q1: 0, q2: 0, q3: 2 },
  { customerName: 'Solage Calistoga', productName: 'Strawberry Passion', q1: 3, q2: 3, q3: 0 },
  { customerName: 'Solage Calistoga', productName: 'Strawberry Passn Org', q1: 0, q2: 0, q3: 7 },
  
  // Tutus Food & Drink
  { customerName: 'Tutus Food & Drink', productName: 'Mango Gold', q1: 8, q2: 8, q3: 14 },
  
  // Velo Vino / Clif Family WN
  { customerName: 'Velo Vino / Clif Family WN', productName: 'Guava Rose', q1: 11, q2: 11, q3: 0 },
  { customerName: 'Velo Vino / Clif Family WN', productName: 'Guava Rose Probiotic', q1: 0, q2: 0, q3: 6 },
  { customerName: 'Velo Vino / Clif Family WN', productName: 'Mango Gold', q1: 0, q2: 0, q3: 4 },
  { customerName: 'Velo Vino / Clif Family WN', productName: 'Peach Ginger Probiot', q1: 0, q2: 0, q3: 6 },
  { customerName: 'Velo Vino / Clif Family WN', productName: 'Pineapple Organic', q1: 0, q2: 0, q3: 2 },
];

// Generate random sales data for the last 6 months
const generateSalesData = () => {
  const sales = [];
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 6);

  // Add Alpine August 2025 sales data
  alpineSalesData.forEach((sale, index) => {
    const customer = customers.find(c => c.name === sale.customerName);
    const product = products.find(p => p.name === sale.productName);
    
    if (customer && product) {
      sales.push({
        id: index + 1,
        date: '2025-08-15', // Using mid-August date for the report
        customerId: customer.id,
        customerName: customer.name,
        productId: product.id,
        productName: product.name,
        quantity: Math.round(sale.pieces),
        revenue: Math.round(sale.revenue * 100) / 100,
      });
    }
  });

  // Add BiRite 2024 sales data
  biriteSalesData.forEach((sale, index) => {
    const customer = customers.find(c => c.name === sale.customerName);
    const product = products.find(p => p.name === sale.productName);
    
    if (customer && product) {
      // Create sales records for each quarter
      const quarters = [
        { q: 'Q1', date: '2024-03-15', quantity: sale.q1 },
        { q: 'Q2', date: '2024-06-15', quantity: sale.q2 },
        { q: 'Q3', date: '2024-09-15', quantity: sale.q3 },
      ];
      
      quarters.forEach(quarter => {
        if (quarter.quantity > 0) {
          sales.push({
            id: alpineSalesData.length + (index * 3) + quarters.indexOf(quarter) + 1,
            date: quarter.date,
            customerId: customer.id,
            customerName: customer.name,
            productId: product.id,
            productName: product.name,
            quantity: quarter.quantity,
            revenue: Math.round(quarter.quantity * product.price * 100) / 100,
          });
        }
      });
    }
  });

  // Add some random sales data for variety
  for (let i = 0; i < 50; i++) {
    const date = new Date(startDate.getTime() + Math.random() * (Date.now() - startDate.getTime()));
    const customer = customers[Math.floor(Math.random() * customers.length)];
    const product = products[Math.floor(Math.random() * products.length)];
    const quantity = Math.floor(Math.random() * 50) + 1;
    const revenue = quantity * product.price;

    sales.push({
      id: alpineSalesData.length + i + 1,
      date: date.toISOString().split('T')[0],
      customerId: customer.id,
      customerName: customer.name,
      productId: product.id,
      productName: product.name,
      quantity,
      revenue: Math.round(revenue * 100) / 100,
    });
  }

  return sales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

const salesData = generateSalesData();

const Dashboard: React.FC = () => {
  const [dateFilter, setDateFilter] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [sortField, setSortField] = useState<'date' | 'revenue' | 'quantity'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Calculate KPIs
  const kpis = useMemo(() => {
    const totalRevenue = salesData.reduce((sum, sale) => sum + sale.revenue, 0);
    const totalUnits = salesData.reduce((sum, sale) => sum + sale.quantity, 0);
    
    // Top customer by revenue
    const customerRevenue = salesData.reduce((acc, sale) => {
      acc[sale.customerName] = (acc[sale.customerName] || 0) + sale.revenue;
      return acc;
    }, {} as Record<string, number>);
    const topCustomer = Object.entries(customerRevenue).sort(([,a], [,b]) => b - a)[0];

    // Top product by revenue
    const productRevenue = salesData.reduce((acc, sale) => {
      acc[sale.productName] = (acc[sale.productName] || 0) + sale.revenue;
      return acc;
    }, {} as Record<string, number>);
    const topProduct = Object.entries(productRevenue).sort(([,a], [,b]) => b - a)[0];

    return {
      totalRevenue,
      totalUnits,
      topCustomer: topCustomer ? topCustomer[0] : 'N/A',
      topProduct: topProduct ? topProduct[0] : 'N/A',
    };
  }, []);

  // Revenue over time data
  const revenueOverTime = useMemo(() => {
    const monthlyRevenue = salesData.reduce((acc, sale) => {
      const month = sale.date.substring(0, 7); // YYYY-MM format
      acc[month] = (acc[month] || 0) + sale.revenue;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(monthlyRevenue)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, revenue]) => ({
        month,
        revenue: Math.round(revenue * 100) / 100,
      }));
  }, []);

  // Revenue by customer data
  const revenueByCustomer = useMemo(() => {
    const customerRevenue = salesData.reduce((acc, sale) => {
      acc[sale.customerName] = (acc[sale.customerName] || 0) + sale.revenue;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(customerRevenue)
      .sort(([,a], [,b]) => b - a)
      .map(([customer, revenue]) => ({
        customer: customer.length > 15 ? customer.substring(0, 15) + '...' : customer,
        fullCustomerName: customer, // Keep full name for filtering
        revenue: Math.round(revenue * 100) / 100,
      }));
  }, []);

  // Revenue by product data
  const revenueByProduct = useMemo(() => {
    const productRevenue = salesData.reduce((acc, sale) => {
      acc[sale.productName] = (acc[sale.productName] || 0) + sale.revenue;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(productRevenue)
      .sort(([,a], [,b]) => b - a)
      .map(([product, revenue], index) => ({
        id: `${product}-${index}`, // Unique identifier
        product: product.length > 15 ? product.substring(0, 15) + '...' : product,
        fullProduct: product, // Keep full name for tooltip
        revenue: Math.round(revenue * 100) / 100,
      }));
  }, []);

  // Product mix data
  const productMix = useMemo(() => {
    const productRevenue = salesData.reduce((acc, sale) => {
      acc[sale.productName] = (acc[sale.productName] || 0) + sale.revenue;
      return acc;
    }, {} as Record<string, number>);

    const total = Object.values(productRevenue).reduce((sum, rev) => sum + rev, 0);
    
    return Object.entries(productRevenue)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 8) // Top 8 products
      .map(([product, revenue]) => ({
        name: product.length > 12 ? product.substring(0, 12) + '...' : product,
        value: Math.round((revenue / total) * 100 * 100) / 100,
      }));
  }, []);

  // Filtered and sorted sales data
  const filteredSales = useMemo(() => {
    let filtered = salesData.filter(sale => {
      const matchesDate = !dateFilter || sale.date.includes(dateFilter);
      const matchesCustomer = !customerFilter || sale.customerName.toLowerCase().includes(customerFilter.toLowerCase());
      const matchesProduct = !productFilter || sale.productName.toLowerCase().includes(productFilter.toLowerCase());
      return matchesDate && matchesCustomer && matchesProduct;
    });

    return filtered.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      const comparison = sortField === 'date' ? 
        new Date(aVal as string).getTime() - new Date(bVal as string).getTime() :
        (aVal as number) - (bVal as number);
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [dateFilter, customerFilter, productFilter, sortField, sortDirection]);

  const handleSort = (field: 'date' | 'revenue' | 'quantity') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#F97316', '#06B6D4', '#84CC16'];

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Sales Dashboard</h1>
          <p className="text-sm sm:text-base text-gray-600">Food Manufacturing Company</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-1 sm:pb-2 p-3 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              <div className="text-lg sm:text-2xl font-bold text-green-600">
                ${kpis.totalRevenue.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-1 sm:pb-2 p-3 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">Total Units Sold</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              <div className="text-lg sm:text-2xl font-bold text-blue-600">
                {kpis.totalUnits.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-1 sm:pb-2 p-3 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">Top Customer</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              <div className="text-sm sm:text-lg font-semibold text-gray-900 truncate">
                {kpis.topCustomer}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-1 sm:pb-2 p-3 sm:p-6">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-600">Top Product</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6 pt-0">
              <div className="text-sm sm:text-lg font-semibold text-gray-900 truncate">
                {kpis.topProduct}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-6">
          {/* Revenue Over Time */}
          <Card className="bg-white shadow-lg col-span-1 lg:col-span-2 xl:col-span-2">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg font-semibold">Revenue Over Time</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={revenueOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="month" 
                    stroke="#666" 
                    fontSize={12}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    stroke="#666" 
                    fontSize={12}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    formatter={(value) => [`$${value}`, 'Revenue']}
                    labelStyle={{ color: '#666', fontSize: 12 }}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    dot={{ fill: '#3B82F6', strokeWidth: 2, r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Product Mix */}
          <Card className="bg-white shadow-lg">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg font-semibold">Product Mix (%)</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={productMix}
                    cx="50%"
                    cy="50%"
                    outerRadius={60}
                    dataKey="value"
                  >
                    {productMix.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [`${value}%`, 'Share']} 
                    contentStyle={{ fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-1">
                {productMix.slice(0, 4).map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between text-xs sm:text-sm">
                    <div className="flex items-center">
                      <div 
                        className="w-2 h-2 sm:w-3 sm:h-3 rounded-full mr-2" 
                        style={{ backgroundColor: colors[index] }}
                      />
                      <span className="text-gray-600 truncate">{item.name}</span>
                    </div>
                    <span className="font-medium">{item.value}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Revenue by Customer */}
          <Card className="bg-white shadow-lg col-span-1 lg:col-span-2 xl:col-span-3">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg font-semibold">Revenue by Customer</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <RevenueByCustomerComponent revenueByCustomer={revenueByCustomer} salesData={salesData} />
            </CardContent>
          </Card>

          {/* Revenue by Product */}
          <Card className="bg-white shadow-lg col-span-1 lg:col-span-2 xl:col-span-3">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg font-semibold">Revenue by Product</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <RevenueByProductComponent revenueByProduct={revenueByProduct} salesData={salesData} />
            </CardContent>
          </Card>
        </div>

        {/* Sales Table */}
        <Card className="bg-white shadow-lg">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg font-semibold">Sales Transactions</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mt-4">
              <input
                type="date"
                placeholder="Filter by date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm flex-1"
              />
              <input
                type="text"
                placeholder="Filter by customer"
                value={customerFilter}
                onChange={(e) => setCustomerFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm flex-1"
              />
              <input
                type="text"
                placeholder="Filter by product"
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm flex-1"
              />
              <Button
                variant="outline"
                onClick={() => {
                  setDateFilter('');
                  setCustomerFilter('');
                  setProductFilter('');
                }}
                className="text-sm w-full sm:w-auto"
              >
                Clear Filters
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th 
                      className="text-left p-2 sm:p-3 cursor-pointer hover:bg-gray-50 min-w-[80px]"
                      onClick={() => handleSort('date')}
                    >
                      Date {sortField === 'date' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="text-left p-2 sm:p-3 min-w-[120px]">Customer</th>
                    <th className="text-left p-2 sm:p-3 min-w-[120px]">Product</th>
                    <th 
                      className="text-left p-2 sm:p-3 cursor-pointer hover:bg-gray-50 min-w-[70px]"
                      onClick={() => handleSort('quantity')}
                    >
                      Qty {sortField === 'quantity' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      className="text-left p-2 sm:p-3 cursor-pointer hover:bg-gray-50 min-w-[80px]"
                      onClick={() => handleSort('revenue')}
                    >
                      Revenue {sortField === 'revenue' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.slice(0, 20).map((sale) => (
                    <tr key={sale.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="p-2 sm:p-3 font-medium">{sale.date}</td>
                      <td className="p-2 sm:p-3 truncate max-w-[120px]" title={sale.customerName}>
                        {sale.customerName}
                      </td>
                      <td className="p-2 sm:p-3 truncate max-w-[120px]" title={sale.productName}>
                        {sale.productName}
                      </td>
                      <td className="p-2 sm:p-3">{sale.quantity}</td>
                      <td className="p-2 sm:p-3 font-semibold text-green-600">${sale.revenue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredSales.length > 20 && (
                <div className="text-center py-4 text-gray-500 text-sm">
                  Showing 20 of {filteredSales.length} transactions
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;

