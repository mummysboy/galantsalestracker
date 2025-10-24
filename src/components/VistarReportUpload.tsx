import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Upload, FileText, AlertCircle, CheckCircle, X } from 'lucide-react';
import { parseVistarCSV } from '../utils/vistarParser';
import { AlpineSalesRecord, analyzeCustomerProgress } from '../utils/alpineParser';

interface VistarReportUploadProps {
  onDataParsed: (data: { records: AlpineSalesRecord[]; customerProgressions: Map<string, any>; }) => void;
  onClearData: () => void;
  onProcessingComplete?: () => void;
  onUploadStart?: () => void;
  onUploadDescription?: (description: string) => void;
  onUploadEnd?: () => void;
}

const VistarReportUpload: React.FC<VistarReportUploadProps> = ({ onDataParsed, onClearData, onProcessingComplete, onUploadStart, onUploadDescription, onUploadEnd }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isProcessingComplete, setIsProcessingComplete] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const handleFileUpload = useCallback((file: File) => {
    setFiles(prev => [...prev, file]);
  }, []);

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearAllData = () => {
    setFiles([]);
    setErrors([]);
    onClearData();
  };

  const processFiles = useCallback(async () => {
    if (files.length === 0) return;
    setIsProcessing(true);
    setIsProcessingComplete(false);
    setErrors([]);
    onUploadStart?.();

    try {
      const allRecords: AlpineSalesRecord[] = [];
      for (const f of files) {
        const parsed = await parseVistarCSV(f);
        allRecords.push(...parsed.records);
      }

      const customers = Array.from(new Set(allRecords.map(r => r.customerName)));
      const customerProgressions = new Map<string, any>();
      customers.forEach(c => customerProgressions.set(c, analyzeCustomerProgress(allRecords, c)));

      await await onDataParsed({ records: allRecords, customerProgressions });

      try {
        const webAppUrl = (process.env.REACT_APP_GS_WEBAPP_URL || '').trim();
        const token = (process.env.REACT_APP_GS_TOKEN || '').trim();
        if (webAppUrl && token && allRecords.length > 0) {
          const rows = allRecords.map(r => {
            // Build hierarchical customer name: "Vendor - Customer"
            // This allows Google Sheets to display vendor > customer > product hierarchy
            const hierarchicalCustomer = r.accountName && r.accountName !== r.customerName
              ? `${r.customerName} - ${r.accountName}`
              : r.customerName;
            
            return [
              `${r.period}-15`,
              hierarchicalCustomer,
              r.productName,
              r.productCode || '',  // Add product code
              r.cases,
              Math.round(r.revenue * 100) / 100,
              // Synthetic invoice key
              (() => {
                const dateStr = `${r.period.replace(/-/g,'')}|${hierarchicalCustomer}|${r.productName}|${r.cases}|${(Math.round(r.revenue*100)/100).toFixed(2)}`.toUpperCase();
                let hash = 5381; for (let i = 0; i < dateStr.length; i++) { hash = ((hash << 5) + hash) + dateStr.charCodeAt(i); hash = hash >>> 0; }
                return `SYN-${r.period.replace(/-/g,'')}-${hash.toString(36).toUpperCase()}`;
              })(),
              "Vistar CSV",
              new Date().toISOString()
            ];
          });
          await fetch(webAppUrl, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ token, rows }) });
        }
      } catch (_e) {}

      setIsProcessingComplete(true);
      setShowSuccessMessage(true);
      setTimeout(() => {
        if (onProcessingComplete) onProcessingComplete();
      }, 1500);
    } catch (e: any) {
      setErrors(prev => [...prev, e?.message || 'Unknown error processing files']);
    } finally {
      setIsProcessing(false);
    }
  }, [files, onDataParsed, onProcessingComplete]);

  return (
    <Card className="bg-white shadow-lg">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
          <FileText className="w-5 h-5 text-purple-600" />
          Vistar Distributor Reports
        </CardTitle>
        <div className="mt-2 text-sm text-gray-600">
          Upload Vistar CSV reports to analyze sales data
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">Upload Vistar Reports</h3>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                type="file"
                accept=".csv"
                onChange={(e) => {
                  const fs = Array.from(e.target.files || []);
                  if (fs.length > 0) {
                    fs.forEach(file => handleFileUpload(file));
                    e.currentTarget.value = '';
                  }
                }}
                className="hidden"
                id="vistar-file-upload"
                multiple
              />
              <label htmlFor="vistar-file-upload" className="cursor-pointer">
                <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-600 mb-2">Click to upload Vistar CSV reports</p>
                <p className="text-xs text-gray-500">Supports multiple files • Auto-detects periods from filename</p>
              </label>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">Uploaded Reports</h3>
            {files.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-sm">No reports uploaded yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {files.map((f, idx) => (
                  <div key={idx} className="bg-gray-50 border rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-purple-600" />
                      <div>
                        <div className="text-sm font-medium">{f.name}</div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => removeFile(idx)} className="text-red-600 hover:text-red-700">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button onClick={processFiles} disabled={isProcessing || isProcessingComplete} className={`w-full ${isProcessingComplete ? 'bg-green-600 hover:bg-green-700' : ''}`}>
                  {isProcessingComplete ? (
                    <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4" /><span className="animate-pulse">Processing Complete! 🎉</span></div>
                  ) : isProcessing ? (
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-opacity-30"></div>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-transparent border-t-white absolute top-0 left-0" style={{animationDuration: '0.8s'}}></div>
                      </div>
                      <span className="animate-pulse">Processing Reports...</span>
                    </div>
                  ) : (
                    `Process ${files.length} File${files.length !== 1 ? 's' : ''}`
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>

        {errors.length > 0 && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2"><AlertCircle className="w-4 h-4 text-red-600" /><span className="text-sm font-medium text-red-700">Processing Errors</span></div>
            <div className="text-sm text-red-600 space-y-1">{errors.map((e, i) => (<div key={i}>{e}</div>))}</div>
          </div>
        )}

        {showSuccessMessage && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center animate-pulse">
              <div className="mb-4"><CheckCircle className="w-16 h-16 text-green-500 mx-auto animate-bounce" /></div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Processing Complete!</h3>
              <p className="text-gray-600 mb-4">Your Vistar reports have been successfully processed.</p>
              <div className="text-sm text-gray-500">Returning to dashboard...</div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <Button variant="outline" size="sm" onClick={clearAllData} disabled={files.length === 0}>Clear All Data</Button>
          {files.length > 0 && (<div className="text-sm text-gray-600 flex items-center">Ready to analyze Vistar sales ✨</div>)}
        </div>
      </CardContent>
    </Card>
  );
};

export default VistarReportUpload;

