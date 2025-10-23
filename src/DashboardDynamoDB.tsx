import React, { useState, useMemo, useEffect } from 'react';
import { useDynamoDB } from './hooks/useDynamoDB';
import { AlpineSalesRecord } from './utils/alpineParser';
import AlpineReportUpload from './components/AlpineReportUpload';
import PetesReportUpload from './components/PetesReportUpload';
import CustomerDetailModal from './components/CustomerDetailModal';

// Import all the existing components and utilities
// ... (keeping all existing imports and types)

const DashboardDynamoDB: React.FC = () => {
  // DynamoDB hook
  const {
    salesRecords,
    loading,
    error,
    saveSalesRecords,
    loadAllSalesRecords,
    saveCustomerProgression,
    loadCustomerProgressionsByDistributor,
    appState,
    saveAppState,
    loadAllAppStates,
    clearDistributorData,
  } = useDynamoDB();


  const handleCloseCustomerModal = () => {
    setIsCustomerModalOpen(false);
    setSelectedCustomerForModal(null);
  };

  // State management
  const [selectedCustomerForModal, setSelectedCustomerForModal] = useState<string | null>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [showUploadSection, setShowUploadSection] = useState(false);
  const [uploadSectionKey, setUploadSectionKey] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);
  const [selectedDistributor, setSelectedDistributor] = useState<'ALPINE' | 'PETES' | 'KEHE' | 'VISTAR' | 'TONYS' | 'TROIA' | 'MHD' | 'ALL'>('ALPINE');
  const [isDistributorDropdownOpen, setIsDistributorDropdownOpen] = useState(false);
  const [displayMode, setDisplayMode] = useState<'revenue' | 'cases'>('cases');

  // Load data on component mount
  useEffect(() => {
    loadAllSalesRecords();
    loadAllAppStates();
  }, [loadAllSalesRecords, loadAllAppStates]);

  // Restore app state from DynamoDB
  useEffect(() => {
    if (appState.size > 0) {
      const savedSelectedMonth = appState.get('selectedMonth');
      const savedSelectedDistributor = appState.get('selectedDistributor');
      const savedDisplayMode = appState.get('displayMode');
      
      if (savedSelectedMonth) setSelectedMonth(savedSelectedMonth);
      if (savedSelectedDistributor) setSelectedDistributor(savedSelectedDistributor);
      if (savedDisplayMode) setDisplayMode(savedDisplayMode);
    }
  }, [appState]);

  // Save app state to DynamoDB when it changes
  useEffect(() => {
    if (selectedMonth) {
      saveAppState('selectedMonth', selectedMonth);
    }
  }, [selectedMonth, saveAppState]);

  useEffect(() => {
    if (selectedDistributor) {
      saveAppState('selectedDistributor', selectedDistributor);
    }
  }, [selectedDistributor, saveAppState]);

  useEffect(() => {
    if (displayMode) {
      saveAppState('displayMode', displayMode);
    }
  }, [displayMode, saveAppState]);

  // Determine current dataset based on distributor
  const currentData = useMemo(() => {
    if (selectedDistributor === 'ALL') {
      return salesRecords;
    }
    return salesRecords.filter(record => record.distributor === selectedDistributor);
  }, [selectedDistributor, salesRecords]);

  // Data for calculations - excludes sub-distributors when viewing "All Businesses"
  const dataForTotals = useMemo(() => {
    console.log('DataForTotals calculation:', {
      selectedMonth,
      selectedDistributor,
      currentDataLength: currentData.length,
      currentDataPeriods: Array.from(new Set(currentData.map(r => r.period))).sort()
    });
    
    // When "All Months" is selected, show all data for the current distributor
    if (selectedMonth === 'ALL_MONTHS') {
      console.log('ALL_MONTHS selected for distributor:', selectedDistributor, currentData.length, 'records');
      return currentData;
    }
    
    if (selectedDistributor === 'ALL') {
      // For 'ALL': combine all data - no need to exclude sub-distributors in DynamoDB version
      const filtered = currentData;
      
      // Debug logging for duplicate detection
      const periodCounts = filtered.reduce((acc, record) => {
        acc[record.period] = (acc[record.period] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const duplicates = Object.entries(periodCounts).filter(([period, count]) => count > 1);
      if (duplicates.length > 0) {
        console.log('Duplicate periods detected:', duplicates);
      }
      
      console.log('ALL distributors (specific month):', filtered.length, 'records');
      return filtered;
    }
    
    console.log('Specific distributor:', selectedDistributor, currentData.length, 'records');
    return currentData;
  }, [currentData, selectedDistributor, selectedMonth]);

  // Get available periods and set default to most recent
  const availablePeriods = useMemo(() => {
    const periods = Array.from(new Set(dataForTotals.map(r => r.period))).sort();
    return periods;
  }, [dataForTotals]);


  // Filter data based on selected month
  const filteredData = useMemo(() => {
    console.log('FilteredData calculation:', {
      selectedMonth,
      selectedDistributor,
      dataForTotalsLength: dataForTotals.length,
      dataForTotalsPeriods: Array.from(new Set(dataForTotals.map(r => r.period))).sort()
    });
    
    if (!selectedMonth || selectedMonth === 'ALL_MONTHS') {
      console.log('Returning all data for totals:', dataForTotals.length, 'records');
      return dataForTotals;
    }
    
    const filtered = dataForTotals.filter(record => record.period === selectedMonth);
    console.log('Filtered to specific month:', selectedMonth, filtered.length, 'records');
    return filtered;
  }, [dataForTotals, selectedMonth, selectedDistributor]);

  // Set default month to most recent when data changes
  React.useEffect(() => {
    if (availablePeriods.length > 0 && !selectedMonth) {
      setSelectedMonth(availablePeriods[availablePeriods.length - 1]);
    }
  }, [availablePeriods, selectedMonth]);

  // Adjust selected month when switching distributors
  React.useEffect(() => {
    if (availablePeriods.length > 0 && !availablePeriods.includes(selectedMonth) && selectedMonth !== 'ALL_MONTHS') {
      setSelectedMonth(availablePeriods[availablePeriods.length - 1]);
    }
  }, [selectedDistributor, availablePeriods, selectedMonth]);

  // Close dropdowns when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isMonthDropdownOpen && !target.closest('.month-dropdown')) {
        setIsMonthDropdownOpen(false);
      }
      if (isDistributorDropdownOpen && !target.closest('.distributor-dropdown')) {
        setIsDistributorDropdownOpen(false);
      }
    };

    if (isMonthDropdownOpen || isDistributorDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMonthDropdownOpen, isDistributorDropdownOpen]);


  // Upload handlers - now save to DynamoDB
  const handleAlpineDataParsed = async (data: { records: AlpineSalesRecord[]; customerProgressions: Map<string, any> }) => {
    console.log('Dashboard received new Alpine data:', {
      recordCount: data.records.length,
      periods: Array.from(new Set(data.records.map(r => r.period))),
      totalRevenue: data.records.reduce((sum, r) => sum + r.revenue, 0),
    });

    try {
      // Convert AlpineSalesRecord to SalesRecord format
      const salesRecords = data.records.map(record => ({
        distributor: 'ALPINE',
        period: record.period,
        customerName: record.customerName,
        productName: record.productName,
        productCode: record.productCode,
        cases: record.cases,
        revenue: record.revenue,
        invoiceKey: `ALPINE-${record.period}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        source: 'Alpine Upload',
        timestamp: new Date().toISOString(),
      }));

      // Save to DynamoDB
      await saveSalesRecords(salesRecords);

      // Save customer progressions
      for (const [customerName, progression] of Array.from(data.customerProgressions.entries())) {
        await saveCustomerProgression('ALPINE', customerName, progression);
      }

      // Reload data to get updated state
      await loadAllSalesRecords();
      await loadCustomerProgressionsByDistributor('ALPINE');

    } catch (error) {
      console.error('Failed to save Alpine data to DynamoDB:', error);
    }
  };

  const handlePetesDataParsed = async (data: { records: AlpineSalesRecord[]; customerProgressions: Map<string, any> }) => {
    console.log('Dashboard received new Pete\'s data:', {
      recordCount: data.records.length,
      periods: Array.from(new Set(data.records.map(r => r.period))),
      totalRevenue: data.records.reduce((sum, r) => sum + r.revenue, 0),
    });

    try {
      const salesRecords = data.records.map(record => ({
        distributor: 'PETES',
        period: record.period,
        customerName: record.customerName,
        productName: record.productName,
        productCode: record.productCode,
        cases: record.cases,
        revenue: record.revenue,
        invoiceKey: `PETES-${record.period}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        source: 'Pete\'s Upload',
        timestamp: new Date().toISOString(),
      }));

      await saveSalesRecords(salesRecords);

      for (const [customerName, progression] of Array.from(data.customerProgressions.entries())) {
        await saveCustomerProgression('PETES', customerName, progression);
      }

      await loadAllSalesRecords();
      await loadCustomerProgressionsByDistributor('PETES');

    } catch (error) {
      console.error('Failed to save Pete\'s data to DynamoDB:', error);
    }
  };


  // Clear data handlers
  const handleClearAlpineData = async () => {
    try {
      await clearDistributorData('ALPINE');
      await loadAllSalesRecords();
    } catch (error) {
      console.error('Failed to clear Alpine data:', error);
    }
  };

  const handleClearPetesData = async () => {
    try {
      await clearDistributorData('PETES');
      await loadAllSalesRecords();
    } catch (error) {
      console.error('Failed to clear Pete\'s data:', error);
    }
  };

  // ... similar handlers for other distributors

  // Processing complete handlers
  const handleProcessingComplete = () => {
    setShowUploadSection(false);
    setUploadSectionKey(prev => prev + 1);
  };

  // Error display
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg shadow-md max-w-md w-full">
          <h2 className="text-xl font-semibold text-red-600 mb-4">Database Error</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading && salesRecords.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading sales data...</p>
        </div>
      </div>
    );
  }

  // Rest of the component JSX would go here...
  // This is a simplified version - you'd need to copy the full JSX from the original Dashboard component
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Sales Tracker (DynamoDB)</h1>
          <p className="text-gray-600 mt-2">Total Records: {salesRecords.length}</p>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Upload Reports</h2>
          <button
            onClick={() => setShowUploadSection(!showUploadSection)}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            {showUploadSection ? 'Hide Upload Section' : 'Show Upload Section'}
          </button>

          {showUploadSection && (
            <div className="mt-6 space-y-6">
              <AlpineReportUpload
                key={`alpine-${uploadSectionKey}`}
                onDataParsed={handleAlpineDataParsed}
                onClearData={handleClearAlpineData}
                onProcessingComplete={handleProcessingComplete}
              />
              <PetesReportUpload
                key={`petes-${uploadSectionKey}`}
                onDataParsed={handlePetesDataParsed}
                onClearData={handleClearPetesData}
                onProcessingComplete={handleProcessingComplete}
              />
              {/* Add other upload components */}
            </div>
          )}
        </div>

        {/* Data Display */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Sales Data</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded">
              <h3 className="font-medium text-gray-700">Total Revenue</h3>
              <p className="text-2xl font-bold text-green-600">
                ${filteredData.reduce((sum, r) => sum + r.revenue, 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded">
              <h3 className="font-medium text-gray-700">Total Cases</h3>
              <p className="text-2xl font-bold text-blue-600">
                {filteredData.reduce((sum, r) => sum + r.cases, 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded">
              <h3 className="font-medium text-gray-700">Unique Customers</h3>
              <p className="text-2xl font-bold text-purple-600">
                {new Set(filteredData.map(r => r.customerName)).size}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {isCustomerModalOpen && selectedCustomerForModal && (
        <CustomerDetailModal
          customerName={selectedCustomerForModal}
          currentInvoices={[]}
          previousInvoices={[]}
          isOpen={isCustomerModalOpen}
          onClose={handleCloseCustomerModal}
          alpineData={filteredData.filter(r => r.customerName === selectedCustomerForModal).map(record => ({
            customerName: record.customerName,
            productName: record.productName,
            productCode: record.productCode,
            cases: record.cases,
            pieces: record.cases * 12, // Default assumption
            revenue: record.revenue,
            period: record.period,
            size: undefined,
            netLbs: undefined,
            mfgItemNumber: undefined,
            customerId: undefined,
            itemNumber: undefined,
            accountName: undefined,
            excludeFromTotals: undefined,
            isAdjustment: undefined,
            pack: undefined,
            sizeOz: undefined,
            weightLbs: undefined,
          }))}
        />
      )}
    </div>
  );
};

export default DashboardDynamoDB;
