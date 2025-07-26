import { v4 as uuidv4 } from 'uuid';
import { AgentRole } from './sub-agent-manager';
import { CommunicationManager, HandoffRequest } from './communication-manager';
import { SharedWorkspace, WorkspaceFile } from './shared-workspace';
import { NotificationSystem } from './notification-system';

export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  assignedAgent: string;
  dependencies: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'blocked' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  estimatedDuration: number; // in minutes
  actualDuration?: number;
  deliverables: string[];
  reviewers: string[];
  approvals: WorkflowApproval[];
}

export interface WorkflowApproval {
  id: string;
  reviewerId: string;
  status: 'pending' | 'approved' | 'rejected' | 'changes_requested';
  comments?: string;
  reviewedAt?: Date;
}

export interface CodeReview {
  id: string;
  fileId: string;
  authorId: string;
  reviewerId: string;
  status: 'pending' | 'in_progress' | 'approved' | 'rejected' | 'changes_requested';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: Date;
  reviewedAt?: Date;
  comments: CodeReviewComment[];
  checklist: CodeReviewChecklist;
  metrics: CodeReviewMetrics;
}

export interface CodeReviewComment {
  id: string;
  lineNumber?: number;
  content: string;
  type: 'suggestion' | 'issue' | 'question' | 'praise';
  severity: 'info' | 'warning' | 'error';
  resolved: boolean;
  createdAt: Date;
  resolvedAt?: Date;
}

export interface CodeReviewChecklist {
  functionality: boolean;
  codeQuality: boolean;
  performance: boolean;
  security: boolean;
  testing: boolean;
  documentation: boolean;
  accessibility: boolean;
}

export interface CodeReviewMetrics {
  linesOfCode: number;
  complexity: number;
  testCoverage: number;
  reviewDuration?: number;
  issuesFound: number;
  issuesResolved: number;
}

export interface Conflict {
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

export interface HandoffProcess {
  id: string;
  fromAgent: string;
  toAgent: string;
  context: HandoffContext;
  status: 'initiated' | 'knowledge_transfer' | 'review' | 'accepted' | 'completed' | 'failed';
  steps: HandoffStep[];
  createdAt: Date;
  completedAt?: Date;
}

export interface HandoffContext {
  projectId?: string;
  taskDescription: string;
  deliverables: string[];
  dependencies: string[];
  timeline: Date;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  knowledgeBase: Record<string, unknown>;
  resources: string[];
}

export interface HandoffStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  assignedTo: string;
  completedAt?: Date;
  notes?: string;
}

/**
 * Workflow Coordinator
 * Manages structured handoff processes, code reviews, and conflict resolution
 */
export class WorkflowCoordinator {
  private communicationManager: CommunicationManager;
  private sharedWorkspace: SharedWorkspace;
  private notificationSystem: NotificationSystem;
  private workflows: Map<string, WorkflowStep[]> = new Map();
  private codeReviews: Map<string, CodeReview> = new Map();
  private conflicts: Map<string, Conflict> = new Map();
  private handoffProcesses: Map<string, HandoffProcess> = new Map();

  constructor(
    communicationManager: CommunicationManager,
    sharedWorkspace: SharedWorkspace,
    notificationSystem: NotificationSystem
  ) {
    this.communicationManager = communicationManager;
    this.sharedWorkspace = sharedWorkspace;
    this.notificationSystem = notificationSystem;
  }

  /**
   * Create a structured workflow for a project phase
   */
  async createWorkflow(
    projectId: string,
    phase: string,
    steps: Omit<WorkflowStep, 'id' | 'status' | 'approvals'>[]
  ): Promise<string> {
    const workflowId = uuidv4();
    
    const workflowSteps: WorkflowStep[] = steps.map(step => ({
      ...step,
      id: uuidv4(),
      status: 'pending',
      approvals: step.reviewers.map(reviewerId => ({
        id: uuidv4(),
        reviewerId,
        status: 'pending'
      }))
    }));

    this.workflows.set(workflowId, workflowSteps);

    // Notify assigned agents
    for (const step of workflowSteps) {
      await this.notificationSystem.sendProjectNotification(
        'assigned',
        {
          projectId,
          projectTitle: `${phase} Workflow`,
          agentRole: step.assignedAgent
        },
        step.assignedAgent
      );
    }

    return workflowId;
  }

