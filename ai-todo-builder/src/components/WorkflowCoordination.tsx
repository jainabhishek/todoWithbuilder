'use client';

import React, { useState, useEffect } from 'react';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorMessage } from './ErrorMessage';

interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  assignedAgent: string;
  dependencies: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'blocked' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  estimatedDuration: number;
  actualDuration?: number;
  deliverables: string[];
  reviewers: string[];
  approvals: Array<{
    id: string;
    reviewerId: string;
    status: 'pending' | 'approved' | 'rejected' | 'changes_requested';
    comments?: string;
    reviewedAt?: Date;
  }>;
}

interface CodeReview {
  id: string;
  fileId: string;
  authorId: string;
  reviewerId: string;
  status: 'pending' | 'in_progress' | 'approved' | 'rejected' | 'changes_requested';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: Date;
  reviewedAt?: Date;
  comments: Array<{
    id: string;
    lineNumber?: number;
    content: string;
    type: 'suggestion' | 'issue' | 'question' | 'praise';
    severity: 'info' | 'warning' | 'error';
    resolved: boolean;
    createdAt: Date;
  }>;
  checklist: {
    functionality: boolean;
    codeQuality: boolean;
    performance: boolean;
    security: boolean;
    testing: boolean;
    documentation: boolean;
    accessibility: boolean;
  };
  metrics: {
    linesOfCode: number;
    complexity: number;
    testCoverage: number;
    reviewDuration?: number;
    issuesFound: number;
    issuesResolved: number;
  };
}

interface Conflict {
  id: string;
  type: 'resource' | 'priority' | 'technical' | 'communication' | 'deadline';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  involvedAgents: string[];
  projectId?: string;
  status: 'open' | 'in_mediation' | 'resolved' | 'escalated';
  createdAt: Date;
  resolvedAt?: Date;
  mediator?: string;
  resolution?: string;
  escalationLevel: number;
}

interface HandoffProcess {
  id: string;
  fromAgent: string;
  toAgent: string;
  context: {
    projectId?: string;
    taskDescription: string;
    deliverables: string[];
    dependencies: string[];
    timeline: Date;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    knowledgeBase: Record<string, unknown>;
    resources: string[];
  };
  status: 'initiated' | 'knowledge_transfer' | 'review' | 'accepted' | 'completed' | 'failed';
  steps: Array<{
    id: string;
    name: string;
    description: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    assignedTo: string;
    completedAt?: Date;
    notes?: string;
  }>;
  createdAt: Date;
  completedAt?: Date;
}

interface WorkflowStatistics {
  totalWorkflows: number;
  activeWorkflows: number;
  completedSteps: number;
  pendingReviews: number;
  activeConflicts: number;
  codeReviewsInProgress: number;
  handoffsInProgress: number;
}

interface WorkflowCoordinationProps {
  className?: string;
}

