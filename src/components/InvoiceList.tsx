import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { AlpineSalesRecord } from '../utils/alpineParser';

interface InvoiceListProps {
  records: AlpineSalesRecord[];
  title?: string;
}

const InvoiceList: React.FC<InvoiceListProps> = ({ 
  records, 
  title = "Sales Records" 
}) => {
  const [showAllRecords, setShowAllRecords] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const displayRecords = showAllRecords ? records : records.slice(0, 10);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            📋 {title}
            <span className="text-sm font-normal text-gray-500">
              ({records.length} records)
            </span>
          </CardTitle>
          {records.length > 10 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAllRecords(!showAllRecords)}
            >
              {showAllRecords ? (
                <>
                  <EyeOff className="w-4 h-4 mr-2" />
                  Show Less
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-2" />
                  Show All
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {records.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No records found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayRecords.map((record, index) => (
              <div
                key={`${record.customerName}-${record.productName}-${record.period}-${index}`}
                className="border rounded-lg p-4 hover:shadow-sm transition-shadow bg-white"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-4 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {record.customerName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {record.customerId && `ID: ${record.customerId}`}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {record.productName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {record.productCode && `Code: ${record.productCode}`}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-gray-900">
                          {formatCurrency(record.revenue)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {record.cases} cases • {record.period}
                        </div>
                      </div>
                    </div>
                    {record.size && (
                      <div className="text-xs text-gray-500">
                        Size: {record.size}
                        {record.mfgItemNumber && ` • MFG: ${record.mfgItemNumber}`}
                        {record.netLbs && record.netLbs > 0 && ` • ${record.netLbs} lbs`}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {!showAllRecords && records.length > 10 && (
              <div className="text-center pt-4">
                <p className="text-sm text-gray-500">
                  Showing 10 of {records.length} records
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>

    </Card>
  );
};

export default InvoiceList;