  /**
   * Start a workflow step
   */
  async startWorkflowStep(workflowId: string, stepId: string): Promise<boolean> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return false;

    const step = workflow.find(s => s.id === stepId);
    if (!step) return false;

    // Check dependencies
    const dependencySteps = workflow.filter(s => step.dependencies.includes(s.id));
    const uncompletedDependencies = dependencySteps.filter(s => s.status !== 'completed');
    
    if (uncompletedDependencies.length > 0) {
      step.status = 'blocked';
      return false;
    }

    step.status = 'in_progress';
    step.startedAt = new Date();

    // Notify agent
    await this.notificationSystem.sendProjectNotification(
      'phase_started',
      {
        projectId: workflowId,
        projectTitle: step.name,
        phase: 'execution'
      },
      step.assignedAgent
    );

    return true;
  }

  /**
   * Complete a workflow step
   */
  async completeWorkflowStep(
    workflowId: string,
    stepId: string,
    deliverables: string[]
  ): Promise<boolean> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return false;

    const step = workflow.find(s => s.id === stepId);
    if (!step || step.status !== 'in_progress') return false;

    step.deliverables = deliverables;
    step.completedAt = new Date();
    step.actualDuration = step.startedAt 
      ? (step.completedAt.getTime() - step.startedAt.getTime()) / (1000 * 60)
      : undefined;

    // If reviewers are required, set status to pending review
    if (step.reviewers.length > 0) {
      step.status = 'completed'; // Will be updated based on reviews
      
      // Request reviews
      for (const reviewerId of step.reviewers) {
        await this.requestStepReview(workflowId, stepId, reviewerId);
      }
    } else {
      step.status = 'completed';
    }

    // Check if next steps can be started
    await this.checkAndStartNextSteps(workflowId);

    return true;
  }

  /**
   * Request a step review
   */
  private async requestStepReview(
    workflowId: string,
    stepId: string,
    reviewerId: string
  ): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return;

    const step = workflow.find(s => s.id === stepId);
    if (!step) return;

    // Send notification to reviewer
    await this.notificationSystem.sendNotification({
      id: uuidv4(),
      type: 'info',
      category: 'project',
      title: 'Review Request',
      message: `Please review the completed step: ${step.name}`,
      data: { workflowId, stepId, step },
      recipient: reviewerId,
      sender: step.assignedAgent,
      persistent: true,
      read: false,
      createdAt: new Date(),
      priority: 'medium',
      actions: [
        {
          id: uuidv4(),
          label: 'Approve',
          action: 'approve_step',
          data: { workflowId, stepId },
          style: 'primary'
        },
        {
          id: uuidv4(),
          label: 'Request Changes',
          action: 'request_changes',
          data: { workflowId, stepId },
          style: 'secondary'
        },
        {
          id: uuidv4(),
          label: 'View Details',
          action: 'view_step_details',
          data: { workflowId, stepId }
        }
      ]
    });
  }

  /**
   * Approve or reject a workflow step
   */
  async reviewWorkflowStep(
    workflowId: string,
    stepId: string,
    reviewerId: string,
    status: 'approved' | 'rejected' | 'changes_requested',
    comments?: string
  ): Promise<boolean> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return false;

    const step = workflow.find(s => s.id === stepId);
    if (!step) return false;

    const approval = step.approvals.find(a => a.reviewerId === reviewerId);
    if (!approval) return false;

    approval.status = status;
    approval.comments = comments;
    approval.reviewedAt = new Date();

    // Check if all reviews are complete
    const allApproved = step.approvals.every(a => a.status === 'approved');
    const anyRejected = step.approvals.some(a => a.status === 'rejected');
    const anyChangesRequested = step.approvals.some(a => a.status === 'changes_requested');

    if (allApproved) {
      step.status = 'completed';
      await this.checkAndStartNextSteps(workflowId);
    } else if (anyRejected || anyChangesRequested) {
      step.status = 'blocked';
      
      // Notify the assigned agent
      await this.notificationSystem.sendProjectNotification(
        'blocked',
        {
          projectId: workflowId,
          projectTitle: step.name,
          reason: comments || 'Review feedback received'
        },
        step.assignedAgent
      );
    }

    return true;
  }

  /**
   * Check and start next workflow steps
   */
  private async checkAndStartNextSteps(workflowId: string): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return;

    const pendingSteps = workflow.filter(s => s.status === 'pending');
    
    for (const step of pendingSteps) {
      const dependencySteps = workflow.filter(s => step.dependencies.includes(s.id));
      const allDependenciesComplete = dependencySteps.every(s => s.status === 'completed');
      
      if (allDependenciesComplete) {
        await this.startWorkflowStep(workflowId, step.id);
      }
    }
  }

  /**
   * Create a structured handoff process
   */
  async createHandoffProcess(
    fromAgent: string,
    toAgent: string,
    context: HandoffContext
  ): Promise<HandoffProcess> {
    const handoffId = uuidv4();
    
    const handoffSteps: HandoffStep[] = [
      {
        id: uuidv4(),
        name: 'Knowledge Transfer',
        description: 'Transfer context and knowledge to receiving agent',
        status: 'pending',
        assignedTo: fromAgent
      },
      {
        id: uuidv4(),
        name: 'Context Review',
        description: 'Review and understand the transferred context',
        status: 'pending',
        assignedTo: toAgent
      },
      {
        id: uuidv4(),
        name: 'Acceptance Confirmation',
        description: 'Confirm acceptance of the handoff',
        status: 'pending',
        assignedTo: toAgent
      },
      {
        id: uuidv4(),
        name: 'Handoff Completion',
        description: 'Finalize the handoff process',
        status: 'pending',
        assignedTo: 'system'
      }
    ];

    const handoffProcess: HandoffProcess = {
      id: handoffId,
      fromAgent,
      toAgent,
      context,
      status: 'initiated',
      steps: handoffSteps,
      createdAt: new Date()
    };

    this.handoffProcesses.set(handoffId, handoffProcess);

    // Start the first step
    await this.startHandoffStep(handoffId, handoffSteps[0].id);

    return handoffProcess;
  }

  /**
   * Start a handoff step
   */
  private async startHandoffStep(handoffId: string, stepId: string): Promise<void> {
    const handoff = this.handoffProcesses.get(handoffId);
    if (!handoff) return;

    const step = handoff.steps.find(s => s.id === stepId);
    if (!step) return;

    step.status = 'in_progress';

    // Send notification to assigned agent
    if (step.assignedTo !== 'system') {
      await this.notificationSystem.sendHandoffNotification(
        'requested',
        {
          id: handoffId,
          fromAgent: handoff.fromAgent,
          toAgent: handoff.toAgent,
          reason: step.description,
          context: handoff.context,
          taskDescription: handoff.context.taskDescription,
          status: 'pending',
          createdAt: handoff.createdAt,
          projectId: handoff.context.projectId
        } as HandoffRequest
      );
    }
  }

  /**
   * Complete a handoff step
   */
  async completeHandoffStep(
    handoffId: string,
    stepId: string,
    notes?: string
  ): Promise<boolean> {
    const handoff = this.handoffProcesses.get(handoffId);
    if (!handoff) return false;

    const step = handoff.steps.find(s => s.id === stepId);
    if (!step || step.status !== 'in_progress') return false;

    step.status = 'completed';
    step.completedAt = new Date();
    step.notes = notes;

    // Start next step
    const currentIndex = handoff.steps.findIndex(s => s.id === stepId);
    if (currentIndex < handoff.steps.length - 1) {
      const nextStep = handoff.steps[currentIndex + 1];
      await this.startHandoffStep(handoffId, nextStep.id);
    } else {
      // All steps completed
      handoff.status = 'completed';
      handoff.completedAt = new Date();
      
      await this.notificationSystem.sendHandoffNotification(
        'completed',
        {
          id: handoffId,
          fromAgent: handoff.fromAgent,
          toAgent: handoff.toAgent,
          reason: 'Handoff process completed',
          context: handoff.context,
          taskDescription: handoff.context.taskDescription,
          status: 'completed',
          createdAt: handoff.createdAt,
          completedAt: handoff.completedAt,
          projectId: handoff.context.projectId
        } as HandoffRequest
      );
    }

    return true;
  }

  /**
   * Create a code review
   */
  async createCodeReview(
    fileId: string,
    authorId: string,
    reviewerId: string,
    priority: CodeReview['priority'] = 'medium'
  ): Promise<CodeReview> {
    const file = this.sharedWorkspace.getFile(fileId);
    if (!file) {
      throw new Error(`File ${fileId} not found`);
    }

    const codeReview: CodeReview = {
      id: uuidv4(),
      fileId,
      authorId,
      reviewerId,
      status: 'pending',
      priority,
      createdAt: new Date(),
      comments: [],
      checklist: {
        functionality: false,
        codeQuality: false,
        performance: false,
        security: false,
        testing: false,
        documentation: false,
        accessibility: false
      },
      metrics: {
        linesOfCode: file.content.split('\n').length,
        complexity: this.calculateComplexity(file.content),
        testCoverage: 0,
        issuesFound: 0,
        issuesResolved: 0
      }
    };

    this.codeReviews.set(codeReview.id, codeReview);

    // Notify reviewer
    await this.notificationSystem.sendWorkspaceNotification(
      'file_comment_added',
      {
        fileName: file.name,
        agentRole: authorId,
        fileId,
        commentId: codeReview.id
      },
      reviewerId,
      file.projectId
    );

    return codeReview;
  }

  /**
   * Add a code review comment
   */
  async addCodeReviewComment(
    reviewId: string,
    content: string,
    type: CodeReviewComment['type'] = 'suggestion',
    severity: CodeReviewComment['severity'] = 'info',
    lineNumber?: number
  ): Promise<CodeReviewComment> {
    const review = this.codeReviews.get(reviewId);
    if (!review) {
      throw new Error(`Code review ${reviewId} not found`);
    }

    const comment: CodeReviewComment = {
      id: uuidv4(),
      lineNumber,
      content,
      type,
      severity,
      resolved: false,
      createdAt: new Date()
    };

    review.comments.push(comment);
    review.metrics.issuesFound++;

    if (severity === 'error') {
      review.status = 'changes_requested';
    }

    return comment;
  }

  /**
   * Complete a code review
   */
  async completeCodeReview(
    reviewId: string,
    status: 'approved' | 'rejected' | 'changes_requested',
    checklist: Partial<CodeReviewChecklist>
  ): Promise<boolean> {
    const review = this.codeReviews.get(reviewId);
    if (!review) return false;

    review.status = status;
    review.reviewedAt = new Date();
    review.checklist = { ...review.checklist, ...checklist };
    review.metrics.reviewDuration = review.reviewedAt.getTime() - review.createdAt.getTime();

    // Notify author
    const file = this.sharedWorkspace.getFile(review.fileId);
    if (file) {
      await this.notificationSystem.sendWorkspaceNotification(
        'file_comment_added',
        {
          fileName: file.name,
          agentRole: review.reviewerId,
          fileId: review.fileId,
          commentId: review.id
        },
        review.authorId,
        file.projectId
      );
    }

    return true;
  }

  /**
   * Create a conflict
   */
  async createConflict(
    type: Conflict['type'],
    severity: Conflict['severity'],
    description: string,
    involvedAgents: string[],
    projectId?: string
  ): Promise<Conflict> {
    const conflict: Conflict = {
      id: uuidv4(),
      type,
      severity,
      description,
      involvedAgents,
      projectId,
      status: 'open',
      createdAt: new Date(),
      escalationLevel: 0
    };

    this.conflicts.set(conflict.id, conflict);

    // Auto-assign Scrum Master for mediation if severity is high or critical
    if (severity === 'high' || severity === 'critical') {
      await this.assignMediator(conflict.id, AgentRole.SCRUM_MASTER);
    }

    // Notify involved agents
    for (const agentId of involvedAgents) {
      await this.notificationSystem.sendSystemNotification(
        'error',
        {
          errorMessage: `Conflict detected: ${description}`,
          errorCode: `CONFLICT_${type.toUpperCase()}`
        },
        agentId
      );
    }

    return conflict;
  }

  /**
   * Assign a mediator to a conflict
   */
  async assignMediator(conflictId: string, mediatorId: string): Promise<boolean> {
    const conflict = this.conflicts.get(conflictId);
    if (!conflict) return false;

    conflict.mediator = mediatorId;
    conflict.status = 'in_mediation';

    // Notify mediator
    await this.notificationSystem.sendSystemNotification(
      'error',
      {
        errorMessage: `You have been assigned to mediate a ${conflict.type} conflict`,
        errorCode: `MEDIATION_${conflict.id}`
      },
      mediatorId
    );

    return true;
  }

  /**
   * Resolve a conflict
   */
  async resolveConflict(
    conflictId: string,
    resolution: string,
    resolvedBy: string
  ): Promise<boolean> {
    const conflict = this.conflicts.get(conflictId);
    if (!conflict) return false;

    conflict.status = 'resolved';
    conflict.resolution = resolution;
    conflict.resolvedAt = new Date();

    // Notify involved agents
    for (const agentId of conflict.involvedAgents) {
      await this.notificationSystem.sendSystemNotification(
        'maintenance',
        {
          maintenanceTime: 'Conflict resolved',
          errorMessage: `Conflict resolved: ${resolution}`
        },
        agentId
      );
    }

    return true;
  }

  /**
   * Escalate a conflict
   */
  async escalateConflict(conflictId: string): Promise<boolean> {
    const conflict = this.conflicts.get(conflictId);
    if (!conflict) return false;

    conflict.escalationLevel++;
    
    if (conflict.escalationLevel >= 3) {
      conflict.status = 'escalated';
      
      // Notify system administrators
      await this.notificationSystem.sendSystemNotification(
        'error',
        {
          errorMessage: `Critical conflict escalated: ${conflict.description}`,
          errorCode: `ESCALATION_LEVEL_${conflict.escalationLevel}`
        },
        'all'
      );
    }

    return true;
  }

  /**
   * Calculate code complexity (simplified)
   */
  private calculateComplexity(code: string): number {
    // Simple complexity calculation based on control structures
    const controlStructures = [
      'if', 'else', 'for', 'while', 'switch', 'case', 'try', 'catch', 'finally'
    ];
    
    let complexity = 1; // Base complexity
    
    for (const structure of controlStructures) {
      const regex = new RegExp(`\\b${structure}\\b`, 'g');
      const matches = code.match(regex);
      if (matches) {
        complexity += matches.length;
      }
    }
    
    return complexity;
  }

  /**
   * Get workflow status
   */
  getWorkflow(workflowId: string): WorkflowStep[] | undefined {
    return this.workflows.get(workflowId);
  }

  /**
   * Get all workflows
   */
  getAllWorkflows(): Array<{ id: string; steps: WorkflowStep[] }> {
    return Array.from(this.workflows.entries()).map(([id, steps]) => ({ id, steps }));
  }

  /**
   * Get code review
   */
  getCodeReview(reviewId: string): CodeReview | undefined {
    return this.codeReviews.get(reviewId);
  }

  /**
   * Get all code reviews
   */
  getAllCodeReviews(): CodeReview[] {
    return Array.from(this.codeReviews.values());
  }

  /**
   * Get conflict
   */
  getConflict(conflictId: string): Conflict | undefined {
    return this.conflicts.get(conflictId);
  }

  /**
   * Get all conflicts
   */
  getAllConflicts(): Conflict[] {
    return Array.from(this.conflicts.values());
  }

  /**
   * Get handoff process
   */
  getHandoffProcess(handoffId: string): HandoffProcess | undefined {
    return this.handoffProcesses.get(handoffId);
  }

  /**
   * Get all handoff processes
   */
  getAllHandoffProcesses(): HandoffProcess[] {
    return Array.from(this.handoffProcesses.values());
  }

  /**
   * Get workflow statistics
   */
  getWorkflowStatistics(): {
    totalWorkflows: number;
    activeWorkflows: number;
    completedSteps: number;
    pendingReviews: number;
    activeConflicts: number;
    codeReviewsInProgress: number;
    handoffsInProgress: number;
  } {
    const allWorkflows = Array.from(this.workflows.values()).flat();
    const allConflicts = Array.from(this.conflicts.values());
    const allCodeReviews = Array.from(this.codeReviews.values());
    const allHandoffs = Array.from(this.handoffProcesses.values());

    return {
      totalWorkflows: this.workflows.size,
      activeWorkflows: Array.from(this.workflows.values()).filter(steps => 
        steps.some(step => step.status === 'in_progress')
      ).length,
      completedSteps: allWorkflows.filter(step => step.status === 'completed').length,
      pendingReviews: allWorkflows.filter(step => 
        step.approvals.some(approval => approval.status === 'pending')
      ).length,
      activeConflicts: allConflicts.filter(conflict => 
        conflict.status === 'open' || conflict.status === 'in_mediation'
      ).length,
      codeReviewsInProgress: allCodeReviews.filter(review => 
        review.status === 'pending' || review.status === 'in_progress'
      ).length,
      handoffsInProgress: allHandoffs.filter(handoff => 
        handoff.status !== 'completed' && handoff.status !== 'failed'
      ).length
    };
  }
}