import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { AlertTriangle, TrendingDown, Users, Clock } from 'lucide-react';

interface CustomerAttritionData {
  customerName: string;
  previousRevenue: number;
  currentRevenue: number;
  changeAmount: number;
  changePercentage: number;
  status: 'stopped' | 'declining' | 'low-activity';
  lastActivity: string;
  productsPurchased: string[];
}

interface CustomerAttritionAlertProps {
  currentInvoices: Array<{ customerName: string; productName: string; quantity: number; revenue: number; date: string }>;
  previousInvoices: Array<{ customerName: string; productName: string; quantity: number; revenue: number; date: string }>;
}

const CustomerAttritionAlert: React.FC<CustomerAttritionAlertProps> = ({ 
  currentInvoices, 
  previousInvoices 
}) => {
  const [showAll, setShowAll] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'stopped' | 'declining' | 'low-activity'>('declining');

  const attritionData = useMemo((): CustomerAttritionData[] => {
    // Get all unique customers
    const allCustomers = new Set([
      ...currentInvoices.map(inv => inv.customerName),
      ...previousInvoices.map(inv => inv.customerName)
    ]);

    const results: CustomerAttritionData[] = [];

    for (const customer of Array.from(allCustomers)) {
      // Calculate revenue for current period
      const currentRevenue = currentInvoices
        .filter(inv => inv.customerName === customer)
        .reduce((sum, inv) => sum + inv.revenue, 0);

      // Calculate revenue for previous period
      const previousRevenue = previousInvoices
        .filter(inv => inv.customerName === customer)
        .reduce((sum, inv) => sum + inv.revenue, 0);

      // Skip if no previous history
      if (previousRevenue === 0) continue;

      const changeAmount = currentRevenue - previousRevenue;
      const changePercentage = (changeAmount / previousRevenue) * 100;

      // Get products purchased this period
      const currentProducts = Array.from(new Set(
        currentInvoices
          .filter(inv => inv.customerName === customer)
          .map(inv => inv.productName)
      ));

      // Get last activity date
      const lastDates = currentInvoices
        .filter(inv => inv.customerName === customer)
        .map(inv => inv.date)
        .sort()
        .reverse();

      const lastActivity = lastDates.length > 0 ? lastDates[0] : 'No recent activity';

      // Determine status
      let status: 'stopped' | 'declining' | 'low-activity';
      if (currentRevenue === 0) {
        status = 'stopped';
      } else if (changePercentage < -30) {
        status = 'declining';
      } else if (currentRevenue < previousRevenue * 0.5) {
        status = 'low-activity';
      } else {
        continue; // Skip customers who don't meet alert criteria
      }

      results.push({
        customerName: customer,
        previousRevenue,
        currentRevenue,
        changeAmount,
        changePercentage,
        status,
        lastActivity,
        productsPurchased: currentProducts
      });
    }

    return results.sort((a, b) => Math.abs(b.changePercentage) - Math.abs(a.changePercentage));
  }, [currentInvoices, previousInvoices]);

  const filteredData = attritionData.filter(item => 
    filterStatus === 'all' || item.status === filterStatus
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'stopped':
        return <Users className="w-4 h-4 text-red-500" />;
      case 'declining':
        return <TrendingDown className="w-4 h-4 text-orange-500" />;
      case 'low-activity':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'stopped':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'declining':
        return 'bg-orange-50 border-orange-200 text-orange-800';
      case 'low-activity':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const criticalAttritionCount = attritionData.filter(item => 
    item.status === 'stopped' || item.status === 'declining'
  ).length;

  return (
    <Card className="bg-white shadow-lg">
      <CardHeader className="p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Customer Attrition Alerts
            {criticalAttritionCount > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {criticalAttritionCount}
              </span>
            )}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant={filterStatus === 'stopped' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('stopped')}
              className="text-xs"
            >
              Stopped ({attritionData.filter(item => item.status === 'stopped').length})
            </Button>
            <Button
              variant={filterStatus === 'declining' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterStatus('declining')}
              className="text-xs"
            >
              Declining ({attritionData.filter(item => item.status === 'declining').length})
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0">
        {filteredData.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">No alerts found</p>
            <p className="text-sm">All customers are maintaining or growing their business</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredData.slice(0, showAll ? filteredData.length : 5).map((customer, index) => (
              <div 
                key={`${customer.customerName}-${index}`}
                className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${getStatusColor(customer.status)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusIcon(customer.status)}
                      <h3 className="font-semibold text-sm sm:text-base truncate">
                        {customer.customerName}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(customer.status)}`}>
                        {customer.status.replace('-', ' ')}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Revenue Comparison</p>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {formatCurrency(customer.previousRevenue)} → {formatCurrency(customer.currentRevenue)}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded ${
                            customer.changePercentage < 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                          }`}>
                            {customer.changePercentage.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Last Activity</p>
                        <p className="text-sm font-medium">{customer.lastActivity}</p>
                      </div>
                    </div>

                    {customer.productsPurchased.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Current Products</p>
                        <div className="flex flex-wrap gap-1">
                          {customer.productsPurchased.map((product, prodIndex) => (
                            <span 
                              key={prodIndex}
                              className="text-xs bg-white/50 px-2 py-1 rounded-full text-gray-700 border"
                            >
                              {product.length > 20 ? product.substring(0, 20) + '...' : product}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="text-right ml-4">
                    <div className={`text-lg font-bold ${
                      customer.changeAmount < 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {customer.changeAmount < 0 ? '-' : '+'} {formatCurrency(Math.abs(customer.changeAmount))}
                    </div>
                    <div className="text-xs text-gray-600">Impact</div>
                  </div>
                </div>
              </div>
            ))}

            {filteredData.length > 5 && (
              <div className="text-center pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowAll(!showAll)}
                  className="text-sm"
                >
                  {showAll ? 'Show Less' : `Show All ${filteredData.length} Customers`}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t">
          <div className="text-center">
            <div className="text-lg font-bold text-red-600">
              {attritionData.filter(item => item.status === 'stopped').length}
            </div>
            <div className="text-xs text-gray-500">Stopped Buying</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-orange-600">
              {attritionData.filter(item => item.status === 'declining').length}
            </div>
            <div className="text-xs text-gray-500">Declining Revenue</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CustomerAttritionAlert;
