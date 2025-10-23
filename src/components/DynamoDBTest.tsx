import React, { useState } from 'react';
import { useDynamoDB } from '../hooks/useDynamoDB';

const DynamoDBTest: React.FC = () => {
  const { 
    loading, 
    error, 
    saveAppState, 
    loadAppState, 
    salesRecords,
    loadAllSalesRecords 
  } = useDynamoDB();
  
  const [testKey, setTestKey] = useState('test-key');
  const [testValue, setTestValue] = useState('test-value');
  const [loadedValue, setLoadedValue] = useState<string | null>(null);

  const handleSaveTest = async () => {
    try {
      await saveAppState(testKey, testValue);
      alert('Test data saved successfully!');
    } catch (err) {
      alert(`Error saving: ${err}`);
    }
  };

  const handleLoadTest = async () => {
    try {
      const value = await loadAppState(testKey);
      setLoadedValue(value);
    } catch (err) {
      alert(`Error loading: ${err}`);
    }
  };

  const handleLoadSalesRecords = async () => {
    try {
      await loadAllSalesRecords();
      alert(`Loaded ${salesRecords.length} sales records`);
    } catch (err) {
      alert(`Error loading sales records: ${err}`);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6">DynamoDB Connection Test</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Error:</strong> {error}
        </div>
      )}

      {loading && (
        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4">
          Loading...
        </div>
      )}

      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">Test App State</h3>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={testKey}
              onChange={(e) => setTestKey(e.target.value)}
              placeholder="Key"
              className="flex-1 px-3 py-2 border border-gray-300 rounded"
            />
            <input
              type="text"
              value={testValue}
              onChange={(e) => setTestValue(e.target.value)}
              placeholder="Value"
              className="flex-1 px-3 py-2 border border-gray-300 rounded"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSaveTest}
              disabled={loading}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              Save Test Data
            </button>
            <button
              onClick={handleLoadTest}
              disabled={loading}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
            >
              Load Test Data
            </button>
          </div>
          {loadedValue && (
            <div className="mt-2 p-2 bg-gray-100 rounded">
              <strong>Loaded Value:</strong> {loadedValue}
            </div>
          )}
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">Test Sales Records</h3>
          <button
            onClick={handleLoadSalesRecords}
            disabled={loading}
            className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:opacity-50"
          >
            Load Sales Records ({salesRecords.length})
          </button>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">Connection Status</h3>
          <div className="text-sm text-gray-600">
            <p><strong>Environment Variables:</strong></p>
            <ul className="ml-4">
              <li>AWS Region: {process.env.REACT_APP_AWS_REGION || 'Not set'}</li>
              <li>AWS Access Key: {process.env.REACT_APP_AWS_ACCESS_KEY_ID ? 'Set' : 'Not set'}</li>
              <li>AWS Secret Key: {process.env.REACT_APP_AWS_SECRET_ACCESS_KEY ? 'Set' : 'Not set'}</li>
              <li>App ID: {process.env.REACT_APP_AWS_APP_ID || 'Not set'}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DynamoDBTest;
