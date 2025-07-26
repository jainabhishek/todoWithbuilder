'use client';

import React, { useState, useEffect } from 'react';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorMessage } from './ErrorMessage';

interface AgentWorkload {
  agentRole: string;
  currentTasks: number;
  maxCapacity: number;
  availability: 'available' | 'busy' | 'offline';
  lastActivity: Date;
  specializations: string[];
}

interface HandoffRequest {
  id: string;
  fromAgent: string;
  toAgent: string;
  reason: string;
  taskDescription: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  createdAt: Date;
  projectId?: string;
}

interface CommunicationThread {
  id: string;
  topic: string;
  participants: string[];
  messages: Array<{
    id: string;
    from: string;
    content: unknown;
    timestamp: Date;
  }>;
  status: 'active' | 'archived' | 'closed';
  projectId?: string;
}

interface ProjectStatistics {
  total: number;
  byStatus: {
    planning: number;
    inProgress: number;
    completed: number;
    onHold: number;
    cancelled: number;
  };
  byPriority: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
  };
  averageProgress: number;
  activeAgents: number;
}

interface CoordinationData {
  agentWorkloads: AgentWorkload[];
  statistics: ProjectStatistics;
  pendingHandoffs: number;
  activeThreads: number;
}

interface CoordinationDashboardProps {
  className?: string;
}

