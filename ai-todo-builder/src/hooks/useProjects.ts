import { useState, useEffect, useCallback } from 'react';
import { Project, ProjectPriority } from '@/components/ProjectDashboard';

interface UseProjectsReturn {
  projects: Project[];
  loading: boolean;
  error: string | null;
  
  // Project management
  createProject: (params: {
    title: string;
    description: string;
    userRequest: string;
    priority?: ProjectPriority;
  }) => Promise<Project | null>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<Project | null>;
  deleteProject: (id: string) => Promise<boolean>;
  
  // Agent assignment
  assignAgents: (projectId: string, agentRoles: string[]) => Promise<boolean>;
  autoAssignAgents: (projectId: string) => Promise<boolean>;
  removeAgentFromProject: (projectId: string, agentRole: string) => Promise<boolean>;
  
  // Project execution
  executeProject: (projectId: string, phase?: string, options?: Record<string, unknown>) => Promise<boolean>;
  stopProjectExecution: (projectId: string) => Promise<boolean>;
  getExecutionStatus: (projectId: string) => Promise<unknown>;
  
  // Project analytics
  getProjectHealth: (projectId: string) => Promise<unknown>;
  getProjectStatistics: () => Promise<unknown>;
  
  // Data fetching
  refreshProjects: () => Promise<void>;
  getProject: (id: string) => Project | null;
}

export function useProjects(): UseProjectsReturn {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch all projects
  const refreshProjects = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/projects');
      const data = await response.json();

      if (data.success) {
        setProjects(data.data.projects);
      } else {
        setError(data.error || 'Failed to fetch projects');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  }, []);

  // Create a new project
  const createProject = useCallback(async (params: {
    title: string;
    description: string;
    userRequest: string;
    priority?: ProjectPriority;
  }): Promise<Project | null> => {
    setError(null);

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      const data = await response.json();

      if (data.success) {
        await refreshProjects();
        return data.data;
      } else {
        setError(data.error || 'Failed to create project');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
      return null;
    }
  }, [refreshProjects]);

  // Update a project
  const updateProject = useCallback(async (id: string, updates: Partial<Project>): Promise<Project | null> => {
    setError(null);

    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      if (data.success) {
        await refreshProjects();
        return data.data;
      } else {
        setError(data.error || 'Failed to update project');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update project');
      return null;
    }
  }, [refreshProjects]);

  // Delete a project
  const deleteProject = useCallback(async (id: string): Promise<boolean> => {
    setError(null);

    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        await refreshProjects();
        return true;
      } else {
        setError(data.error || 'Failed to delete project');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project');
      return false;
    }
  }, [refreshProjects]);

  // Assign agents to a project
  const assignAgents = useCallback(async (projectId: string, agentRoles: string[]): Promise<boolean> => {
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ agentRoles }),
      });

      const data = await response.json();

      if (data.success) {
        await refreshProjects();
        return true;
      } else {
        setError(data.error || 'Failed to assign agents');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign agents');
      return false;
    }
  }, [refreshProjects]);

  // Auto-assign agents to a project
  const autoAssignAgents = useCallback(async (projectId: string): Promise<boolean> => {
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ autoAssign: true }),
      });

      const data = await response.json();

      if (data.success) {
        await refreshProjects();
        return true;
      } else {
        setError(data.error || 'Failed to auto-assign agents');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to auto-assign agents');
      return false;
    }
  }, [refreshProjects]);

  // Remove an agent from a project
  const removeAgentFromProject = useCallback(async (projectId: string, agentRole: string): Promise<boolean> => {
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/assign?agent=${encodeURIComponent(agentRole)}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        await refreshProjects();
        return true;
      } else {
        setError(data.error || 'Failed to remove agent');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove agent');
      return false;
    }
  }, [refreshProjects]);

  // Execute a project
  const executeProject = useCallback(async (
    projectId: string, 
    phase: string = 'all',
    options: Record<string, unknown> = {}
  ): Promise<boolean> => {
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phase, options }),
      });

      const data = await response.json();

      if (data.success) {
        await refreshProjects();
        return true;
      } else {
        setError(data.error || 'Failed to execute project');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute project');
      return false;
    }
  }, [refreshProjects]);

  // Stop project execution
  const stopProjectExecution = useCallback(async (projectId: string): Promise<boolean> => {
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/execute`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        await refreshProjects();
        return true;
      } else {
        setError(data.error || 'Failed to stop project execution');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop project execution');
      return false;
    }
  }, [refreshProjects]);

  // Get project execution status
  const getExecutionStatus = useCallback(async (projectId: string): Promise<unknown> => {
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/execute`);
      const data = await response.json();

      if (data.success) {
        return data.data;
      } else {
        setError(data.error || 'Failed to get execution status');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get execution status');
      return null;
    }
  }, []);

  // Get project health metrics
  const getProjectHealth = useCallback(async (projectId: string): Promise<unknown> => {
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/health`);
      const data = await response.json();

      if (data.success) {
        return data.data;
      } else {
        setError(data.error || 'Failed to get project health');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get project health');
      return null;
    }
  }, []);

  // Get project statistics
  const getProjectStatistics = useCallback(async (): Promise<unknown> => {
    setError(null);

    try {
      const response = await fetch('/api/projects/statistics');
      const data = await response.json();

      if (data.success) {
        return data.data;
      } else {
        setError(data.error || 'Failed to get project statistics');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get project statistics');
      return null;
    }
  }, []);

  // Get a specific project
  const getProject = useCallback((id: string): Project | null => {
    return projects.find(p => p.id === id) || null;
  }, [projects]);

  // Load projects on mount
  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  return {
    projects,
    loading,
    error,
    createProject,
    updateProject,
    deleteProject,
    assignAgents,
    autoAssignAgents,
    removeAgentFromProject,
    executeProject,
    stopProjectExecution,
    getExecutionStatus,
    getProjectHealth,
    getProjectStatistics,
    refreshProjects,
    getProject,
  };
}