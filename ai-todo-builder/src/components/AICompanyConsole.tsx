'use client';

import React, { useState, useEffect } from 'react';
import { useSubAgents } from '@/hooks/useSubAgents';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorMessage } from './ErrorMessage';
import { ProjectDashboard } from './ProjectDashboard';

interface Project {
  id: string;
  title: string;
  description: string;
  status: 'planning' | 'in-progress' | 'review' | 'completed' | 'on-hold';
  assignedAgents: string[];
  progress: number;
  createdAt: Date;
  updatedAt: Date;
  timeline: {
    startDate: Date;
    endDate: Date;
    milestones: Array<{
      id: string;
      title: string;
      date: Date;
      completed: boolean;
    }>;
  };
}

interface AgentActivity {
  id: string;
  agentName: string;
  activity: string;
  timestamp: Date;
  type: 'task_start' | 'task_complete' | 'message' | 'handoff' | 'error';
  projectId?: string;
}

export function AICompanyConsole() {
  const {
    agents,
    statuses,
    messages,
    loading,
    error,
    refreshAgents,
    refreshMessages
  } = useSubAgents();

  const [projects, setProjects] = useState<Project[]>([]);
  
  // Mock projects data for now - will be replaced with API calls
  const realProjects = projects;
  const [activities, setActivities] = useState<AgentActivity[]>([]);
  const [selectedView, setSelectedView] = useState<'overview' | 'agents' | 'projects' | 'activity'>('overview');
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(true);

  // Mock data for demonstration - in real implementation, this would come from API
  useEffect(() => {
    const mockProjects: Project[] = [
      {
        id: 'proj-1',
        title: 'Priority System Implementation',
        description: 'Add priority levels to todo items with visual indicators',
        status: 'in-progress',
        assignedAgents: ['product-manager', 'frontend-developer', 'qa-engineer'],
        progress: 65,
        createdAt: new Date(Date.now() - 86400000 * 2),
        updatedAt: new Date(Date.now() - 3600000),
        timeline: {
          startDate: new Date(Date.now() - 86400000 * 2),
          endDate: new Date(Date.now() + 86400000 * 3),
          milestones: [
            { id: 'm1', title: 'Requirements Analysis', date: new Date(Date.now() - 86400000), completed: true },
            { id: 'm2', title: 'UI Design', date: new Date(), completed: false },
            { id: 'm3', title: 'Implementation', date: new Date(Date.now() + 86400000), completed: false },
            { id: 'm4', title: 'Testing & QA', date: new Date(Date.now() + 86400000 * 2), completed: false }
          ]
        }
      },
      {
        id: 'proj-2',
        title: 'Due Date Feature',
        description: 'Add due date functionality with notifications',
        status: 'planning',
        assignedAgents: ['product-manager', 'ux-designer'],
        progress: 15,
        createdAt: new Date(Date.now() - 3600000),
        updatedAt: new Date(Date.now() - 1800000),
        timeline: {
          startDate: new Date(),
          endDate: new Date(Date.now() + 86400000 * 5),
          milestones: [
            { id: 'm5', title: 'User Story Creation', date: new Date(Date.now() + 3600000), completed: false },
            { id: 'm6', title: 'Technical Design', date: new Date(Date.now() + 86400000), completed: false }
          ]
        }
      }
    ];

    const mockActivities: AgentActivity[] = [
      {
        id: 'act-1',
        agentName: 'frontend-developer',
        activity: 'Implementing priority selection component',
        timestamp: new Date(Date.now() - 300000),
        type: 'task_start',
        projectId: 'proj-1'
      },
      {
        id: 'act-2',
        agentName: 'product-manager',
        activity: 'Completed requirements analysis for due date feature',
        timestamp: new Date(Date.now() - 600000),
        type: 'task_complete',
        projectId: 'proj-2'
      },
      {
        id: 'act-3',
        agentName: 'qa-engineer',
        activity: 'Started test plan creation for priority system',
        timestamp: new Date(Date.now() - 900000),
        type: 'task_start',
        projectId: 'proj-1'
      }
    ];

    setProjects(mockProjects);
    setActivities(mockActivities);
  }, []);

  // Real-time updates simulation
  useEffect(() => {
    if (!isRealTimeEnabled) return;

    const interval = setInterval(() => {
      refreshAgents();
      refreshMessages();
      
      // Simulate new activity
      const newActivity: AgentActivity = {
        id: `act-${Date.now()}`,
        agentName: agents[Math.floor(Math.random() * agents.length)]?.name || 'system',
        activity: 'Processing task...',
        timestamp: new Date(),
        type: 'message'
      };
      
      setActivities(prev => [newActivity, ...prev.slice(0, 9)]);
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [isRealTimeEnabled, agents, refreshAgents, refreshMessages]);

  const getAgentStatus = (agentName: string) => {
    return statuses.find(status => status.role === agentName)?.status || 'idle';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'working':
        return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'error':
        return 'text-red-600 bg-red-100 border-red-200';
      case 'waiting':
        return 'text-blue-600 bg-blue-100 border-blue-200';
      default:
        return 'text-green-600 bg-green-100 border-green-200';
    }
  };

  const getProjectStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'in-progress':
        return 'text-blue-600 bg-blue-100';
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'on-hold':
        return 'text-yellow-600 bg-yellow-100';
      case 'review':
        return 'text-purple-600 bg-purple-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getActivityTypeIcon = (type: AgentActivity['type']) => {
    switch (type) {
      case 'task_start':
        return '▶️';
      case 'task_complete':
        return '✅';
      case 'message':
        return '💬';
      case 'handoff':
        return '🔄';
      case 'error':
        return '❌';
      default:
        return '📝';
    }
  };

  if (loading && agents.length === 0) {
    return (
      <div className="p-6">
        <LoadingSpinner />
        <p className="mt-2 text-gray-600">Loading AI Company Console...</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50">
      {/* Company Status Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-12">
            <div className="flex items-center">
              <h2 className="text-lg font-semibold text-gray-900">AI Software Company</h2>
              <div className="ml-4 flex items-center">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="ml-2 text-sm text-gray-600">
                  {agents.length} agents online
                </span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={isRealTimeEnabled}
                  onChange={(e) => setIsRealTimeEnabled(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm text-gray-600">Real-time updates</span>
              </label>
              
              <button
                onClick={refreshAgents}
                disabled={loading}
                className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 disabled:opacity-50"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { key: 'overview', label: 'Overview' },
              { key: 'agents', label: 'Team Members' },
              { key: 'projects', label: 'Projects' },
              { key: 'activity', label: 'Activity Feed' }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setSelectedView(key as 'overview' | 'agents' | 'projects' | 'activity')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  selectedView === key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <ErrorMessage message={error} className="mb-6" />
        )}

        {/* Overview Tab */}
        {selectedView === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <span className="text-2xl">👥</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Active Agents</p>
                    <p className="text-2xl font-semibold text-gray-900">{agents.length}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <span className="text-2xl">📋</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Active Projects</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {realProjects.filter(p => p.status === 'in-progress').length}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <span className="text-2xl">⚡</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Tasks in Progress</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {statuses.filter(s => s.status === 'working').length}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <span className="text-2xl">💬</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Messages Today</p>
                    <p className="text-2xl font-semibold text-gray-900">{messages.length}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Project Status */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Project Status</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {projects.map((project) => (
                    <div key={project.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900">{project.title}</h4>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getProjectStatusColor(project.status)}`}>
                            {project.status.replace('-', ' ')}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${project.progress}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between mt-2 text-sm text-gray-600">
                          <span>{project.progress}% complete</span>
                          <span>{project.assignedAgents.length} agents assigned</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Team Members Tab */}
        {selectedView === 'agents' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">AI Team Members</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {agents.map((agent) => {
                  const status = getAgentStatus(agent.name);
                  return (
                    <div key={agent.name} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                            {agent.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="ml-3">
                            <h4 className="font-medium text-gray-900 capitalize">
                              {agent.name.replace('-', ' ')}
                            </h4>
                            <p className="text-sm text-gray-500">AI Agent</p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(status)}`}>
                          {status}
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                        {agent.description}
                      </p>
                      
                      {agent.tools && (
                        <div className="mb-4">
                          <p className="text-xs font-medium text-gray-700 mb-2">Available Tools:</p>
                          <div className="flex flex-wrap gap-1">
                            {agent.tools.map((tool) => (
                              <span key={tool} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                                {tool}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="text-xs text-gray-500">
                        Last activity: {new Date().toLocaleTimeString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Projects Tab */}
        {selectedView === 'projects' && (
          <ProjectDashboard />
        )}

        {/* Legacy Projects View - keeping for reference */}
        {false && (
          <div className="space-y-6">
            {projects.map((project) => (
              <div key={project.id} className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{project.title}</h3>
                      <p className="text-sm text-gray-600">{project.description}</p>
                    </div>
                    <span className={`px-3 py-1 text-sm font-medium rounded-full ${getProjectStatusColor(project.status)}`}>
                      {project.status.replace('-', ' ')}
                    </span>
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Progress and Timeline */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Progress & Timeline</h4>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between text-sm text-gray-600 mb-1">
                            <span>Overall Progress</span>
                            <span>{project.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${project.progress}%` }}
                            ></div>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          {project.timeline.milestones.map((milestone) => (
                            <div key={milestone.id} className="flex items-center">
                              <div className={`w-4 h-4 rounded-full mr-3 ${
                                milestone.completed ? 'bg-green-500' : 'bg-gray-300'
                              }`}></div>
                              <div className="flex-1">
                                <span className={`text-sm ${
                                  milestone.completed ? 'text-gray-900 line-through' : 'text-gray-700'
                                }`}>
                                  {milestone.title}
                                </span>
                                <span className="text-xs text-gray-500 ml-2">
                                  {milestone.date.toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    {/* Assigned Agents */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">Assigned Team</h4>
                      <div className="space-y-3">
                        {project.assignedAgents.map((agentName) => {
                          const agent = agents.find(a => a.name === agentName);
                          const status = getAgentStatus(agentName);
                          
                          return (
                            <div key={agentName} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center">
                                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                  {agentName.charAt(0).toUpperCase()}
                                </div>
                                <div className="ml-3">
                                  <p className="text-sm font-medium text-gray-900 capitalize">
                                    {agentName.replace('-', ' ')}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {agent?.description.split('.')[0] || 'AI Agent'}
                                  </p>
                                </div>
                              </div>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(status)}`}>
                                {status}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Activity Feed Tab */}
        {selectedView === 'activity' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {activities.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0">
                      <span className="text-lg">{getActivityTypeIcon(activity.type)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 capitalize">
                          {activity.agentName.replace('-', ' ')}
                        </p>
                        <p className="text-xs text-gray-500">
                          {activity.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {activity.activity}
                      </p>
                      {activity.projectId && (
                        <p className="text-xs text-blue-600 mt-1">
                          Project: {projects.find(p => p.id === activity.projectId)?.title || activity.projectId}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                
                {activities.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No recent activity</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}