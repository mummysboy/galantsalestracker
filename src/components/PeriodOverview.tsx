import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Package, 
  DollarSign, 
  AlertTriangle 
} from 'lucide-react';

interface PeriodComparisonData {
  currentPeriod: {
    totalRevenue: number;
    totalQuantity: number;
    customerCount: number;
    productCount: number;
    avgOrderValue: number;
  };
  previousPeriod: {
    totalRevenue: number;
    totalQuantity: number;
    customerCount: number;
    productCount: number;
    avgOrderValue: number;
  };
  changes: {
    revenueChange: number;
    revenueChangePercent: number;
    quantityChange: number;
    quantityChangePercent: number;
    customerChange: number;
    customerChangePercent: number;
    avgOrderValueChange: number;
    avgOrderValueChangePercent: number;
  };
}

interface PeriodOverviewProps {
  currentInvoices: Array<{ customerName: string; productName: string; quantity: number; revenue: number; date: string }>;
  previousInvoices: Array<{ customerName: string; productName: string; quantity: number; revenue: number; date: string }>;
  currentPeriodName?: string;
  previousPeriodName?: string;
}

const PeriodOverview: React.FC<PeriodOverviewProps> = ({ 
  currentInvoices, 
  previousInvoices,
  currentPeriodName = 'Current Period',
  previousPeriodName = 'Previous Period'
}) => {
  const comparisonData = useMemo((): PeriodComparisonData => {
    // Current period calculations
    const currentRevenue = currentInvoices.reduce((sum, inv) => sum + inv.revenue, 0);
    const currentQuantity = currentInvoices.reduce((sum, inv) => sum + inv.quantity, 0);
    const currentCustomers = new Set(currentInvoices.map(inv => inv.customerName)).size;
    const currentProducts = new Set(currentInvoices.map(inv => inv.productName)).size;
    const currentAvgOrderValue = currentCustomers > 0 ? currentRevenue / currentCustomers : 0;

    // Previous period calculations
    const previousRevenue = previousInvoices.reduce((sum, inv) => sum + inv.revenue, 0);
    const previousQuantity = previousInvoices.reduce((sum, inv) => sum + inv.quantity, 0);
    const previousCustomers = new Set(previousInvoices.map(inv => inv.customerName)).size;
    const previousProducts = new Set(previousInvoices.map(inv => inv.productName)).size;
    const previousAvgOrderValue = previousCustomers > 0 ? previousRevenue / previousCustomers : 0;

    // Calculate changes
    const revenueChange = currentRevenue - previousRevenue;
    const revenueChangePercent = previousRevenue !== 0 ? (revenueChange / previousRevenue) * 100 : 0;
    
    const quantityChange = currentQuantity - previousQuantity;
    const quantityChangePercent = previousQuantity !== 0 ? (quantityChange / previousQuantity) * 100 : 0;
    
    const customerChange = currentCustomers - previousCustomers;
    const customerChangePercent = previousCustomers !== 0 ? (customerChange / previousCustomers) * 100 : 0;
    
    const avgOrderValueChange = currentAvgOrderValue - previousAvgOrderValue;
    const avgOrderValueChangePercent = previousAvgOrderValue !== 0 ? 
      (avgOrderValueChange / previousAvgOrderValue) * 100 : 0;

    return {
      currentPeriod: {
        totalRevenue: Math.round(currentRevenue * 100) / 100,
        totalQuantity: currentQuantity,
        customerCount: currentCustomers,
        productCount: currentProducts,
        avgOrderValue: Math.round(currentAvgOrderValue * 100) / 100
      },
      previousPeriod: {
        totalRevenue: Math.round(previousRevenue * 100) / 100,
        totalQuantity: previousQuantity,
        customerCount: previousCustomers,
        productCount: previousProducts,
        avgOrderValue: Math.round(previousAvgOrderValue * 100) / 100
      },
      changes: {
        revenueChange: Math.round(revenueChange * 100) / 100,
        revenueChangePercent: Math.round(revenueChangePercent * 100) / 100,
        quantityChange,
        quantityChangePercent: Math.round(quantityChangePercent * 100) / 100,
        customerChange,
        customerChangePercent: Math.round(customerChangePercent * 100) / 100,
        avgOrderValueChange: Math.round(avgOrderValueChange * 100) / 100,
        avgOrderValueChangePercent: Math.round(avgOrderValueChangePercent * 100) / 100
      }
    };
  }, [currentInvoices, previousInvoices]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getTrendIcon = (change: number) => {
    if (change > 0) {
      return <TrendingUp className="w-4 h-4 text-green-600" />;
    } else if (change < 0) {
      return <TrendingDown className="w-4 h-4 text-red-600" />;
    }
    return null;
  };

  const getTrendColor = (change: number) => {
    if (change > 0) {
      return 'text-green-600 bg-green-50 border-green-200';
    } else if (change < 0) {
      return 'text-red-600 bg-red-50 border-red-200';
    }
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  // Identify critical alerts
  const criticalAlerts = useMemo(() => {
    const alerts = [];
    
    if (comparisonData.changes.revenueChangePercent < -20) {
      alerts.push('Revenue dropped significantly');
    }
    
    if (comparisonData.changes.customerChangePercent < -10) {
      alerts.push('Lost customers this period');
    }
    
    if (comparisonData.changes.avgOrderValueChangePercent < -15) {
      alerts.push('Average order value decreased');
    }
    
    return alerts;
  }, [comparisonData]);

  return (
    <Card className="bg-white shadow-lg">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-blue-500" />
          Period Overview
          {criticalAlerts.length > 0 && (
            <AlertTriangle className="w-4 h-4 text-red-500 ml-auto" />
          )}
        </CardTitle>
        
        {/* Critical Alerts */}
        {criticalAlerts.length > 0 && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span className="text-sm font-medium text-red-800">Critical Alerts</span>
            </div>
            <ul className="text-sm text-red-700 space-y-1">
              {criticalAlerts.map((alert, index) => (
                <li key={index} className="flex items-center gap-2">
                  <span className="w-1 h-1 bg-red-600 rounded-full"></span>
                  {alert}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-4 sm:p-6 pt-0">
        {/* Period Labels */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className="text-xs text-gray-500 font-medium">Metric</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 font-medium">{currentPeriodName}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 font-medium">{previousPeriodName}</div>
          </div>
        </div>

        {/* Revenue Comparison */}
        <div className={`border rounded-lg p-4 mb-4 ${getTrendColor(comparisonData.changes.revenueChangePercent)}`}>
          <div className="grid grid-cols-3 gap-4 items-center">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              <span className="font-medium">Total Revenue</span>
              {getTrendIcon(comparisonData.changes.revenueChangePercent)}
            </div>
            <div className="text-center">
              <div className="text-lg font-bold">
                {formatCurrency(comparisonData.currentPeriod.totalRevenue)}
              </div>
              <div className="text-sm text-gray-500">
                {comparisonData.currentPeriod.customerCount} customers
              </div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold">
                {formatCurrency(comparisonData.previousPeriod.totalRevenue)}
              </div>
              <div className="text-sm text-gray-500">
                {comparisonData.previousPeriod.customerCount} customers
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-current">
            <div className="text-center">
              <span className="text-sm font-medium">
                Change: {comparisonData.changes.revenueChange >= 0 ? '+' : ''}
                {formatCurrency(comparisonData.changes.revenueChange)} 
                <span className="ml-1">({comparisonData.changes.revenueChangePercent.toFixed(1)}%)</span>
              </span>
            </div>
          </div>
        </div>

        {/* Quantity Comparison */}
        <div className={`border rounded-lg p-4 mb-4 ${getTrendColor(comparisonData.changes.quantityChangePercent)}`}>
          <div className="grid grid-cols-3 gap-4 items-center">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              <span className="font-medium">Units Sold</span>
              {getTrendIcon(comparisonData.changes.quantityChangePercent)}
            </div>
            <div className="text-center">
              <div className="text-lg font-bold">
                {comparisonData.currentPeriod.totalQuantity.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500">
                {comparisonData.currentPeriod.productCount} products
              </div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold">
                {comparisonData.previousPeriod.totalQuantity.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500">
                {comparisonData.previousPeriod.productCount} products
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-current">
            <div className="text-center">
              <span className="text-sm font-medium">
                Change: {comparisonData.changes.quantityChange >= 0 ? '+' : ''}
                {comparisonData.changes.quantityChange.toLocaleString()}
                <span className="ml-1">({comparisonData.changes.quantityChangePercent.toFixed(1)}%)</span>
              </span>
            </div>
          </div>
        </div>

        {/* Customer Count Comparison */}
        <div className={`border rounded-lg p-4 mb-4 ${getTrendColor(comparisonData.changes.customerChangePercent)}`}>
          <div className="grid grid-cols-3 gap-4 items-center">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              <span className="font-medium">Active Customers</span>
              {getTrendIcon(comparisonData.changes.customerChangePercent)}
            </div>
            <div className="text-center">
              <div className="text-lg font-bold">
                {comparisonData.currentPeriod.customerCount}
              </div>
              <div className="text-sm text-gray-500">
                Avg: {formatCurrency(comparisonData.currentPeriod.avgOrderValue)} per order
              </div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold">
                {comparisonData.previousPeriod.customerCount}
              </div>
              <div className="text-sm text-gray-500">
                Avg: {formatCurrency(comparisonData.previousPeriod.avgOrderValue)} per order
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-current">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <span className="text-sm font-medium">
                  Customers: {comparisonData.changes.customerChange >= 0 ? '+' : ''}
                  {comparisonData.changes.customerChange}
                  <span className="ml-1">({comparisonData.changes.customerChangePercent.toFixed(1)}%)</span>
                </span>
              </div>
              <div>
                <span className="text-sm font-medium">
                  Avg Order: {comparisonData.changes.avgOrderValueChange >= 0 ? '+' : ''}
                  {formatCurrency(comparisonData.changes.avgOrderValueChange)}
                  <span className="ml-1">({comparisonData.changes.avgOrderValueChangePercent.toFixed(1)}%)</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Key Insights */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-800 mb-2">Key Insights</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 bg-blue-600 rounded-full"></span>
              {comparisonData.changes.revenueChangePercent > 0 ? 'Revenue increased' : 'Revenue decreased'} 
              by {Math.abs(comparisonData.changes.revenueChangePercent).toFixed(1)}%
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 bg-blue-600 rounded-full"></span>
              {comparisonData.changes.customerChangePercent > 0 ? 'Gained' : 'Lost'} 
              {Math.abs(comparisonData.changes.customerChange)} customers 
              ({Math.abs(comparisonData.changes.customerChangePercent).toFixed(1)}%)
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1 h-1 bg-blue-600 rounded-full"></span>
              Average order value is {comparisonData.changes.avgOrderValueChangePercent > 0 ? 'increasing' : 'declining'} 
              by {Math.abs(comparisonData.changes.avgOrderValueChangePercent).toFixed(1)}%
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default PeriodOverview;
