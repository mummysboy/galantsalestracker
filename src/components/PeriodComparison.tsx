import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { TrendingUp, TrendingDown, Minus, Package, Users } from 'lucide-react';
import { AlpineSalesRecord } from '../utils/alpineParser';

interface PeriodComparisonProps {
  alpineData: AlpineSalesRecord[];
  selectedMonth?: string; // YYYY-MM from Dashboard month selector
}

interface CustomerComparison {
  customerName: string;
  periods: {
    period: string;
    revenue: number;
    cases: number;
    productCount: number;
    topProducts: Array<{ productName: string; revenue: number; cases: number }>;
  }[];
  latestTrend: 'increasing' | 'decreasing' | 'stable' | 'new' | 'lost';
  changeFromPrevious: {
    revenueChange: number;
    revenuePercentChange: number;
    caseChange: number;
    casePercentChange: number;
  };
}

const PeriodComparison: React.FC<PeriodComparisonProps> = ({ alpineData, selectedMonth }) => {
  const [sortBy, setSortBy] = useState<'revenue' | 'cases' | 'change'>('change');

  const availablePeriods = useMemo(() => {
    return Array.from(new Set(alpineData.map(record => record.period))).sort();
  }, [alpineData]);

  // Set default periods based on available data (most recent vs previous)
  const [selectedPeriods, setSelectedPeriods] = useState<string[]>([]);

  // Helper to compute previous period string (YYYY-MM)
  const getPreviousPeriod = (period: string) => {
    if (!period) return null;
    const [y, m] = period.split('-').map(Number);
    if (!y || !m) return null;
    const d = new Date(y, m - 2, 1); // previous month
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}`;
  };

  // Set default periods when data or dashboard-selected month changes
  useEffect(() => {
    console.log('PeriodComparison - Available periods:', availablePeriods);
    console.log('PeriodComparison - Current selected periods:', selectedPeriods);

    // If Dashboard provided a selected month, prefer it with its previous month
    if (selectedMonth) {
      const prev = getPreviousPeriod(selectedMonth);
      const sorted = [...availablePeriods].sort();
      const hasCurrent = sorted.includes(selectedMonth);
      const hasPrev = prev ? sorted.includes(prev) : false;

      if (hasCurrent && hasPrev) {
        const newSel = [prev as string, selectedMonth];
        if (JSON.stringify(newSel) !== JSON.stringify(selectedPeriods)) {
          console.log('PeriodComparison - Syncing to dashboard months:', newSel);
          setSelectedPeriods(newSel);
          return;
        }
      }
    }

    // Fallbacks when no dashboard month or missing data
    if (availablePeriods.length >= 2 && selectedPeriods.length === 0) {
      const sortedPeriods = [...availablePeriods].sort();
      const newPeriods = [sortedPeriods[sortedPeriods.length - 2], sortedPeriods[sortedPeriods.length - 1]];
      console.log('PeriodComparison - Setting default periods:', newPeriods);
      setSelectedPeriods(newPeriods);
    } else if (availablePeriods.length === 1 && selectedPeriods.length === 0) {
      console.log('PeriodComparison - Only one period available, comparing with itself');
      setSelectedPeriods([availablePeriods[0], availablePeriods[0]]);
    }
  }, [availablePeriods, selectedPeriods, selectedMonth]);

  // Define helper function inside the component
  const groupProductsByRevenue = (records: AlpineSalesRecord[]) => {
    const grouped = records.reduce((acc, record) => {
      acc[record.productName] = (acc[record.productName] || 0) + record.revenue;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grouped)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([productName, revenue]) => ({
        productName,
        revenue,
        cases: records.find(r => r.productName === productName)?.cases || 0
      }));
  };

  const comparisons = useMemo(() => {
    console.log('PeriodComparison - Calculating comparisons for periods:', selectedPeriods);
    console.log('PeriodComparison - Alpine data length:', alpineData.length);
    
    if (selectedPeriods.length < 2) {
      console.log('PeriodComparison - Not enough periods selected, returning empty comparisons');
      return [];
    }

    const customerGroups = alpineData.reduce((acc, record) => {
      if (!acc[record.customerName]) {
        acc[record.customerName] = {};
      }
      if (!acc[record.customerName][record.period]) {
        acc[record.customerName][record.period] = [];
      }
      acc[record.customerName][record.period].push(record);
      return acc;
    }, {} as Record<string, Record<string, AlpineSalesRecord[]>>);

    const comparisons: CustomerComparison[] = [];

    Object.entries(customerGroups).forEach(([customerName, periods]) => {
      const availableForCustomer = Object.keys(periods).sort();
      const firstPeriod = selectedPeriods[0];
      const secondPeriod = selectedPeriods[1];

      console.log(`PeriodComparison - Customer ${customerName} has periods:`, availableForCustomer);
      console.log(`PeriodComparison - Looking for periods:`, firstPeriod, secondPeriod);

      // Include customers that have data in either selected period; default missing to 0
      const hasFirst = availableForCustomer.includes(firstPeriod);
      const hasSecond = availableForCustomer.includes(secondPeriod);

      if (hasFirst || hasSecond) {
        const firstPeriodData = hasFirst ? (periods[firstPeriod] || []) : [];
        const secondPeriodData = hasSecond ? (periods[secondPeriod] || []) : [];

        const firstPeriodSummary = {
          period: firstPeriod,
          revenue: firstPeriodData.reduce((sum, r) => sum + r.revenue, 0),
          cases: firstPeriodData.reduce((sum, r) => sum + r.cases, 0),
          productCount: firstPeriodData.length,
          topProducts: groupProductsByRevenue(firstPeriodData)
        };

        const secondPeriodSummary = {
          period: secondPeriod,
          revenue: secondPeriodData.reduce((sum, r) => sum + r.revenue, 0),
          cases: secondPeriodData.reduce((sum, r) => sum + r.cases, 0),
          productCount: secondPeriodData.length,
          topProducts: groupProductsByRevenue(secondPeriodData)
        };

        const revenueChange = secondPeriodSummary.revenue - firstPeriodSummary.revenue;
        const revenuePercentChange = firstPeriodSummary.revenue > 0 
          ? (revenueChange / firstPeriodSummary.revenue) * 100 
          : secondPeriodSummary.revenue > 0 ? 100 : 0;

        const caseChange = secondPeriodSummary.cases - firstPeriodSummary.cases;
        const casePercentChange = firstPeriodSummary.cases > 0 
          ? (caseChange / firstPeriodSummary.cases) * 100 
          : secondPeriodSummary.cases > 0 ? 100 : 0;

        let latestTrend: 'increasing' | 'decreasing' | 'stable' | 'new' | 'lost';
        if (firstPeriodSummary.revenue === 0 && secondPeriodSummary.revenue > 0) {
          latestTrend = 'new';
        } else if (firstPeriodSummary.revenue > 0 && secondPeriodSummary.revenue === 0) {
          latestTrend = 'lost';
        } else if (Math.abs(revenuePercentChange) < 5) {
          latestTrend = 'stable';
        } else if (revenueChange > 0) {
          latestTrend = 'increasing';
        } else {
          latestTrend = 'decreasing';
        }

        comparisons.push({
          customerName,
          periods: [firstPeriodSummary, secondPeriodSummary],
          latestTrend,
          changeFromPrevious: {
            revenueChange,
            revenuePercentChange,
            caseChange,
            casePercentChange
          }
        });
      }
    });

    console.log('PeriodComparison - Found comparisons:', comparisons.length);
    console.log('PeriodComparison - Comparisons data:', comparisons);

    // Sort comparisons
    comparisons.sort((a, b) => {
      switch (sortBy) {
        case 'revenue': {
          const aDelta = a.changeFromPrevious.revenueChange;
          const bDelta = b.changeFromPrevious.revenueChange;
          const aPos = aDelta >= 0 ? 1 : 0;
          const bPos = bDelta >= 0 ? 1 : 0;
          // Positives first
          if (aPos !== bPos) return bPos - aPos;
          // Within positives: larger gains first; within negatives: more negative later (i.e., closer to zero last)
          if (aPos === 1) return bDelta - aDelta;
          // For negatives, sort by change ascending (e.g., -10 before -100? Or the opposite?)
          // Show larger magnitude losses later to keep worst at the bottom when positives first
          return aDelta - bDelta;
        }
        case 'cases':
          return Math.abs(b.changeFromPrevious.caseChange) - Math.abs(a.changeFromPrevious.caseChange);
        case 'change':
        default: {
          const aPct = a.changeFromPrevious.revenuePercentChange;
          const bPct = b.changeFromPrevious.revenuePercentChange;
          const aPos = aPct >= 0 ? 1 : 0;
          const bPos = bPct >= 0 ? 1 : 0;
          // Positives first
          if (aPos !== bPos) return bPos - aPos;
          // Within positives: descending (largest gains first)
          if (aPos === 1) return bPct - aPct;
          // Within negatives: ascending (most negative first)
          return aPct - bPct;
        }
      }
    });

    return comparisons;
  }, [alpineData, selectedPeriods, sortBy]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (period: string) => {
    const [year, month] = period.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'decreasing':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      case 'new':
        return <div className="w-4 h-4 border-2 border-blue-500 rounded-full bg-blue-100" />;
      case 'lost':
        return <div className="w-4 h-4 bg-gray-400 rounded-full" />;
      default:
        return <Minus className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return 'text-green-600 bg-green-100';
      case 'decreasing':
        return 'text-red-600 bg-red-100';
      case 'new':
        return 'text-blue-600 bg-blue-100';
      case 'lost':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-cols-4">
      {/* Period Selector */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📊 Period Comparison Tool
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Compare:</span>
              <select 
                value={selectedPeriods[0]}
                onChange={(e) => setSelectedPeriods([e.target.value, selectedPeriods[1]])}
                className="border border-gray-300 rounded px-3 py-1 text-sm"
              >
                {availablePeriods.map(period => (
                  <option key={period} value={period}>
                    {formatDate(period)}
                  </option>
                ))}
              </select>
              <span className="text-sm">vs</span>
              <select 
                value={selectedPeriods[1]}
                onChange={(e) => setSelectedPeriods([selectedPeriods[0], e.target.value])}
                className="border border-gray-300 rounded px-3 py-1 text-sm"
              >
                {availablePeriods.map(period => (
                  <option key={period} value={period}>
                    {formatDate(period)}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Sort by:</span>
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'revenue' | 'cases' | 'change')}
                className="border border-gray-300 rounded px-3 py-1 text-sm"
              >
                <option value="change">Biggest % Change</option>
                <option value="revenue">Revenue Impact</option>
                <option value="cases">Volume Change</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              <div>
                <div className="text-sm text-gray-600">Customers Analyzed</div>
                <div className="text-lg font-bold">{comparisons.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <div>
                <div className="text-sm text-gray-600">Growing Customers</div>
                <div className="text-lg font-bold text-green-600">
                  {comparisons.filter(c => c.latestTrend === 'increasing').length}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-red-500" />
              <div>
                <div className="text-sm text-gray-600">Declining Customers</div>
                <div className="text-lg font-bold text-red-600">
                  {comparisons.filter(c => c.latestTrend === 'decreasing').length}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customer Comparisons */}
      <div className="space-y-4">
        {comparisons.map((comparison) => {
          const firstPeriod = comparison.periods[0];
          const secondPeriod = comparison.periods[1];
          
          return (
            <Card key={comparison.customerName}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getTrendIcon(comparison.latestTrend)}
                    <CardTitle className="text-lg">{comparison.customerName}</CardTitle>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${getTrendColor(comparison.latestTrend)}`}>
                    {comparison.latestTrend.toUpperCase()}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Period Comparison */}
                  <div>
                    <h4 className="font-medium mb-3">Period Comparison</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <span className="text-sm font-medium">{formatDate(firstPeriod.period)}</span>
                        <div className="text-right">
                          <div className="font-semibold">{formatCurrency(firstPeriod.revenue)}</div>
                          <div className="text-xs text-gray-500">{firstPeriod.cases} cases</div>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center p-3 bg-blue-50 rounded border border-blue-200">
                        <span className="text-sm font-medium text-blue-800">{formatDate(secondPeriod.period)}</span>
                        <div className="text-right">
                          <div className="font-semibold text-blue-800">{formatCurrency(secondPeriod.revenue)}</div>
                          <div className="text-xs text-blue-600">{secondPeriod.cases} cases</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Changes */}
                  <div>
                    <h4 className="font-medium mb-3">Changes</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span className="text-sm">Revenue Change:</span>
                        <div className={`font-semibold ${comparison.changeFromPrevious.revenueChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {comparison.changeFromPrevious.revenueChange >= 0 ? '+' : ''}{formatCurrency(comparison.changeFromPrevious.revenueChange)}
                          <span className="text-xs ml-1">
                            ({comparison.changeFromPrevious.revenuePercentChange >= 0 ? '+' : ''}{comparison.changeFromPrevious.revenuePercentChange.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span className="text-sm">Volume Change:</span>
                        <div className={`font-semibold ${comparison.changeFromPrevious.caseChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {comparison.changeFromPrevious.caseChange >= 0 ? '+' : ''}{comparison.changeFromPrevious.caseChange} cases
                          <span className="text-xs ml-1">
                            ({comparison.changeFromPrevious.casePercentChange >= 0 ? '+' : ''}{comparison.changeFromPrevious.casePercentChange.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span className="text-sm">Product Range:</span>
                        <div className="font-semibold">
                          {secondPeriod.productCount} products
                          {secondPeriod.productCount !== firstPeriod.productCount && (
                            <span className={`text-xs ml-1 ${secondPeriod.productCount > firstPeriod.productCount ? 'text-green-600' : 'text-red-600'}`}>
                              ({secondPeriod.productCount > firstPeriod.productCount ? '+' : ''}{secondPeriod.productCount - firstPeriod.productCount})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Top Products Comparison */}
                <div className="mt-4">
                  <h5 className="font-medium mb-2">Top Products</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-medium text-gray-600 mb-2">{formatDate(firstPeriod.period)}</div>
                      <div className="space-y-1">
                        {firstPeriod.topProducts.map((product, index) => (
                          <div key={index} className="flex justify-between text-sm">
                            <span className="truncate">{product.productName}</span>
                            <span>{formatCurrency(product.revenue)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-600 mb-2">{formatDate(secondPeriod.period)}</div>
                      <div className="space-y-1">
                        {secondPeriod.topProducts.map((product, index) => (
                          <div key={index} className="flex justify-between text-sm">
                            <span className="truncate">{product.productName}</span>
                            <span>{formatCurrency(product.revenue)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {comparisons.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">No matching data found</p>
            <p className="text-sm">Try selecting different periods for comparison</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PeriodComparison;

