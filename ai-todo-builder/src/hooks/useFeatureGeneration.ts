import { useState, useCallback } from 'react';
import { ComponentSpec, APISpec } from '@/types';

export interface FeatureGenerationRequest {
  featureId: string;
  featureName: string;
  featureVersion?: string;
  description: string;
  components?: ComponentSpec[];
  apiEndpoints?: APISpec[];
  generateTests?: boolean;
  dryRun?: boolean;
  sessionId?: string;
}

export interface FeatureGenerationResult {
  success: boolean;
  featureId: string;
  featureName: string;
  dryRun: boolean;
  generation: {
    componentsGenerated: number;
    apiEndpointsGenerated: number;
    migrationsGenerated: number;
    testsGenerated: number;
  };
  testing?: {
    testsPassed: number;
    testsFailed: number;
    coverage?: {
      lines: number;
      functions: number;
      branches: number;
      statements: number;
    };
  };
  integration?: {
    filesCreated: string[];
    testsCreated: string[];
    migrationsApplied: string[];
  };
  errors: string[];
  warnings: string[];
}

export interface GenerationCapabilities {
  componentGeneration: boolean;
  apiGeneration: boolean;
  testGeneration: boolean;
  migrationGeneration: boolean;
  codeIntegration: boolean;
  automatedTesting: boolean;
  supportedFrameworks: string[];
  supportedTestFrameworks: string[];
  supportedLanguages: string[];
}

interface UseFeatureGeneration {
  generating: boolean;
  error: string | null;
  lastResult: FeatureGenerationResult | null;
  capabilities: GenerationCapabilities | null;
  generateFeature: (request: FeatureGenerationRequest) => Promise<FeatureGenerationResult | null>;
  getCapabilities: () => Promise<GenerationCapabilities | null>;
  clearError: () => void;
  clearResult: () => void;
}

export function useFeatureGeneration(): UseFeatureGeneration {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<FeatureGenerationResult | null>(null);
  const [capabilities, setCapabilities] = useState<GenerationCapabilities | null>(null);

  const generateFeature = useCallback(async (request: FeatureGenerationRequest): Promise<FeatureGenerationResult | null> => {
    try {
      setGenerating(true);
      setError(null);
      
      console.log('Starting feature generation:', request.featureId);
      
      const response = await fetch('/api/features/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setLastResult(data);
        console.log('Feature generation completed successfully:', data);
        return data;
      } else {
        const errorMessage = data.error || 'Feature generation failed';
        const detailedError = data.errors?.length > 0 
          ? `${errorMessage}: ${data.errors.join(', ')}`
          : errorMessage;
        
        setError(detailedError);
        setLastResult(data); // Still set result to show partial progress
        console.error('Feature generation failed:', data);
        return data;
      }
    } catch (err) {
      const errorMessage = 'Failed to generate feature';
      setError(errorMessage);
      console.error('Feature generation error:', err);
      return null;
    } finally {
      setGenerating(false);
    }
  }, []);

  const getCapabilities = useCallback(async (): Promise<GenerationCapabilities | null> => {
    try {
      const response = await fetch('/api/features/generate');
      const data = await response.json();
      
      if (data.success) {
        setCapabilities(data);
        return data;
      } else {
        setError(data.error || 'Failed to get capabilities');
        return null;
      }
    } catch (err) {
      setError('Failed to get capabilities');
      console.error('Capabilities error:', err);
      return null;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearResult = useCallback(() => {
    setLastResult(null);
  }, []);

  return {
    generating,
    error,
    lastResult,
    capabilities,
    generateFeature,
    getCapabilities,
    clearError,
    clearResult,
  };
}

// Helper hook for common feature generation patterns
export function useCommonFeatureGeneration() {
  const { generateFeature, generating, error, lastResult } = useFeatureGeneration();

  const generateTodoFeature = useCallback(async (
    featureName: string,
    description: string,
    options: {
      addPriority?: boolean;
      addDueDate?: boolean;
      addTags?: boolean;
      addSearch?: boolean;
    } = {}
  ) => {
    const featureId = featureName.toLowerCase().replace(/\s+/g, '-');
    
    const components: ComponentSpec[] = [];
    const apiEndpoints: APISpec[] = [];

    // Generate component specs based on options
    if (options.addPriority) {
      components.push({
        name: 'PrioritySelector',
        props: {
          priority: 'number',
          onChange: 'function'
        },
        functionality: ['Display priority levels', 'Handle priority changes', 'Visual priority indicators'],
        styling: 'Tailwind CSS with priority color coding'
      });
    }

    if (options.addDueDate) {
      components.push({
        name: 'DueDatePicker',
        props: {
          dueDate: 'Date | null',
          onChange: 'function'
        },
        functionality: ['Date picker interface', 'Due date validation', 'Overdue indicators'],
        styling: 'Tailwind CSS with calendar styling'
      });
    }

    if (options.addTags) {
      components.push({
        name: 'TagManager',
        props: {
          tags: 'string[]',
          onChange: 'function'
        },
        functionality: ['Tag input and display', 'Tag suggestions', 'Tag filtering'],
        styling: 'Tailwind CSS with tag badges'
      });
    }

    if (options.addSearch) {
      components.push({
        name: 'TodoSearch',
        props: {
          onSearch: 'function',
          placeholder: 'string'
        },
        functionality: ['Search input', 'Real-time filtering', 'Search suggestions'],
        styling: 'Tailwind CSS with search icon'
      });
    }

    // Generate API specs
    if (options.addPriority || options.addDueDate || options.addTags) {
      apiEndpoints.push({
        endpoint: '/api/todos/[id]/metadata',
        method: 'PATCH',
        parameters: {
          id: 'string',
          metadata: 'object'
        },
        response: {
          success: 'boolean',
          todo: 'TodoItem'
        },
        validation: ['Valid todo ID', 'Valid metadata structure']
      });
    }

    if (options.addSearch) {
      apiEndpoints.push({
        endpoint: '/api/todos/search',
        method: 'GET',
        parameters: {
          query: 'string',
          filters: 'object'
        },
        response: {
          success: 'boolean',
          todos: 'TodoItem[]',
          total: 'number'
        },
        validation: ['Non-empty query', 'Valid filter parameters']
      });
    }

    return generateFeature({
      featureId,
      featureName,
      description,
      components,
      apiEndpoints,
      generateTests: true,
      dryRun: false
    });
  }, [generateFeature]);

  return {
    generateTodoFeature,
    generating,
    error,
    lastResult
  };
}