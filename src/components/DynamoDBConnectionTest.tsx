import React, { useState, useEffect } from 'react';
import { dynamoDBService, debugEnvironment } from '../services/dynamodb';

const DynamoDBConnectionTest: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState<string>('Testing...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const testConnection = async () => {
      try {
        console.log('Testing DynamoDB connection...');
        debugEnvironment();

        // Test a simple operation
        await dynamoDBService.saveAppState('connection-test', { timestamp: new Date().toISOString() });
        
        // Try to read it back
        const result = await dynamoDBService.getAppState('connection-test');
        
        if (result) {
          setConnectionStatus('✅ Connected successfully!');
          console.log('Connection test successful:', result);
        } else {
          setConnectionStatus('❌ Connection failed - no data returned');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        setConnectionStatus('❌ Connection failed');
        console.error('DynamoDB connection test failed:', err);
      }
    };

    testConnection();
  }, []);

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-2">DynamoDB Connection Test</h3>
      <p className="mb-2">Status: {connectionStatus}</p>
      {error && (
        <div className="text-red-600">
          <p>Error: {error}</p>
        </div>
      )}
      <div className="text-sm text-gray-600">
        <p>Region: {process.env.REACT_APP_AWS_REGION || 'Not set'}</p>
        <p>App ID: {process.env.REACT_APP_AWS_APP_ID || 'Not set'}</p>
        <p>Access Key: {process.env.REACT_APP_AWS_ACCESS_KEY_ID ? '***' + process.env.REACT_APP_AWS_ACCESS_KEY_ID.slice(-4) : 'Not set'}</p>
      </div>
    </div>
  );
};

export default DynamoDBConnectionTest;
