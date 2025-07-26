'use client';

import React, { useState } from 'react';
import { useSubAgents } from '@/hooks/useSubAgents';

import { LoadingSpinner } from './LoadingSpinner';
import { ErrorMessage } from './ErrorMessage';

interface SubAgentConsoleProps {
  className?: string;
}

export function SubAgentConsole({ className = '' }: SubAgentConsoleProps) {
  const {
    agents,
    statuses,
    loading,
    error,
    delegateTask,
    refreshAgents
  } = useSubAgents();

  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [taskDescription, setTaskDescription] = useState<string>('');
  const [taskResult, setTaskResult] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState<boolean>(false);

  const handleDelegateTask = async () => {
    if (!selectedAgent || !taskDescription.trim()) {
      return;
    }

    setIsExecuting(true);
    setTaskResult('');

    try {
      const result = await delegateTask(selectedAgent, taskDescription);
      
      if (result.success) {
        setTaskResult(result.result);
      } else {
        setTaskResult(`Error: ${result.error}`);
      }
    } catch (err) {
      setTaskResult(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const getAgentStatus = (agentName: string) => {
    return statuses.find(status => status.role === agentName)?.status || 'idle';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'working':
        return 'text-yellow-600 bg-yellow-100';
      case 'error':
        return 'text-red-600 bg-red-100';
      case 'waiting':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-green-600 bg-green-100';
    }
  };

  if (loading && agents.length === 0) {
    return (
      <div className={`p-6 ${className}`}>
        <LoadingSpinner />
        <p className="mt-2 text-gray-600">Loading sub-agents...</p>
      </div>
    );
  }

  return (
    <div className={`p-6 bg-white rounded-lg shadow-md ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">AI Sub-Agent Console</h2>
        <button
          onClick={refreshAgents}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-100 rounded-md hover:bg-blue-200 disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <ErrorMessage message={error} className="mb-4" />
      )}

      {/* Agent Status Grid */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Agent Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {agents.map((agent) => {
            const status = getAgentStatus(agent.name);
            return (
              <div
                key={agent.name}
                className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900 capitalize">
                    {agent.name.replace('-', ' ')}
                  </h4>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(status)}`}
                  >
                    {status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 line-clamp-2">
                  {agent.description}
                </p>
                {agent.tools && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-500">
                      Tools: {agent.tools.join(', ')}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Task Delegation */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Delegate Task</h3>
        <div className="space-y-4">
          <div>
            <label htmlFor="agent-select" className="block text-sm font-medium text-gray-700 mb-1">
              Select Agent
            </label>
            <select
              id="agent-select"
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Choose an agent...</option>
              {agents.map((agent) => (
                <option key={agent.name} value={agent.name}>
                  {agent.name.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="task-description" className="block text-sm font-medium text-gray-700 mb-1">
              Task Description
            </label>
            <textarea
              id="task-description"
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              placeholder="Describe the task you want the agent to handle..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={handleDelegateTask}
            disabled={!selectedAgent || !taskDescription.trim() || isExecuting}
            className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExecuting ? (
              <>
                <LoadingSpinner size="sm" className="inline mr-2" />
                Executing Task...
              </>
            ) : (
              'Delegate Task'
            )}
          </button>
        </div>
      </div>

      {/* Task Result */}
      {taskResult && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Task Result</h3>
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
            <pre className="whitespace-pre-wrap text-sm text-gray-800">
              {taskResult}
            </pre>
          </div>
        </div>
      )}

      {/* Agent Information */}
      {selectedAgent && (
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Agent Information</h3>
          {(() => {
            const agent = agents.find(a => a.name === selectedAgent);
            if (!agent) return null;

            return (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                <h4 className="font-medium text-blue-900 mb-2">
                  {agent.name.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </h4>
                <p className="text-sm text-blue-800 mb-3">
                  {agent.description}
                </p>
                <div className="text-sm text-blue-700">
                  <strong>System Prompt:</strong>
                  <pre className="mt-1 whitespace-pre-wrap text-xs">
                    {agent.systemPrompt}
                  </pre>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}