export function CoordinationDashboard({ className = '' }: CoordinationDashboardProps) {
  const [coordinationData, setCoordinationData] = useState<CoordinationData | null>(null);
  const [handoffRequests, setHandoffRequests] = useState<HandoffRequest[]>([]);
  const [threads, setThreads] = useState<CommunicationThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'workloads' | 'handoffs' | 'threads'>('overview');

  // Fetch coordination data
  const fetchCoordinationData = async () => {
    try {
      setError(null);
      
      const [overviewRes, handoffsRes, threadsRes] = await Promise.all([
        fetch('/api/coordination'),
        fetch('/api/coordination?type=handoffs&status=pending'),
        fetch('/api/coordination?type=threads')
      ]);

      const [overviewData, handoffsData, threadsData] = await Promise.all([
        overviewRes.json(),
        handoffsRes.json(),
        threadsRes.json()
      ]);

      if (overviewData.success) {
        setCoordinationData(overviewData.data);
      }
      
      if (handoffsData.success) {
        setHandoffRequests(handoffsData.data);
      }
      
      if (threadsData.success) {
        setThreads(threadsData.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch coordination data');
    } finally {
      setLoading(false);
    }
  };

  // Rebalance workloads
  const handleRebalanceWorkloads = async () => {
    try {
      const response = await fetch('/api/coordination', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rebalance_workloads' })
      });

      const data = await response.json();
      if (data.success) {
        alert(`Rebalanced ${data.data.rebalanced} workloads. Recommendations: ${data.data.recommendations.join(', ')}`);
        fetchCoordinationData();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rebalance workloads');
    }
  };

  // Broadcast message
  const handleBroadcastMessage = async () => {
    const message = prompt('Enter message to broadcast to all agents:');
    if (!message) return;

    try {
      const response = await fetch('/api/coordination', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'broadcast_message',
          from: 'system',
          content: { message, type: 'system_announcement' }
        })
      });

      const data = await response.json();
      if (data.success) {
        alert('Message broadcasted successfully');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to broadcast message');
    }
  };

  useEffect(() => {
    fetchCoordinationData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchCoordinationData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'available':
        return 'text-green-600 bg-green-100';
      case 'busy':
        return 'text-red-600 bg-red-100';
      case 'offline':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'accepted':
        return 'text-green-600 bg-green-100';
      case 'rejected':
        return 'text-red-600 bg-red-100';
      case 'completed':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className={`p-6 ${className}`}>
        <LoadingSpinner />
        <p className="mt-2 text-gray-600">Loading coordination dashboard...</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-md ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">AI Team Coordination</h2>
          <div className="flex items-center space-x-3">
            <button
              onClick={fetchCoordinationData}
              disabled={loading}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              onClick={handleRebalanceWorkloads}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
            >
              Rebalance
            </button>
            <button
              onClick={handleBroadcastMessage}
              className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200"
            >
              Broadcast
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4">
          <ErrorMessage message={error} />
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'workloads', label: 'Agent Workloads' },
            { id: 'handoffs', label: `Handoffs (${handoffRequests.length})` },
            { id: 'threads', label: `Threads (${threads.length})` }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'overview' && coordinationData && (
          <div className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-blue-800">Total Projects</h3>
                <p className="text-2xl font-bold text-blue-900">{coordinationData.statistics.total}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-green-800">Active Agents</h3>
                <p className="text-2xl font-bold text-green-900">{coordinationData.statistics.activeAgents}</p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-yellow-800">Pending Handoffs</h3>
                <p className="text-2xl font-bold text-yellow-900">{coordinationData.pendingHandoffs}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-purple-800">Active Threads</h3>
                <p className="text-2xl font-bold text-purple-900">{coordinationData.activeThreads}</p>
              </div>
            </div>

            {/* Project Status Distribution */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Status Distribution</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {Object.entries(coordinationData.statistics.byStatus).map(([status, count]) => (
                  <div key={status} className="text-center">
                    <p className="text-2xl font-bold text-gray-900">{count}</p>
                    <p className="text-sm text-gray-600 capitalize">{status.replace(/([A-Z])/g, ' $1')}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Average Progress */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Average Project Progress</h3>
              <div className="flex items-center">
                <div className="flex-1 bg-gray-200 rounded-full h-4 mr-4">
                  <div
                    className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                    style={{ width: `${coordinationData.statistics.averageProgress}%` }}
                  ></div>
                </div>
                <span className="text-lg font-semibold text-gray-900">
                  {coordinationData.statistics.averageProgress}%
                </span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'workloads' && coordinationData && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Agent Workloads</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {coordinationData.agentWorkloads.map((workload) => (
                <div key={workload.agentRole} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900 capitalize">
                      {workload.agentRole.replace('-', ' ')}
                    </h4>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getAvailabilityColor(workload.availability)}`}>
                      {workload.availability}
                    </span>
                  </div>
                  
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                      <span>Capacity</span>
                      <span>{workload.currentTasks}/{workload.maxCapacity}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          workload.currentTasks >= workload.maxCapacity ? 'bg-red-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${(workload.currentTasks / workload.maxCapacity) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-1">Specializations:</p>
                    <div className="flex flex-wrap gap-1">
                      {workload.specializations.slice(0, 3).map((spec) => (
                        <span key={spec} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                          {spec}
                        </span>
                      ))}
                      {workload.specializations.length > 3 && (
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                          +{workload.specializations.length - 3}
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-gray-500">
                    Last activity: {new Date(workload.lastActivity).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'handoffs' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Agent Handoff Requests</h3>
            {handoffRequests.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No pending handoff requests</p>
              </div>
            ) : (
              <div className="space-y-3">
                {handoffRequests.map((handoff) => (
                  <div key={handoff.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900 capitalize">
                          {handoff.fromAgent.replace('-', ' ')}
                        </span>
                        <span className="text-gray-500">→</span>
                        <span className="font-medium text-gray-900 capitalize">
                          {handoff.toAgent.replace('-', ' ')}
                        </span>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(handoff.status)}`}>
                        {handoff.status}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-700 mb-2">{handoff.taskDescription}</p>
                    <p className="text-xs text-gray-500 mb-2">Reason: {handoff.reason}</p>
                    <p className="text-xs text-gray-500">
                      Created: {new Date(handoff.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'threads' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Communication Threads</h3>
            {threads.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No active communication threads</p>
              </div>
            ) : (
              <div className="space-y-3">
                {threads.map((thread) => (
                  <div key={thread.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{thread.topic}</h4>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        thread.status === 'active' ? 'text-green-600 bg-green-100' : 'text-gray-600 bg-gray-100'
                      }`}>
                        {thread.status}
                      </span>
                    </div>
                    
                    <div className="mb-2">
                      <p className="text-sm text-gray-600">
                        Participants: {thread.participants.map(p => p.replace('-', ' ')).join(', ')}
                      </p>
                    </div>
                    
                    <p className="text-xs text-gray-500">
                      {thread.messages.length} messages
                      {thread.projectId && ` • Project: ${thread.projectId.slice(0, 8)}...`}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}