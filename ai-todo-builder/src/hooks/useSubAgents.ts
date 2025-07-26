import { useState, useEffect, useCallback } from 'react';
import { SubAgentConfig, SubAgentStatus } from '@/types';
import { SubAgentMessage, TaskResult } from '@/lib/sub-agent-manager';

interface UseSubAgentsReturn {
  agents: SubAgentConfig[];
  statuses: SubAgentStatus[];
  messages: SubAgentMessage[];
  loading: boolean;
  error: string | null;
  
  // Agent management
  createAgent: (config: SubAgentConfig) => Promise<boolean>;
  updateAgent: (name: string, updates: Partial<SubAgentConfig>) => Promise<boolean>;
  deleteAgent: (name: string) => Promise<boolean>;
  
  // Task delegation
  delegateTask: (agentName: string, taskDescription: string, options?: Record<string, unknown>) => Promise<TaskResult>;
  
  // Communication
  sendMessage: (message: Omit<SubAgentMessage, 'id' | 'timestamp'>) => Promise<boolean>;
  createThread: (participants: string[], topic: string) => Promise<string | null>;
  handleHandoff: (fromAgent: string, toAgent: string, context: unknown, taskDescription: string) => Promise<TaskResult>;
  
  // Data fetching
  refreshAgents: () => Promise<void>;
  refreshMessages: (agentName?: string, threadId?: string) => Promise<void>;
}

export function useSubAgents(): UseSubAgentsReturn {
  const [agents, setAgents] = useState<SubAgentConfig[]>([]);
  const [statuses, setStatuses] = useState<SubAgentStatus[]>([]);
  const [messages, setMessages] = useState<SubAgentMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch agents and their statuses
  const refreshAgents = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/sub-agents');
      const data = await response.json();

      if (data.success) {
        setAgents(data.data.agents);
        setStatuses(data.data.statuses);
      } else {
        setError(data.error || 'Failed to fetch agents');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch agents');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch messages
  const refreshMessages = useCallback(async (agentName?: string, threadId?: string) => {
    try {
      const params = new URLSearchParams();
      if (agentName) params.append('agent', agentName);
      if (threadId) params.append('thread', threadId);

      const response = await fetch(`/api/sub-agents/communication?${params}`);
      const data = await response.json();

      if (data.success) {
        setMessages(data.data.messages);
      } else {
        setError(data.error || 'Failed to fetch messages');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch messages');
    }
  }, []);

  // Create a new agent
  const createAgent = useCallback(async (config: SubAgentConfig): Promise<boolean> => {
    setError(null);

    try {
      const response = await fetch('/api/sub-agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      const data = await response.json();

      if (data.success) {
        await refreshAgents();
        return true;
      } else {
        setError(data.error || 'Failed to create agent');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create agent');
      return false;
    }
  }, [refreshAgents]);

  // Update an existing agent
  const updateAgent = useCallback(async (name: string, updates: Partial<SubAgentConfig>): Promise<boolean> => {
    setError(null);

    try {
      const response = await fetch('/api/sub-agents', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, ...updates }),
      });

      const data = await response.json();

      if (data.success) {
        await refreshAgents();
        return true;
      } else {
        setError(data.error || 'Failed to update agent');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update agent');
      return false;
    }
  }, [refreshAgents]);

  // Delete an agent
  const deleteAgent = useCallback(async (name: string): Promise<boolean> => {
    setError(null);

    try {
      const response = await fetch(`/api/sub-agents?name=${encodeURIComponent(name)}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        await refreshAgents();
        return true;
      } else {
        setError(data.error || 'Failed to delete agent');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete agent');
      return false;
    }
  }, [refreshAgents]);

  // Delegate a task to an agent
  const delegateTask = useCallback(async (
    agentName: string, 
    taskDescription: string, 
    options: Record<string, unknown> = {}
  ): Promise<TaskResult> => {
    setError(null);

    try {
      const response = await fetch('/api/sub-agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'delegate',
          agentName,
          taskDescription,
          options,
        }),
      });

      const data = await response.json();

      if (data.success) {
        await refreshAgents(); // Refresh to update agent statuses
        return data.data;
      } else {
        setError(data.error || 'Failed to delegate task');
        return {
          success: false,
          result: '',
          sessionId: '',
          error: data.error || 'Failed to delegate task'
        };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delegate task';
      setError(errorMessage);
      return {
        success: false,
        result: '',
        sessionId: '',
        error: errorMessage
      };
    }
  }, [refreshAgents]);

  // Send a message between agents
  const sendMessage = useCallback(async (message: Omit<SubAgentMessage, 'id' | 'timestamp'>): Promise<boolean> => {
    setError(null);

    try {
      const response = await fetch('/api/sub-agents/communication', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      const data = await response.json();

      if (data.success) {
        await refreshMessages(); // Refresh messages
        return true;
      } else {
        setError(data.error || 'Failed to send message');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      return false;
    }
  }, [refreshMessages]);

  // Create a communication thread
  const createThread = useCallback(async (participants: string[], topic: string): Promise<string | null> => {
    setError(null);

    try {
      const response = await fetch('/api/sub-agents/communication', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create_thread',
          participants,
          topic,
        }),
      });

      const data = await response.json();

      if (data.success) {
        return data.data.threadId;
      } else {
        setError(data.error || 'Failed to create thread');
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create thread');
      return null;
    }
  }, []);

  // Handle agent handoff
  const handleHandoff = useCallback(async (
    fromAgent: string,
    toAgent: string,
    context: unknown,
    taskDescription: string
  ): Promise<TaskResult> => {
    setError(null);

    try {
      const response = await fetch('/api/sub-agents/communication', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'handoff',
          fromAgent,
          toAgent,
          context,
          taskDescription,
        }),
      });

      const data = await response.json();

      if (data.success) {
        await refreshAgents(); // Refresh to update agent statuses
        await refreshMessages(); // Refresh messages
        return data.data;
      } else {
        setError(data.error || 'Failed to handle handoff');
        return {
          success: false,
          result: '',
          sessionId: '',
          error: data.error || 'Failed to handle handoff'
        };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to handle handoff';
      setError(errorMessage);
      return {
        success: false,
        result: '',
        sessionId: '',
        error: errorMessage
      };
    }
  }, [refreshAgents, refreshMessages]);

  // Load agents on mount
  useEffect(() => {
    refreshAgents();
  }, [refreshAgents]);

  return {
    agents,
    statuses,
    messages,
    loading,
    error,
    createAgent,
    updateAgent,
    deleteAgent,
    delegateTask,
    sendMessage,
    createThread,
    handleHandoff,
    refreshAgents,
    refreshMessages,
  };
}