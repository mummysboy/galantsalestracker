import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Upload, FileText, AlertCircle, CheckCircle, X } from 'lucide-react';
import { parseMultipleAlpineReports, analyzeCustomerProgress, AlpineSalesRecord, ParsedAlpineData } from '../utils/alpineParser';

interface AlpineReportUploadProps {
  onDataParsed: (data: {
    records: AlpineSalesRecord[];
    customerProgressions: Map<string, any>;
  }) => void;
  onClearData: () => void;
  onProcessingComplete?: () => void;
}

interface AlpineFileState {
  file: File | null;
  period: string; // YYYY-MM format
  content: string;
}

const AlpineReportUpload: React.FC<AlpineReportUploadProps> = ({ 
  onDataParsed, 
  onClearData,
  onProcessingComplete
}) => {
  const [reports, setReports] = useState<AlpineFileState[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isProcessingComplete, setIsProcessingComplete] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const handleFileUpload = useCallback(async (file: File, period: string) => {
    try {
      const content = await file.text();
      
      // Add to reports
      const newReport: AlpineFileState = {
        file,
        period,
        content
      };

      setReports(prev => [...prev, newReport]);
      
    } catch (error) {
      setErrors(prev => [...prev, `Error reading ${file.name}: ${error}`]);
    }
  }, []);

  const processReports = useCallback(async () => {
    console.log('=== PROCESSING STARTED ===');
    console.log('Reports to process:', reports.length);
    
    if (reports.length === 0) {
      console.log('No reports to process');
      return;
    }
    
    setIsProcessing(true);
    setIsProcessingComplete(false);
    setErrors([]);

    try {
      // Parse all reports
      const parsedReports = reports.map(report => ({
        content: report.content,
        period: report.period
      }));

      console.log('About to parse reports with periods:', parsedReports.map(r => r.period));
      
      let data: ParsedAlpineData;
      try {
        data = parseMultipleAlpineReports(parsedReports);
        console.log('Parsing completed successfully');
      } catch (parseError) {
        console.error('Parsing failed with error:', parseError);
        throw parseError;
      }
      
      console.log('=== PARSING RESULTS ===');
      console.log('Records found:', data.records.length);
      console.log('Customers found:', data.metadata.customers.length);
      console.log('Products found:', data.metadata.products.length);
      console.log('Periods found:', data.metadata.periods);
      console.log('Total revenue:', data.metadata.totalRevenue);
      console.log('Revenue by period:', data.metadata.periodRevenue);
      
      if (data.records.length === 0) {
        console.log('ERROR: No records parsed!');
        console.log('First few lines of content:', parsedReports[0].content.split('\n').slice(0, 20));
      }
      
      // Analyze customer progressions based on all records
      const customerProgressions = new Map();
      data.metadata.customers.forEach(customer => {
        const progress = analyzeCustomerProgress(data.records, customer);
        customerProgressions.set(customer, progress);
      });

      console.log('About to call onDataParsed with', data.records.length, 'records');
      console.log('Sample records:', data.records.slice(0, 3).map(r => ({ 
        customer: r.customerName, 
        product: r.productName, 
        period: r.period, 
        revenue: r.revenue 
      })));
      onDataParsed({
        records: data.records,
        customerProgressions
      });
      
      console.log('=== PROCESSING COMPLETED ===');
      setIsProcessingComplete(true);
      setShowSuccessMessage(true);
      
      // Auto-close upload section after successful processing
      setTimeout(() => {
        if (onProcessingComplete) {
          onProcessingComplete();
        }
        console.log('Processing complete, upload section will close');
      }, 2000); // Give user a moment to see the success

    } catch (error) {
      console.error('Processing error:', error);
      setErrors(prev => [...prev, `Processing error: ${error}`]);
    } finally {
      setIsProcessing(false);
    }
  }, [reports, onDataParsed, onProcessingComplete]);

  const removeReport = (index: number) => {
    setReports(prev => prev.filter((_, i) => i !== index));
  };

  const clearAllData = () => {
    setReports([]);
    setErrors([]);
    onClearData();
  };

  const getPeriodFromFileName = (fileName: string): string => {
    // Extract date from filename: "Alpine 6.25 Sales Report.TXT" -> "2025-06"
    const match = fileName.match(/(\d+)\.(\d+)/);
    if (match) {
      const [, month, year] = match;
      const period = `20${year}-${month.padStart(2, '0')}`;
      console.log(`Period detected from filename "${fileName}": ${period}`);
      return period;
    }
    
    // Default to current date if parsing fails
    const defaultPeriod = new Date().toISOString().substring(0, 7);
    console.log(`Period detection failed for "${fileName}", using default: ${defaultPeriod}`);
    return defaultPeriod;
  };

  return (
    <Card className="bg-white shadow-lg">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
          <FileText className="w-5 h-5 text-green-500" />
          Alpine Distributor Reports
        </CardTitle>
        
        <div className="mt-2 text-sm text-gray-600">
          Upload Alpine TXT sales report files to analyze customer progression across time periods
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 pt-0">
        {/* File Upload */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">Upload Alpine Reports</h3>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                type="file"
                accept=".txt"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const period = getPeriodFromFileName(file.name);
                    handleFileUpload(file, period);
                  }
                }}
                className="hidden"
                id="alpine-file-upload"
                multiple
              />
              <label htmlFor="alpine-file-upload" className="cursor-pointer">
                <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-600 mb-2">Click to upload Alpine TXT reports</p>
                <p className="text-xs text-gray-500">Supports multiple files • Auto-detects periods</p>
              </label>
            </div>
          </div>

          {/* Processed Reports */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">Uploaded Reports</h3>
            
            {reports.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-sm">No reports uploaded yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map((report, index) => (
                  <div key={index} className="bg-gray-50 border rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-green-500" />
                      <div>
                        <div className="text-sm font-medium">{report.file?.name}</div>
                        <div className="text-xs text-gray-500">Period: {report.period}</div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeReport(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                
                {/* Process Reports Button */}
                <Button
                  onClick={processReports}
                  disabled={isProcessing || isProcessingComplete}
                  className={`w-full transition-all duration-300 ${
                    isProcessingComplete 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : isProcessing 
                        ? 'bg-blue-600 hover:bg-blue-700' 
                        : ''
                  }`}
                >
                  {isProcessingComplete ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      <span className="animate-pulse">Processing Complete! 🎉</span>
                    </div>
                  ) : isProcessing ? (
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-opacity-30"></div>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-transparent border-t-white absolute top-0 left-0" style={{animationDuration: '0.8s'}}></div>
                      </div>
                      <span className="animate-pulse">Processing Reports...</span>
                    </div>
                  ) : (
                    `Process ${reports.length} Report${reports.length !== 1 ? 's' : ''}`
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span className="text-sm font-medium text-red-700">Processing Errors</span>
            </div>
            <div className="text-sm text-red-600 space-y-1">
              {errors.map((error, index) => (
                <div key={index}>{error}</div>
              ))}
            </div>
          </div>
        )}

        {/* Success Message Overlay */}
        {showSuccessMessage && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center animate-pulse">
              <div className="mb-4">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto animate-bounce" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Processing Complete!</h3>
              <p className="text-gray-600 mb-4">
                Your Alpine reports have been successfully processed and merged with existing data.
              </p>
              <div className="text-sm text-gray-500">
                Returning to dashboard...
              </div>
            </div>
          </div>
        )}

        {/* Summary */}
        {reports.length > 0 && !isProcessingComplete && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">Ready to Analyze</span>
            </div>
            <div className="text-sm text-blue-600 space-y-1">
              <p>• {reports.length} Alpine report{reports.length !== 1 ? 's' : ''} ready for processing</p>
              <p>• Periods: {reports.map(r => r.period).sort().join(', ')}</p>
              <p>• Will analyze customer progression and trends across all periods</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={clearAllData}
            disabled={reports.length === 0}
          >
            Clear All Data
          </Button>
          
          {reports.length > 0 && (
            <div className="text-sm text-gray-600 flex items-center">
              Ready to analyze Alpine customer trends ✨
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AlpineReportUpload;
