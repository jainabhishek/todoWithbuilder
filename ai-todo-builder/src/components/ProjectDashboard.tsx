'use client';

import React, { useState, useEffect } from 'react';
import { useProjects } from '@/hooks/useProjects';
import { useSubAgents } from '@/hooks/useSubAgents';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorMessage } from './ErrorMessage';
// Define types locally to avoid server-side imports
export interface Project {
  id: string;
  title: string;
  description: string;
  userRequest: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  assignedAgents: string[];
  progress: number;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  timeline: ProjectTimeline;
  deliverables: Deliverable[];
  currentPhase: ProjectPhase;
}

export enum ProjectStatus {
  PLANNING = 'planning',
  IN_PROGRESS = 'in-progress',
  REVIEW = 'review',
  COMPLETED = 'completed',
  ON_HOLD = 'on-hold',
  CANCELLED = 'cancelled'
}

export enum ProjectPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum ProjectPhase {
  REQUIREMENTS = 'requirements',
  DESIGN = 'design',
  DEVELOPMENT = 'development',
  TESTING = 'testing',
  DEPLOYMENT = 'deployment',
  COMPLETED = 'completed'
}

export interface ProjectTimeline {
  startDate: Date;
  estimatedEndDate: Date;
  actualEndDate?: Date;
  milestones: Milestone[];
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  phase: ProjectPhase;
  dueDate: Date;
  completed: boolean;
  completedAt?: Date;
  assignedAgent?: string;
}

export interface Deliverable {
  id: string;
  projectId: string;
  agentRole: string;
  type: DeliverableType;
  name: string;
  content: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  phase: ProjectPhase;
}

export enum DeliverableType {
  REQUIREMENTS = 'requirements',
  DESIGN = 'design',
  CODE = 'code',
  TESTS = 'tests',
  DOCUMENTATION = 'documentation',
  DEPLOYMENT = 'deployment'
}

interface ProjectDashboardProps {
  className?: string;
}

// Helper function to safely format dates
const formatDate = (date: Date | string | undefined): string => {
  if (!date) return 'N/A';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString();
  } catch {
    return 'Invalid Date';
  }
};