export function WorkflowCoordination({ className = '' }: WorkflowCoordinationProps) {
  const [workflows, setWorkflows] = useState<Array<{ id: string; steps: WorkflowStep[] }>>([]);
  const [codeReviews, setCodeReviews] = useState<CodeReview[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [handoffs, setHandoffs] = useState<HandoffProcess[]>([]);
  const [statistics, setStatistics] = useState<WorkflowStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'workflows' | 'reviews' | 'conflicts' | 'handoffs'>('overview');

  // Fetch workflow data
  const fetchWorkflowData = async () => {
    try {
      setError(null);
      
      const response = await fetch('/api/communication/workflows');
      const data = await response.json();

      if (data.success) {
        setWorkflows(data.data.workflows || []);
        setCodeReviews(data.data.codeReviews || []);
        setConflicts(data.data.conflicts || []);
        setHandoffs(data.data.handoffs || []);
        setStatistics(data.data.statistics || null);
      } else {
        setError(data.error || 'Failed to fetch workflow data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch workflow data');
    } finally {
      setLoading(false);
    }
  };

  // Complete workflow step
  const completeWorkflowStep = async (workflowId: string, stepId: string, deliverables: string[]) => {
    try {
      const response = await fetch('/api/communication/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete_step',
          workflowId,
          stepId,
          deliverables
        })
      });

      const data = await response.json();
      if (data.success) {
        await fetchWorkflowData();
      } else {
        setError(data.error || 'Failed to complete workflow step');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete workflow step');
    }
  };

  // Review workflow step
  const reviewWorkflowStep = async (
    workflowId: string,
    stepId: string,
    reviewerId: string,
    status: 'approved' | 'rejected' | 'changes_requested',
    comments?: string
  ) => {
    try {
      const response = await fetch('/api/communication/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'review_step',
          workflowId,
          stepId,
          reviewerId,
          status,
          comments
        })
      });

      const data = await response.json();
      if (data.success) {
        await fetchWorkflowData();
      } else {
        setError(data.error || 'Failed to review workflow step');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to review workflow step');
    }
  };

  // Complete code review
  const completeCodeReview = async (
    reviewId: string,
    status: 'approved' | 'rejected' | 'changes_requested',
    checklist: Partial<CodeReview['checklist']>
  ) => {
    try {
      const response = await fetch('/api/communication/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete_code_review',
          reviewId,
          status,
          checklist
        })
      });

      const data = await response.json();
      if (data.success) {
        await fetchWorkflowData();
      } else {
        setError(data.error || 'Failed to complete code review');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete code review');
    }
  };

  // Resolve conflict
  const resolveConflict = async (conflictId: string, resolution: string, resolvedBy: string) => {
    try {
      const response = await fetch('/api/communication/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resolve_conflict',
          conflictId,
          resolution,
          resolvedBy
        })
      });

      const data = await response.json();
      if (data.success) {
        await fetchWorkflowData();
      } else {
        setError(data.error || 'Failed to resolve conflict');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve conflict');
    }
  };

  useEffect(() => {
    fetchWorkflowData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchWorkflowData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'approved':
      case 'resolved':
        return 'text-green-600 bg-green-100';
      case 'in_progress':
      case 'in_mediation':
        return 'text-blue-600 bg-blue-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'blocked':
      case 'rejected':
      case 'changes_requested':
        return 'text-red-600 bg-red-100';
      case 'failed':
      case 'escalated':
        return 'text-red-600 bg-red-200';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-700 bg-red-200';
      case 'high':
        return 'text-red-600 bg-red-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'low':
        return 'text-green-600 bg-green-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className={`p-6 ${className}`}>
        <LoadingSpinner />
        <p className="mt-2 text-gray-600">Loading workflow coordination...</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-md ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Workflow Coordination</h2>
          <button
            onClick={fetchWorkflowData}
            disabled={loading}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
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
            { id: 'workflows', label: `Workflows (${workflows.length})` },
            { id: 'reviews', label: `Code Reviews (${codeReviews.length})` },
            { id: 'conflicts', label: `Conflicts (${conflicts.length})` },
            { id: 'handoffs', label: `Handoffs (${handoffs.length})` }
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
        {activeTab === 'overview' && statistics && (
          <div className="space-y-6">
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-blue-800">Active Workflows</h3>
                <p className="text-2xl font-bold text-blue-900">{statistics.activeWorkflows}</p>
                <p className="text-xs text-blue-600">of {statistics.totalWorkflows} total</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-green-800">Completed Steps</h3>
                <p className="text-2xl font-bold text-green-900">{statistics.completedSteps}</p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-yellow-800">Pending Reviews</h3>
                <p className="text-2xl font-bold text-yellow-900">{statistics.pendingReviews}</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-red-800">Active Conflicts</h3>
                <p className="text-2xl font-bold text-red-900">{statistics.activeConflicts}</p>
              </div>
            </div>

            {/* Additional Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-purple-800">Code Reviews in Progress</h3>
                <p className="text-2xl font-bold text-purple-900">{statistics.codeReviewsInProgress}</p>
              </div>
              <div className="bg-indigo-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-indigo-800">Handoffs in Progress</h3>
                <p className="text-2xl font-bold text-indigo-900">{statistics.handoffsInProgress}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'workflows' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Active Workflows</h3>
            {workflows.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No active workflows</p>
              </div>
            ) : (
              workflows.map((workflow) => (
                <div key={workflow.id} className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-4">Workflow: {workflow.id.slice(0, 8)}...</h4>
                  <div className="space-y-3">
                    {workflow.steps.map((step) => (
                      <div key={step.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <div className="flex-1">
                          <h5 className="font-medium text-gray-900">{step.name}</h5>
                          <p className="text-sm text-gray-600">{step.description}</p>
                          <p className="text-xs text-gray-500">
                            Assigned to: {step.assignedAgent.replace('-', ' ')}
                          </p>
                          {step.reviewers.length > 0 && (
                            <p className="text-xs text-gray-500">
                              Reviewers: {step.reviewers.map(r => r.replace('-', ' ')).join(', ')}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(step.status)}`}>
                            {step.status.replace('_', ' ')}
                          </span>
                          {step.status === 'in_progress' && (
                            <button
                              onClick={() => {
                                const deliverables = prompt('Enter deliverables (comma-separated):');
                                if (deliverables) {
                                  completeWorkflowStep(workflow.id, step.id, deliverables.split(',').map(d => d.trim()));
                                }
                              }}
                              className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                            >
                              Complete
                            </button>
                          )}
                          {step.approvals.some(a => a.status === 'pending') && (
                            <button
                              onClick={() => {
                                const reviewerId = prompt('Enter your agent role:');
                                const status = prompt('Enter review status (approved/rejected/changes_requested):') as any;
                                const comments = prompt('Enter comments (optional):');
                                if (reviewerId && status) {
                                  reviewWorkflowStep(workflow.id, step.id, reviewerId, status, comments || undefined);
                                }
                              }}
                              className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                            >
                              Review
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Code Reviews</h3>
            {codeReviews.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No code reviews</p>
              </div>
            ) : (
              <div className="space-y-3">
                {codeReviews.map((review) => (
                  <div key={review.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-gray-900">Review: {review.id.slice(0, 8)}...</h4>
                        <p className="text-sm text-gray-600">
                          {review.authorId.replace('-', ' ')} → {review.reviewerId.replace('-', ' ')}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(review.priority)}`}>
                          {review.priority}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(review.status)}`}>
                          {review.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3 text-sm">
                      <div>
                        <span className="text-gray-500">Lines:</span> {review.metrics.linesOfCode}
                      </div>
                      <div>
                        <span className="text-gray-500">Complexity:</span> {review.metrics.complexity}
                      </div>
                      <div>
                        <span className="text-gray-500">Issues:</span> {review.metrics.issuesFound}
                      </div>
                      <div>
                        <span className="text-gray-500">Comments:</span> {review.comments.length}
                      </div>
                    </div>

                    {review.status === 'pending' && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => completeCodeReview(review.id, 'approved', {})}
                          className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => completeCodeReview(review.id, 'changes_requested', {})}
                          className="px-3 py-1 text-sm bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
                        >
                          Request Changes
                        </button>
                        <button
                          onClick={() => completeCodeReview(review.id, 'rejected', {})}
                          className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'conflicts' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Conflicts</h3>
            {conflicts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No conflicts</p>
              </div>
            ) : (
              <div className="space-y-3">
                {conflicts.map((conflict) => (
                  <div key={conflict.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-gray-900 capitalize">{conflict.type} Conflict</h4>
                        <p className="text-sm text-gray-600">{conflict.description}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(conflict.severity)}`}>
                          {conflict.severity}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(conflict.status)}`}>
                          {conflict.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <p className="text-sm text-gray-600">
                        Involved agents: {conflict.involvedAgents.map(a => a.replace('-', ' ')).join(', ')}
                      </p>
                      {conflict.mediator && (
                        <p className="text-sm text-gray-600">
                          Mediator: {conflict.mediator.replace('-', ' ')}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
                        Created: {new Date(conflict.createdAt).toLocaleString()}
                      </p>
                    </div>

                    {conflict.status === 'open' || conflict.status === 'in_mediation' ? (
                      <button
                        onClick={() => {
                          const resolution = prompt('Enter resolution:');
                          const resolvedBy = prompt('Enter your agent role:');
                          if (resolution && resolvedBy) {
                            resolveConflict(conflict.id, resolution, resolvedBy);
                          }
                        }}
                        className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
                      >
                        Resolve
                      </button>
                    ) : conflict.resolution && (
                      <div className="p-2 bg-green-50 rounded text-sm">
                        <strong>Resolution:</strong> {conflict.resolution}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'handoffs' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Agent Handoffs</h3>
            {handoffs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No handoff processes</p>
              </div>
            ) : (
              <div className="space-y-3">
                {handoffs.map((handoff) => (
                  <div key={handoff.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {handoff.fromAgent.replace('-', ' ')} → {handoff.toAgent.replace('-', ' ')}
                        </h4>
                        <p className="text-sm text-gray-600">{handoff.context.taskDescription}</p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(handoff.status)}`}>
                        {handoff.status.replace('_', ' ')}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      {handoff.steps.map((step, index) => (
                        <div key={step.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div>
                            <span className="text-sm font-medium">{index + 1}. {step.name}</span>
                            <p className="text-xs text-gray-600">{step.description}</p>
                          </div>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(step.status)}`}>
                            {step.status.replace('_', ' ')}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 text-xs text-gray-500">
                      <p>Priority: {handoff.context.priority}</p>
                      <p>Timeline: {new Date(handoff.context.timeline).toLocaleString()}</p>
                      <p>Created: {new Date(handoff.createdAt).toLocaleString()}</p>
                      {handoff.completedAt && (
                        <p>Completed: {new Date(handoff.completedAt).toLocaleString()}</p>
                      )}
                    </div>
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