'use client';

import React, { useState } from 'react';
import { useFeatures } from '@/hooks/useFeatures';
import { FeatureDefinition } from '@/types';

interface FeatureRegistryProps {
  className?: string;
}

export default function FeatureRegistry({ className = '' }: FeatureRegistryProps) {
  const { 
    features, 
    loading, 
    error, 
    enableFeature, 
    disableFeature, 
    removeFeature,
    refreshFeatures 
  } = useFeatures();
  
  const [selectedFeature, setSelectedFeature] = useState<FeatureDefinition | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const handleToggleFeature = async (featureId: string, enabled: boolean) => {
    const success = enabled 
      ? await enableFeature(featureId)
      : await disableFeature(featureId);
    
    if (success) {
      console.log(`Feature ${featureId} ${enabled ? 'enabled' : 'disabled'}`);
    }
  };

  const handleRemoveFeature = async (featureId: string) => {
    if (confirm(`Are you sure you want to remove feature ${featureId}?`)) {
      const success = await removeFeature(featureId);
      if (success) {
        console.log(`Feature ${featureId} removed`);
        setSelectedFeature(null);
        setShowDetails(false);
      }
    }
  };

  const handleViewDetails = (feature: FeatureDefinition) => {
    setSelectedFeature(feature);
    setShowDetails(true);
  };

  if (loading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading features</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              <button
                onClick={refreshFeatures}
                className="mt-2 text-sm text-red-800 underline hover:text-red-900"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 ${className}`}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Feature Registry</h2>
        <button
          onClick={refreshFeatures}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Refresh
        </button>
      </div>

      {features.length === 0 ? (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No features registered</h3>
          <p className="mt-1 text-sm text-gray-500">
            Features will appear here once they are implemented by AI agents.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {features.map((feature) => (
            <div
              key={feature.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg font-medium text-gray-900">{feature.name}</h3>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      v{feature.version}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      feature.enabled 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {feature.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">ID: {feature.id}</p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleViewDetails(feature)}
                    className="px-3 py-1 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Details
                  </button>
                  
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={feature.enabled}
                      onChange={(e) => handleToggleFeature(feature.id, e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                  
                  <button
                    onClick={() => handleRemoveFeature(feature.id)}
                    className="px-3 py-1 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Feature Details Modal */}
      {showDetails && selectedFeature && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Feature Details</h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <p className="mt-1 text-sm text-gray-900">{selectedFeature.name}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">ID</label>
                <p className="mt-1 text-sm text-gray-900 font-mono">{selectedFeature.id}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Version</label>
                <p className="mt-1 text-sm text-gray-900">{selectedFeature.version}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  selectedFeature.enabled 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {selectedFeature.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Components</label>
                <p className="mt-1 text-sm text-gray-900">
                  {selectedFeature.components.length} component(s) registered
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">API Endpoints</label>
                <p className="mt-1 text-sm text-gray-900">
                  {selectedFeature.apiEndpoints.length} endpoint(s) registered
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Database Migrations</label>
                <p className="mt-1 text-sm text-gray-900">
                  {selectedFeature.databaseMigrations.length} migration(s) registered
                </p>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowDetails(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}