export function ProjectDashboard({ className = '' }: ProjectDashboardProps) {
  const {
    projects,
    loading: projectsLoading,
    error: projectsError,
    createProject,
    assignAgents,
    autoAssignAgents,
    executeProject,
    stopProjectExecution,
    refreshProjects
  } = useProjects();

  const {
    agents,
    error: agentsError
  } = useSubAgents();

  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [executingProjects, setExecutingProjects] = useState<Set<string>>(new Set());

  // Auto-refresh projects every 2 minutes, only when there are active projects
  useEffect(() => {
    const hasActiveProjects = projects.some(p => 
      p.status === ProjectStatus.IN_PROGRESS || 
      p.status === ProjectStatus.PLANNING
    );

    if (!hasActiveProjects) {
      return; // Don't auto-refresh if no active projects
    }

    const interval = setInterval(() => {
      refreshProjects();
    }, 120000); // 2 minutes instead of 30 seconds

    return () => clearInterval(interval);
  }, [refreshProjects, projects]);

  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case ProjectStatus.IN_PROGRESS:
        return 'text-blue-600 bg-blue-100';
      case ProjectStatus.COMPLETED:
        return 'text-green-600 bg-green-100';
      case ProjectStatus.ON_HOLD:
        return 'text-yellow-600 bg-yellow-100';
      case ProjectStatus.REVIEW:
        return 'text-purple-600 bg-purple-100';
      case ProjectStatus.CANCELLED:
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityColor = (priority: ProjectPriority) => {
    switch (priority) {
      case ProjectPriority.URGENT:
        return 'text-red-600 bg-red-100 border-red-200';
      case ProjectPriority.HIGH:
        return 'text-orange-600 bg-orange-100 border-orange-200';
      case ProjectPriority.MEDIUM:
        return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      default:
        return 'text-green-600 bg-green-100 border-green-200';
    }
  };

  const getPhaseIcon = (phase: ProjectPhase) => {
    switch (phase) {
      case ProjectPhase.REQUIREMENTS:
        return '📋';
      case ProjectPhase.DESIGN:
        return '🎨';
      case ProjectPhase.DEVELOPMENT:
        return '⚡';
      case ProjectPhase.TESTING:
        return '🧪';
      case ProjectPhase.DEPLOYMENT:
        return '🚀';
      default:
        return '📝';
    }
  };

  const handleCreateProject = async (formData: FormData) => {
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const userRequest = formData.get('userRequest') as string;
    const priority = formData.get('priority') as ProjectPriority;

    if (!title || !description || !userRequest) {
      return;
    }

    const project = await createProject({
      title,
      description,
      userRequest,
      priority
    });

    if (project) {
      setShowCreateForm(false);
      setSelectedProject(project);
    }
  };

  const handleAutoAssign = async (projectId: string) => {
    await autoAssignAgents(projectId);
  };

  const handleExecuteProject = async (projectId: string) => {
    setExecutingProjects(prev => new Set(prev).add(projectId));
    
    try {
      await executeProject(projectId);
    } finally {
      setExecutingProjects(prev => {
        const newSet = new Set(prev);
        newSet.delete(projectId);
        return newSet;
      });
    }
  };

  const handleStopExecution = async (projectId: string) => {
    await stopProjectExecution(projectId);
    setExecutingProjects(prev => {
      const newSet = new Set(prev);
      newSet.delete(projectId);
      return newSet;
    });
  };

  if (projectsLoading && projects.length === 0) {
    return (
      <div className={`p-6 ${className}`}>
        <LoadingSpinner />
        <p className="mt-2 text-gray-600">Loading project dashboard...</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-md ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Project Dashboard</h2>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => refreshProjects()}
              disabled={projectsLoading}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50"
            >
              {projectsLoading ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              New Project
            </button>
          </div>
        </div>
      </div>

      {/* Error Messages */}
      {(projectsError || agentsError) && (
        <div className="p-4">
          {projectsError && <ErrorMessage message={projectsError} className="mb-2" />}
          {agentsError && <ErrorMessage message={agentsError} />}
        </div>
      )}

      {/* Create Project Form */}
      {showCreateForm && (
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Project</h3>
          <form action={handleCreateProject} className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Project Title
              </label>
              <input
                type="text"
                id="title"
                name="title"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter project title..."
              />
            </div>
            
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                required
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe the project..."
              />
            </div>
            
            <div>
              <label htmlFor="userRequest" className="block text-sm font-medium text-gray-700 mb-1">
                User Request
              </label>
              <textarea
                id="userRequest"
                name="userRequest"
                required
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="What feature or functionality do you want?"
              />
            </div>
            
            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                id="priority"
                name="priority"
                defaultValue={ProjectPriority.MEDIUM}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={ProjectPriority.LOW}>Low</option>
                <option value={ProjectPriority.MEDIUM}>Medium</option>
                <option value={ProjectPriority.HIGH}>High</option>
                <option value={ProjectPriority.URGENT}>Urgent</option>
              </select>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Create Project
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Projects Grid */}
      <div className="p-6">
        {projects.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📋</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
            <p className="text-gray-600 mb-4">Create your first AI-powered project to get started</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Create Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedProject(project)}
              >
                {/* Project Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{project.title}</h3>
                    <p className="text-sm text-gray-600 line-clamp-2">{project.description}</p>
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(project.status)}`}>
                      {project.status.replace('-', ' ')}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded border ${getPriorityColor(project.priority)}`}>
                      {project.priority}
                    </span>
                  </div>
                </div>

                {/* Progress */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>{project.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${project.progress}%` }}
                    ></div>
                  </div>
                </div>

                {/* Current Phase */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <span className="text-lg mr-2">{getPhaseIcon(project.currentPhase)}</span>
                    <span className="text-sm font-medium text-gray-700 capitalize">
                      {project.currentPhase.replace('-', ' ')}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {project.assignedAgents.length} agents
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-2">
                  {project.assignedAgents.length === 0 ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAutoAssign(project.id);
                      }}
                      className="flex-1 px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                    >
                      Auto-assign Agents
                    </button>
                  ) : project.status === ProjectStatus.PLANNING ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExecuteProject(project.id);
                      }}
                      disabled={executingProjects.has(project.id)}
                      className="flex-1 px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
                    >
                      {executingProjects.has(project.id) ? 'Starting...' : 'Start Project'}
                    </button>
                  ) : project.status === ProjectStatus.IN_PROGRESS ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStopExecution(project.id);
                      }}
                      className="flex-1 px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                    >
                      Stop Execution
                    </button>
                  ) : null}
                </div>

                {/* Timeline */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="text-xs text-gray-500">
                    Created: {formatDate(project.createdAt)}
                    {project.completedAt && (
                      <span className="ml-2">
                        • Completed: {formatDate(project.completedAt)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Project Detail Modal */}
      {selectedProject && (
        <ProjectDetailModal
          project={selectedProject}
          agents={agents}
          onClose={() => setSelectedProject(null)}
          onAssignAgents={assignAgents}
          onExecute={handleExecuteProject}
          onStop={handleStopExecution}
          isExecuting={executingProjects.has(selectedProject.id)}
        />
      )}
    </div>
  );
}

interface ProjectDetailModalProps {
  project: Project;
  agents: Array<{ name: string; description: string; tools?: string[] }>;
  onClose: () => void;
  onAssignAgents: (projectId: string, agentRoles: string[]) => Promise<boolean>;
  onExecute: (projectId: string) => Promise<void>;
  onStop: (projectId: string) => Promise<void>;
  isExecuting: boolean;
}

function ProjectDetailModal({
  project,
  agents,
  onClose,
  onAssignAgents,
  onExecute,
  onStop,
  isExecuting
}: ProjectDetailModalProps) {
  const [selectedAgents, setSelectedAgents] = useState<string[]>(project.assignedAgents);

  const handleAssignAgents = async () => {
    const success = await onAssignAgents(project.id, selectedAgents);
    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">{project.title}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Project Info */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Project Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(project.status)}`}>
                  {project.status.replace('-', ' ')}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Priority</label>
                <span className={`inline-block px-2 py-1 text-xs font-medium rounded border ${getPriorityColor(project.priority)}`}>
                  {project.priority}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Progress</label>
                <div className="flex items-center">
                  <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${project.progress}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600">{project.progress}%</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Current Phase</label>
                <span className="text-sm text-gray-900 capitalize">
                  {project.currentPhase.replace('-', ' ')}
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
            <p className="text-gray-700">{project.description}</p>
          </div>

          {/* User Request */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">User Request</h3>
            <p className="text-gray-700 bg-gray-50 p-3 rounded-md">{project.userRequest}</p>
          </div>

          {/* Agent Assignment */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Assigned Agents</h3>
            <div className="space-y-2">
              {agents.map((agent) => (
                <label key={agent.name} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedAgents.includes(agent.name)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedAgents([...selectedAgents, agent.name]);
                      } else {
                        setSelectedAgents(selectedAgents.filter(a => a !== agent.name));
                      }
                    }}
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <span className="font-medium capitalize">
                      {agent.name.replace('-', ' ')}
                    </span>
                    <p className="text-sm text-gray-600">{agent.description}</p>
                  </div>
                </label>
              ))}
            </div>
            
            {selectedAgents.length !== project.assignedAgents.length || 
             !selectedAgents.every(agent => project.assignedAgents.includes(agent)) && (
              <button
                onClick={handleAssignAgents}
                className="mt-3 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Update Agent Assignment
              </button>
            )}
          </div>

          {/* Milestones */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Milestones</h3>
            <div className="space-y-2">
              {project.timeline.milestones.map((milestone) => (
                <div key={milestone.id} className="flex items-center">
                  <div className={`w-4 h-4 rounded-full mr-3 ${
                    milestone.completed ? 'bg-green-500' : 'bg-gray-300'
                  }`}></div>
                  <div className="flex-1">
                    <span className={`font-medium ${
                      milestone.completed ? 'text-gray-900 line-through' : 'text-gray-700'
                    }`}>
                      {milestone.title}
                    </span>
                    <p className="text-sm text-gray-600">{milestone.description}</p>
                    <p className="text-xs text-gray-500">
                      Due: {formatDate(milestone.dueDate)}
                      {milestone.completedAt && (
                        <span className="ml-2">
                          • Completed: {formatDate(milestone.completedAt)}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Deliverables */}
          {project.deliverables.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Deliverables</h3>
              <div className="space-y-3">
                {project.deliverables.map((deliverable) => (
                  <div key={deliverable.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{deliverable.name}</h4>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500 capitalize">
                          {deliverable.agentRole.replace('-', ' ')}
                        </span>
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                          {deliverable.type}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded max-h-32 overflow-y-auto">
                      <pre className="whitespace-pre-wrap">{deliverable.content}</pre>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Created: {formatDate(deliverable.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
          >
            Close
          </button>
          
          {project.status === ProjectStatus.PLANNING && project.assignedAgents.length > 0 && (
            <button
              onClick={() => onExecute(project.id)}
              disabled={isExecuting}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isExecuting ? 'Starting...' : 'Start Project'}
            </button>
          )}
          
          {project.status === ProjectStatus.IN_PROGRESS && (
            <button
              onClick={() => onStop(project.id)}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Stop Execution
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function getStatusColor(status: ProjectStatus) {
  switch (status) {
    case ProjectStatus.IN_PROGRESS:
      return 'text-blue-600 bg-blue-100';
    case ProjectStatus.COMPLETED:
      return 'text-green-600 bg-green-100';
    case ProjectStatus.ON_HOLD:
      return 'text-yellow-600 bg-yellow-100';
    case ProjectStatus.REVIEW:
      return 'text-purple-600 bg-purple-100';
    case ProjectStatus.CANCELLED:
      return 'text-red-600 bg-red-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
}

function getPriorityColor(priority: ProjectPriority) {
  switch (priority) {
    case ProjectPriority.URGENT:
      return 'text-red-600 bg-red-100 border-red-200';
    case ProjectPriority.HIGH:
      return 'text-orange-600 bg-orange-100 border-orange-200';
    case ProjectPriority.MEDIUM:
      return 'text-yellow-600 bg-yellow-100 border-yellow-200';
    default:
      return 'text-green-600 bg-green-100 border-green-200';
  }
}