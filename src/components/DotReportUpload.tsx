import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Upload, FileText, AlertCircle, CheckCircle, X } from 'lucide-react';
import { parseDotCSV } from '../utils/dotParser';
import { AlpineSalesRecord, analyzeCustomerProgress } from '../utils/alpineParser';

interface DotReportUploadProps {
  onDataParsed: (data: { records: AlpineSalesRecord[]; customerProgressions: Map<string, any>; }) => void;
  onClearData: () => void;
  onProcessingComplete?: () => void;
  onUploadStart?: () => void;
  onUploadDescription?: (description: string) => void;
  onUploadEnd?: () => void;
}

const DotReportUpload: React.FC<DotReportUploadProps> = 
  ({ onDataParsed, onClearData, onProcessingComplete, onUploadStart, onUploadDescription, onUploadEnd }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isProcessingComplete, setIsProcessingComplete] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const clearAllData = () => {
    setFiles([]);
    setIsProcessingComplete(false);
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
        const parsed = await parseDotCSV(f);
        allRecords.push(...parsed.records);
      }

      const customers = Array.from(new Set(allRecords.map(r => r.customerName)));
      const customerProgressions = new Map<string, any>();
      customers.forEach(c => customerProgressions.set(c, analyzeCustomerProgress(allRecords, c)));

      await onDataParsed({ records: allRecords, customerProgressions });

      // Push parsed DOT records to Google Sheets via Apps Script
      try {
        const webAppUrl = (process.env.REACT_APP_GS_WEBAPP_URL || '').trim();
        const token = (process.env.REACT_APP_GS_TOKEN || '').trim();
        if (webAppUrl && token && allRecords.length > 0) {
          // Map DOT record to the same row schema used for other uploads
          const rows = allRecords.map(r => {
            // Convert period (YYYY-MM) to a mid-month date for the first column
            const dateStr = `${r.period}-15`;
            // Synthetic key for DOT
            const base = `${dateStr.replace(/-/g,'')}|${r.customerName}|${r.productName}|${r.cases}|${(Math.round(r.revenue*100)/100).toFixed(2)}`.toUpperCase();
            let hash = 5381;
            for (let i = 0; i < base.length; i++) { hash = ((hash << 5) + hash) + base.charCodeAt(i); hash = hash >>> 0; }
            const syntheticKey = `SYN-${dateStr.replace(/-/g,'')}-${hash.toString(36).toUpperCase()}`;
            return [
              dateStr,
              r.customerName,
              r.productName,
              r.productCode || '',  // Add product code
              r.cases,
              Math.round(r.revenue * 100) / 100,
              syntheticKey,
              'DOT CSV',
              new Date().toISOString()
            ];
          });

          console.log('DOT Upload - Sending to Google Sheets:', {
            url: webAppUrl,
            recordCount: rows.length,
            sampleRows: rows.slice(0, 2)
          });

          await fetch(webAppUrl, {
            method: 'POST',
            mode: 'no-cors',
            // Simple request to bypass browser CORS preflight
            body: JSON.stringify({ token, rows })
          });

          console.log('DOT Upload - Data sent successfully to Google Sheets');
        }
      } catch (_e) {
        // Log error but don't fail the upload
        console.warn('DOT Upload - Failed to send to Google Sheets:', _e);
      }

      setIsProcessingComplete(true);
      onUploadDescription?.(`Processed ${allRecords.length} DOT records from ${files.length} file(s)`);
      
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      setErrors([msg]);
      onUploadDescription?.(`Error: ${msg}`);
    } finally {
      setIsProcessing(false);
      onUploadEnd?.();
      if (onProcessingComplete) {
        setTimeout(() => onProcessingComplete(), 1500);
      }
    }
  }, [files, onDataParsed, onProcessingComplete, onUploadStart, onUploadDescription, onUploadEnd]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          DOT Reports
        </CardTitle>
        <p className="text-sm text-gray-600 mt-2">Upload DOT purchase history CSV files. Data will be kept isolated in a separate dashboard.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File Upload Area */}
        <div
          className="border-2 border-dashed border-blue-300 bg-blue-50 rounded-lg p-8 text-center cursor-pointer hover:bg-blue-100 transition-colors"
          onClick={() => document.getElementById('dotFileInput')?.click()}
        >
          <FileText className="w-8 h-8 text-blue-500 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-900">Click to select CSV files</p>
          <p className="text-xs text-gray-600">Drag and drop files here</p>
          <input
            id="dotFileInput"
            type="file"
            multiple
            accept=".csv"
            onChange={(e) => setFiles(Array.from(e.currentTarget.files || []))}
            className="hidden"
          />
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-900">Selected Files:</h3>
            {files.map((file, idx) => (
              <div key={idx} className="flex items-center justify-between bg-gray-50 p-2 rounded text-sm">
                <span className="text-gray-700">{file.name}</span>
                <button
                  onClick={() => setFiles(files.filter((_, i) => i !== idx))}
                  className="text-red-600 hover:text-red-700 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Errors */}
        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded p-3">
            {errors.map((error, idx) => (
              <div key={idx} className="flex items-start gap-2 text-sm text-red-800">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            ))}
          </div>
        )}

        {/* Success Message */}
        {isProcessingComplete && (
          <div className="bg-green-50 border border-green-200 rounded p-3 flex items-start gap-2">
            <CheckCircle className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" />
            <span className="text-sm text-green-800">DOT data processed successfully!</span>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={processFiles}
            disabled={files.length === 0 || isProcessing}
            className="flex-1"
          >
            {isProcessing ? 'Processing...' : 'Process Files'}
          </Button>
          <Button
            variant="outline"
            onClick={clearAllData}
            disabled={files.length === 0 && !isProcessingComplete}
            className="flex-1"
          >
            Clear
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default DotReportUpload;

