import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Upload, FileText, AlertCircle, CheckCircle, X } from 'lucide-react';
import { parseInvoiceCSV, parseBiRiteCSV, InvoiceRecord, ParsedCSVData, CSVParseError } from '../utils/csvParser';

interface CSVUploadProps {
  onDataUploaded: (data: { currentInvoices: InvoiceRecord[]; previousInvoices: InvoiceRecord[] }) => void;
  onClearData: () => void;
}

interface UploadState {
  currentFile: File | null;
  previousFile: File | null;
  currentData: ParsedCSVData | null;
  previousData: ParsedCSVData | null;
  errors: CSVParseError[];
  success: boolean;
}

const CSVUpload: React.FC<CSVUploadProps> = ({ onDataUploaded, onClearData }) => {
  const [uploadState, setUploadState] = useState<UploadState>({
    currentFile: null,
    previousFile: null,
    currentData: null,
    previousData: null,
    errors: [],
    success: false
  });

  const [parsingProgress, setParsingProgress] = useState<{
    isParsing: boolean;
    progress: number;
    message: string;
  }>({
    isParsing: false,
    progress: 0,
    message: ''
  });

  const [columnMappings, setColumnMappings] = useState({
    customerColumn: 'Customer',
    productColumn: 'Product',
    quantityColumn: 'Quantity',
    revenueColumn: 'Revenue',
    dateColumn: 'Date'
  });

  const [parseMode, setParseMode] = useState<'custom' | 'birite'>('custom');

  const handleFileUpload = useCallback(async (
    file: File,
    period: 'current' | 'previous'
  ) => {
    setParsingProgress({
      isParsing: true,
      progress: 0,
      message: `Reading ${file.name}...`
    });

    try {
      const text = await file.text();
      setParsingProgress({
        isParsing: true,
        progress: 50,
        message: 'Parsing CSV data...'
      });

      let parseResult;
      if (parseMode === 'birite') {
        parseResult = parseBiRiteCSV(text);
      } else {
        parseResult = parseInvoiceCSV(text, {
          columnMappings,
          delimiter: ',',
          currencySymbol: '$'
        });
      }

      setParsingProgress({
        isParsing: true,
        progress: 90,
        message: 'Processing data...'
      });

      const newState = {
        ...uploadState,
        [`${period}File`]: file,
        [`${period}Data`]: parseResult.data,
        errors: period === 'current' ? parseResult.errors : [...uploadState.errors, ...parseResult.errors]
      };

      setUploadState(newState);

      setParsingProgress({
        isParsing: false,
        progress: 100,
        message: `Successfully processed ${file.name}`
      });

      // Check if both files are uploaded
      if (newState.currentData && newState.previousData) {
        onDataUploaded({
          currentInvoices: newState.currentData.records,
          previousInvoices: newState.previousData.records
        });
        setUploadState(prev => ({ ...prev, success: true }));
      }

    } catch (error) {
      setUploadState(prev => ({
        ...prev,
        errors: [...prev.errors, {
          row: 0,
          column: 'file',
          value: file.name,
          message: `Error reading file: ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      }));
      
      setParsingProgress({
        isParsing: false,
        progress: 0,
        message: 'Error processing file'
      });
    }
  }, [uploadState, columnMappings, parseMode, onDataUploaded]);

  const handleFileSelect = (
    event: React.ChangeEvent<HTMLInputElement>,
    period: 'current' | 'previous'
  ) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      handleFileUpload(file, period);
    }
  };

  const clearData = () => {
    setUploadState({
      currentFile: null,
      previousFile: null,
      currentData: null,
      previousData: null,
      errors: [],
      success: false
    });
    onClearData();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <Card className="bg-white shadow-lg">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="text-base sm:text-lg font-semibold flex items-center gap-2">
          <Upload className="w-5 h-5 text-blue-500" />
          Upload Invoice Data
        </CardTitle>
        
        {/* Parse Mode Selection */}
        <div className="mt-4">
          <label className="text-sm font-medium text-gray-700 mb-2 block">CSV Format:</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="parseMode"
                checked={parseMode === 'custom'}
                onChange={() => setParseMode('custom')}
                className="rounded"
              />
              Custom Format
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="parseMode"
                checked={parseMode === 'birite'}
                onChange={() => setParseMode('birite')}
                className="rounded"
              />
              BiRite Format (from your sample file)
            </label>
          </div>
        </div>

        {/* Column Mappings for Custom Format */}
        {parseMode === 'custom' && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <label className="text-sm font-medium text-gray-700 mb-3 block">Column Mappings:</label>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Customer Column:</label>
                <input
                  type="text"
                  value={columnMappings.customerColumn}
                  onChange={(e) => setColumnMappings(prev => ({ ...prev, customerColumn: e.target.value }))}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                  placeholder="e.g., Customer, Client"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Product Column:</label>
                <input
                  type="text"
                  value={columnMappings.productColumn}
                  onChange={(e) => setColumnMappings(prev => ({ ...prev, productColumn: e.target.value }))}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                  placeholder="e.g., Product, Item"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Quantity Column:</label>
                <input
                  type="text"
                  value={columnMappings.quantityColumn}
                  onChange={(e) => setColumnMappings(prev => ({ ...prev, quantityColumn: e.target.value }))}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                  placeholder="e.g., Quantity, Qty, Cases"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Revenue Column:</label>
                <input
                  type="text"
                  value={columnMappings.revenueColumn}
                  onChange={(e) => setColumnMappings(prev => ({ ...prev, revenueColumn: e.target.value }))}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                  placeholder="e.g., Revenue, Amount, Total"
                />
              </div>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-4 sm:p-6 pt-0">
        {/* File Upload Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Current Period Upload */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-green-500" />
              Current Period Data
            </h3>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
              <input
                type="file"
                accept=".csv"
                onChange={(e) => handleFileSelect(e, 'current')}
                className="hidden"
                id="current-file-upload"
              />
              <label htmlFor="current-file-upload" className="cursor-pointer">
                <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-600 mb-2">Click to upload current invoice data</p>
                <p className="text-xs text-gray-500">CSV files only</p>
              </label>
            </div>

            {uploadState.currentFile && (
              <div className="bg-white border rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium">{uploadState.currentFile.name}</span>
                  </div>
                  <span className="text-xs text-gray-500">{formatFileSize(uploadState.currentFile.size)}</span>
                </div>
                
                {uploadState.currentData && (
                  <div className="mt-2 text-xs text-gray-600">
                    <p>{uploadState.currentData.metadata.totalRecords} records</p>
                    <p>{uploadState.currentData.metadata.uniqueCustomers} customers</p>
                    <p>{uploadState.currentData.metadata.uniqueProducts} products</p>
                    <p>{formatCurrency(uploadState.currentData.metadata.totalRevenue)} total revenue</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Previous Period Upload */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-orange-500" />
              Previous Period Data
            </h3>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
              <input
                type="file"
                accept=".csv"
                onChange={(e) => handleFileSelect(e, 'previous')}
                className="hidden"
                id="previous-file-upload"
              />
              <label htmlFor="previous-file-upload" className="cursor-pointer">
                <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-600 mb-2">Click to upload previous invoice data</p>
                <p className="text-xs text-gray-500">CSV files only</p>
              </label>
            </div>

            {uploadState.previousFile && (
              <div className="bg-white border rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-orange-500" />
                    <span className="text-sm font-medium">{uploadState.previousFile.name}</span>
                  </div>
                  <span className="text-xs text-gray-500">{formatFileSize(uploadState.previousFile.size)}</span>
                </div>
                
                {uploadState.previousData && (
                  <div className="mt-2 text-xs text-gray-600">
                    <p>{uploadState.previousData.metadata.totalRecords} records</p>
                    <p>{uploadState.previousData.metadata.uniqueCustomers} customers</p>
                    <p>{uploadState.previousData.metadata.uniqueProducts} products</p>
                    <p>{formatCurrency(uploadState.previousData.metadata.totalRevenue)} total revenue</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Parsing Progress */}
        {parsingProgress.isParsing && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm text-blue-700">{parsingProgress.message}</span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${parsingProgress.progress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Success Message */}
        {uploadState.success && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Data successfully uploaded!</span>
            </div>
            <p className="text-xs text-green-600 mt-1">
              Both current and previous period data are now loaded. You can view comparisons and alerts.
            </p>
          </div>
        )}

        {/* Error Display */}
        {uploadState.errors.length > 0 && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span className="text-sm font-medium text-red-700">Parse Errors</span>
            </div>
            <div className="text-xs text-red-600 space-y-1 max-h-32 overflow-y-auto">
              {uploadState.errors.map((error, index) => (
                <div key={index} className="flex items-start gap-2">
                  <span className="text-red-500">Row {error.row}:</span>
                  <span>{error.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between items-center mt-6 pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={clearData}
            disabled={!uploadState.currentFile && !uploadState.previousFile}
          >
            <X className="w-4 h-4 mr-2" />
            Clear Data
          </Button>
          
          {uploadState.success && (
            <div className="text-sm text-gray-600">
              Ready for analysis ✨
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CSVUpload;
