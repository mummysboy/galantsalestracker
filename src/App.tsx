import React, { useState } from 'react';
import Dashboard from './Dashboard';
import DashboardDynamoDB from './DashboardDynamoDB';
import DynamoDBTest from './components/DynamoDBTest';

function App() {
  const [view, setView] = useState<'original' | 'dynamodb' | 'test'>('original');

  return (
    <div className="App">
      {/* Navigation */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-xl font-semibold text-gray-900">Sales Tracker</h1>
            <div className="flex space-x-4">
              <button
                onClick={() => setView('original')}
                className={`px-3 py-2 rounded text-sm font-medium ${
                  view === 'original' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Original (Google Sheets)
              </button>
              <button
                onClick={() => setView('dynamodb')}
                className={`px-3 py-2 rounded text-sm font-medium ${
                  view === 'dynamodb' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                DynamoDB (Beta)
              </button>
              <button
                onClick={() => setView('test')}
                className={`px-3 py-2 rounded text-sm font-medium ${
                  view === 'test' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Test Connection
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="min-h-screen bg-gray-50">
        {view === 'original' && <Dashboard />}
        {view === 'dynamodb' && <DashboardDynamoDB />}
        {view === 'test' && (
          <div className="py-8">
            <DynamoDBTest />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
