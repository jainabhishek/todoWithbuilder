import { useState, useEffect, useCallback } from 'react';
import { FeatureDefinition } from '@/types';

interface UseFeatures {
  features: FeatureDefinition[];
  loading: boolean;
  error: string | null;
  refreshFeatures: () => Promise<void>;
  registerFeature: (feature: FeatureDefinition) => Promise<boolean>;
  enableFeature: (featureId: string) => Promise<boolean>;
  disableFeature: (featureId: string) => Promise<boolean>;
  removeFeature: (featureId: string) => Promise<boolean>;
  getFeature: (featureId: string) => Promise<FeatureDefinition | null>;
  addDependency: (featureId: string, dependsOn: string, type?: 'required' | 'optional') => Promise<boolean>;
  getDependencies: (featureId: string) => Promise<string[]>;
}

export function useFeatures(activeOnly: boolean = false): UseFeatures {
  const [features, setFeatures] = useState<FeatureDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshFeatures = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/features?active=${activeOnly}`);
      const data = await response.json();
      
      if (data.success) {
        setFeatures(data.features);
      } else {
        setError(data.error || 'Failed to load features');
      }
    } catch (err) {
      setError('Failed to load features');
      console.error('Error loading features:', err);
    } finally {
      setLoading(false);
    }
  }, [activeOnly]);

  const registerFeature = useCallback(async (feature: FeatureDefinition): Promise<boolean> => {
    try {
      const response = await fetch('/api/features', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(feature),
      });
      
      const data = await response.json();
      
      if (data.success) {
        await refreshFeatures();
        return true;
      } else {
        setError(data.error || 'Failed to register feature');
        return false;
      }
    } catch (err) {
      setError('Failed to register feature');
      console.error('Error registering feature:', err);
      return false;
    }
  }, [refreshFeatures]);

  const enableFeature = useCallback(async (featureId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/features/${featureId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled: true }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        await refreshFeatures();
        return true;
      } else {
        setError(data.error || 'Failed to enable feature');
        return false;
      }
    } catch (err) {
      setError('Failed to enable feature');
      console.error('Error enabling feature:', err);
      return false;
    }
  }, [refreshFeatures]);

  const disableFeature = useCallback(async (featureId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/features/${featureId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled: false }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        await refreshFeatures();
        return true;
      } else {
        setError(data.error || 'Failed to disable feature');
        return false;
      }
    } catch (err) {
      setError('Failed to disable feature');
      console.error('Error disabling feature:', err);
      return false;
    }
  }, [refreshFeatures]);

  const removeFeature = useCallback(async (featureId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/features/${featureId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        await refreshFeatures();
        return true;
      } else {
        setError(data.error || 'Failed to remove feature');
        return false;
      }
    } catch (err) {
      setError('Failed to remove feature');
      console.error('Error removing feature:', err);
      return false;
    }
  }, [refreshFeatures]);

  const getFeature = useCallback(async (featureId: string): Promise<FeatureDefinition | null> => {
    try {
      const response = await fetch(`/api/features/${featureId}`);
      const data = await response.json();
      
      if (data.success) {
        return data.feature;
      } else {
        setError(data.error || 'Failed to get feature');
        return null;
      }
    } catch (err) {
      setError('Failed to get feature');
      console.error('Error getting feature:', err);
      return null;
    }
  }, []);

  const addDependency = useCallback(async (
    featureId: string, 
    dependsOn: string, 
    type: 'required' | 'optional' = 'required'
  ): Promise<boolean> => {
    try {
      const response = await fetch(`/api/features/${featureId}/dependencies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dependsOn, dependencyType: type }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        return true;
      } else {
        setError(data.error || 'Failed to add dependency');
        return false;
      }
    } catch (err) {
      setError('Failed to add dependency');
      console.error('Error adding dependency:', err);
      return false;
    }
  }, []);

  const getDependencies = useCallback(async (featureId: string): Promise<string[]> => {
    try {
      const response = await fetch(`/api/features/${featureId}/dependencies`);
      const data = await response.json();
      
      if (data.success) {
        return data.dependencies;
      } else {
        setError(data.error || 'Failed to get dependencies');
        return [];
      }
    } catch (err) {
      setError('Failed to get dependencies');
      console.error('Error getting dependencies:', err);
      return [];
    }
  }, []);

  useEffect(() => {
    refreshFeatures();
  }, [refreshFeatures]);

  return {
    features,
    loading,
    error,
    refreshFeatures,
    registerFeature,
    enableFeature,
    disableFeature,
    removeFeature,
    getFeature,
    addDependency,
    getDependencies,
  };
}