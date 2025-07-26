'use client';

import { useState, useEffect } from 'react';

interface StatusInfo {
  database: string;
  timestamp: string;
  environment: string;
  version: string;
}

export default function DatabaseStatus() {
  const [status, setStatus] = useState<StatusInfo | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    fetch('/api/status')
      .then(res => res.json())
      .then(setStatus)
      .catch(console.error);
  }, []);

  if (!status) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="bg-gray-800 text-white px-3 py-2 rounded-lg text-sm hover:bg-gray-700 transition-colors"
        title="Database Status"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 1.79 4 4 4h8c0-2.21-1.79-4-4-4H4V7z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7c0-2.21 1.79-4 4-4h8c2.21 0 4 1.79 4 4v10c0 2.21-1.79 4-4 4" />
        </svg>
      </button>
      
      {isVisible && (
        <div className="absolute bottom-12 right-0 bg-white border border-gray-200 rounded-lg shadow-lg p-4 min-w-64">
          <h3 className="font-semibold text-gray-900 mb-2">System Status</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Database:</span>
              <span className={`font-medium ${
                status.database === 'memory' ? 'text-orange-600' : 'text-green-600'
              }`}>
                {status.database === 'memory' ? 'In-Memory' : 'PostgreSQL'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Environment:</span>
              <span className="font-medium text-gray-900">{status.environment}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Version:</span>
              <span className="font-medium text-gray-900">{status.version}</span>
            </div>
          </div>
          
          {status.database === 'memory' && (
            <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700">
              <strong>Note:</strong> Using in-memory database. Data will be lost on restart.
            </div>
          )}
        </div>
      )}
    </div>
  );
}