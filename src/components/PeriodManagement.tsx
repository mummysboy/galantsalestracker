import React, { useState } from 'react';
import { Trash2, AlertTriangle, Calendar, BarChart3, DollarSign } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { AlpineSalesRecord } from '../utils/alpineParser';

interface PeriodManagementProps {
  alpineData: AlpineSalesRecord[];
  onDeletePeriod: (period: string) => void;
}

const PeriodManagement: React.FC<PeriodManagementProps> = ({ 
  alpineData, 
  onDeletePeriod 
}) => {
  const [periodToDelete, setPeriodToDelete] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleDeleteClick = (period: string) => {
    setPeriodToDelete(period);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    if (periodToDelete) {
      onDeletePeriod(periodToDelete);
    }
    setShowDeleteModal(false);
    setPeriodToDelete(null);
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setPeriodToDelete(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatMonthName = (period: string) => {
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

  // Calculate period statistics
  const periodStats = React.useMemo(() => {
    const periods = Array.from(new Set(alpineData.map(r => r.period))).sort();
    
    return periods.map(period => {
      const periodRecords = alpineData.filter(r => r.period === period);
      const totalRevenue = periodRecords.reduce((sum, r) => sum + r.revenue, 0);
      const totalCases = periodRecords.reduce((sum, r) => sum + r.cases, 0);
      const customerCount = new Set(periodRecords.map(r => r.customerName)).size;
      const productCount = new Set(periodRecords.map(r => r.productName)).size;
      const recordCount = periodRecords.length;

      return {
        period,
        totalRevenue,
        totalCases,
        customerCount,
        productCount,
        recordCount
      };
    });
  }, [alpineData]);

  if (periodStats.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" />
            Period Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">No periods available</p>
            <p className="text-sm">Upload Alpine data to manage periods</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" />
            Period Management
            <span className="text-sm font-normal text-gray-500">
              ({periodStats.length} periods)
            </span>
          </CardTitle>
          <p className="text-sm text-gray-600">
            Manage sales report periods. Delete entire months of data at once.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {periodStats.map((stat) => (
              <div
                key={stat.period}
                className="border rounded-lg p-4 hover:shadow-sm transition-shadow bg-white"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {formatMonthName(stat.period)}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {stat.recordCount} records • {stat.customerCount} customers • {stat.productCount} products
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-green-600" />
                        <div>
                          <div className="font-semibold text-gray-900">
                            {formatCurrency(stat.totalRevenue)}
                          </div>
                          <div className="text-xs text-gray-500">Total Revenue</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-blue-600" />
                        <div>
                          <div className="font-semibold text-gray-900">
                            {stat.totalCases.toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500">Total Cases</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-purple-600" />
                        <div>
                          <div className="font-semibold text-gray-900">
                            {stat.recordCount}
                          </div>
                          <div className="text-xs text-gray-500">Sales Records</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteClick(stat.period)}
                    className="ml-4 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                    title={`Delete all data for ${formatMonthName(stat.period)}`}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Period
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && periodToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[10001]">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Delete Entire Period</h3>
                  <p className="text-sm text-gray-600">This will delete ALL records for this period.</p>
                </div>
              </div>
              
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="text-sm">
                  <div className="font-medium text-gray-900 mb-2">Period to Delete:</div>
                  <div className="text-gray-700">
                    <div className="text-lg font-semibold mb-2">
                      {formatMonthName(periodToDelete)}
                    </div>
                    {(() => {
                      const stat = periodStats.find(s => s.period === periodToDelete);
                      return stat ? (
                        <div className="space-y-1 text-xs">
                          <div><strong>Records:</strong> {stat.recordCount}</div>
                          <div><strong>Revenue:</strong> {formatCurrency(stat.totalRevenue)}</div>
                          <div><strong>Cases:</strong> {stat.totalCases.toLocaleString()}</div>
                          <div><strong>Customers:</strong> {stat.customerCount}</div>
                          <div><strong>Products:</strong> {stat.productCount}</div>
                        </div>
                      ) : null;
                    })()}
                  </div>
                </div>
              </div>

              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="text-sm text-red-800">
                  <strong>⚠️ Warning:</strong> This action cannot be undone. All sales records, 
                  revenue data, and customer information for this period will be permanently deleted.
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={handleCancelDelete}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleConfirmDelete}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Entire Period
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PeriodManagement;
