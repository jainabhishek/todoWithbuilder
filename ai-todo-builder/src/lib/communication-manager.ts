import { SubAgentManager, SubAgentMessage, MessageType, AgentRole } from './sub-agent-manager';
import { SharedWorkspace } from './shared-workspace';
import { NotificationSystem } from './notification-system';
import { RealtimeCommunication } from './realtime-communication';
import { WorkflowCoordinator } from './workflow-coordinator';
import { v4 as uuidv4 } from 'uuid';

export interface CommunicationThread {
  id: string;
  topic: string;
  participants: string[];
  messages: SubAgentMessage[];
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'archived' | 'closed';
  projectId?: string;
}

export interface HandoffRequest {
  id: string;
  fromAgent: string;
  toAgent: string;
  reason: string;
  context: unknown;
  taskDescription: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  createdAt: Date;
  completedAt?: Date;
  projectId?: string;
}

export interface AgentWorkload {
  agentRole: string;
  currentTasks: number;
  maxCapacity: number;
  availability: 'available' | 'busy' | 'offline';
  lastActivity: Date;
  specializations: string[];
}

/**
 * Communication Manager
 * Handles inter-agent communication, handoffs, and coordination
 */
export class CommunicationManager {
  private subAgentManager: SubAgentManager;
  private sharedWorkspace: SharedWorkspace;
  private notificationSystem: NotificationSystem;
  private realtimeComm: RealtimeCommunication;
  private threads: Map<string, CommunicationThread> = new Map();
  private handoffRequests: Map<string, HandoffRequest> = new Map();
  private agentWorkloads: Map<string, AgentWorkload> = new Map();
  private messageQueue: SubAgentMessage[] = [];

  constructor(
    subAgentManager: SubAgentManager,
    sharedWorkspace: SharedWorkspace,
    realtimeComm: RealtimeCommunication
  ) {
    this.subAgentManager = subAgentManager;
    this.sharedWorkspace = sharedWorkspace;
    this.realtimeComm = realtimeComm;
    this.notificationSystem = new NotificationSystem(realtimeComm);
    this.initializeAgentWorkloads();
  }

  /**
   * Initialize agent workload tracking
   */
  private initializeAgentWorkloads(): void {
    const agentRoles = Object.values(AgentRole);
    
    agentRoles.forEach(role => {
      this.agentWorkloads.set(role, {
        agentRole: role,
        currentTasks: 0,
        maxCapacity: this.getAgentCapacity(role),
        availability: 'available',
        lastActivity: new Date(),
        specializations: this.getAgentSpecializations(role)
      });
    });
  }

  /**
   * Get agent capacity based on role
   */
  private getAgentCapacity(role: AgentRole): number {
    switch (role) {
      case AgentRole.PRODUCT_MANAGER:
      case AgentRole.SCRUM_MASTER:
        return 5; // Can handle multiple projects
      case AgentRole.FRONTEND_DEVELOPER:
      case AgentRole.BACKEND_DEVELOPER:
        return 3; // Moderate capacity
      case AgentRole.UX_DESIGNER:
      case AgentRole.SOLUTIONS_ARCHITECT:
        return 2; // More focused work
      case AgentRole.QA_ENGINEER:
      case AgentRole.DEVOPS_ENGINEER:
        return 4; // Can handle multiple testing/deployment tasks
      default:
        return 2;
    }
  }

  /**
   * Get agent specializations
   */
  private getAgentSpecializations(role: AgentRole): string[] {
    switch (role) {
      case AgentRole.PRODUCT_MANAGER:
        return ['requirements', 'user-stories', 'stakeholder-communication', 'project-planning'];
      case AgentRole.UX_DESIGNER:
        return ['ui-design', 'user-experience', 'wireframes', 'prototypes', 'accessibility'];
      case AgentRole.SOLUTIONS_ARCHITECT:
        return ['system-design', 'architecture', 'database-design', 'scalability', 'performance'];
      case AgentRole.FRONTEND_DEVELOPER:
        return ['react', 'typescript', 'ui-components', 'responsive-design', 'frontend-testing'];
      case AgentRole.BACKEND_DEVELOPER:
        return ['api-development', 'database', 'server-logic', 'authentication', 'backend-testing'];
      case AgentRole.QA_ENGINEER:
        return ['testing', 'quality-assurance', 'test-automation', 'bug-reporting', 'validation'];
      case AgentRole.DEVOPS_ENGINEER:
        return ['deployment', 'ci-cd', 'infrastructure', 'monitoring', 'security'];
      case AgentRole.SCRUM_MASTER:
        return ['project-coordination', 'agile-processes', 'team-communication', 'sprint-planning'];
      default:
        return [];
    }
  }

  /**
   * Create a communication thread
   */
  async createThread(
    topic: string,
    participants: string[],
    projectId?: string
  ): Promise<CommunicationThread> {
    const thread: CommunicationThread = {
      id: uuidv4(),
      topic,
      participants,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'active',
      projectId
    };

    this.threads.set(thread.id, thread);

    // Notify participants about the new thread
    await this.broadcastMessage({
      from: 'system',
      to: 'broadcast',
      type: MessageType.BROADCAST,
      content: {
        action: 'thread_created',
        threadId: thread.id,
        topic,
        participants
      },
      sessionId: 'system',
      threadId: thread.id
    });

    return thread;
  }

  /**
   * Send a message in a thread
   */
  async sendMessage(
    threadId: string,
    from: string,
    content: unknown,
    type: MessageType = MessageType.BROADCAST
  ): Promise<void> {
    const thread = this.threads.get(threadId);
    if (!thread) {
      throw new Error(`Thread ${threadId} not found`);
    }

    const message: SubAgentMessage = {
      id: uuidv4(),
      from,
      to: 'broadcast',
      type,
      content,
      timestamp: new Date(),
      threadId,
      sessionId: 'communication-manager'
    };

    thread.messages.push(message);
    thread.updatedAt = new Date();
    this.messageQueue.push(message);

    // Update agent activity
    this.updateAgentActivity(from);

    // Process message for potential handoffs or coordination
    await this.processMessage(message, thread);
  }

  /**
   * Process a message for coordination opportunities
   */
  private async processMessage(
    message: SubAgentMessage,
    thread: CommunicationThread
  ): Promise<void> {
    // Check if message indicates need for handoff
    if (typeof message.content === 'object' && message.content !== null) {
      const content = message.content as Record<string, unknown>;
      
      if (content.needsHandoff) {
        await this.suggestHandoff(
          message.from,
          content.targetRole as string,
          content.reason as string,
          content.context,
          content.taskDescription as string,
          thread.projectId
        );
      }

      // Check for collaboration requests
      if (content.needsCollaboration) {
        await this.facilitateCollaboration(
          message.from,
          content.collaborators as string[],
          content.task as string,
          thread.id
        );
      }
    }
  }

  /**
   * Suggest a handoff between agents
   */
  async suggestHandoff(
    fromAgent: string,
    toAgent: string,
    reason: string,
    context: unknown,
    taskDescription: string,
    projectId?: string
  ): Promise<HandoffRequest> {
    // Check if target agent is available
    const targetWorkload = this.agentWorkloads.get(toAgent);
    if (!targetWorkload || targetWorkload.availability !== 'available') {
      // Find alternative agent with similar specializations
      const alternative = this.findAlternativeAgent(toAgent, targetWorkload?.specializations || []);
      if (alternative) {
        toAgent = alternative;
      }
    }

    const handoffRequest: HandoffRequest = {
      id: uuidv4(),
      fromAgent,
      toAgent,
      reason,
      context,
      taskDescription,
      status: 'pending',
      createdAt: new Date(),
      projectId
    };

    this.handoffRequests.set(handoffRequest.id, handoffRequest);

    // Notify both agents about the handoff request
    await this.notifyHandoffRequest(handoffRequest);

    // Send notification through notification system
    await this.notificationSystem.sendHandoffNotification('requested', handoffRequest);

    return handoffRequest;
  }

  /**
   * Find alternative agent with similar specializations
   */
  private findAlternativeAgent(
    preferredAgent: string,
    requiredSpecializations: string[]
  ): string | null {
    let bestMatch: { agent: string; score: number } | null = null;

    for (const [agentRole, workload] of this.agentWorkloads.entries()) {
      if (agentRole === preferredAgent || workload.availability !== 'available') {
        continue;
      }

      // Calculate specialization match score
      const matchingSpecs = workload.specializations.filter(spec =>
        requiredSpecializations.includes(spec)
      );
      const score = matchingSpecs.length / requiredSpecializations.length;

      if (score > 0 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { agent: agentRole, score };
      }
    }

    return bestMatch?.agent || null;
  }

  /**
   * Notify agents about handoff request
   */
  private async notifyHandoffRequest(handoffRequest: HandoffRequest): Promise<void> {
    // Notify the receiving agent
    await this.sendDirectMessage(
      handoffRequest.toAgent,
      'system',
      {
        type: 'handoff_request',
        handoffId: handoffRequest.id,
        fromAgent: handoffRequest.fromAgent,
        reason: handoffRequest.reason,
        taskDescription: handoffRequest.taskDescription,
        context: handoffRequest.context
      }
    );

    // Notify the sending agent
    await this.sendDirectMessage(
      handoffRequest.fromAgent,
      'system',
      {
        type: 'handoff_initiated',
        handoffId: handoffRequest.id,
        toAgent: handoffRequest.toAgent,
        status: 'pending'
      }
    );
  }

  /**
   * Accept a handoff request
   */
  async acceptHandoff(handoffId: string): Promise<void> {
    const handoff = this.handoffRequests.get(handoffId);
    if (!handoff) {
      throw new Error(`Handoff request ${handoffId} not found`);
    }

    handoff.status = 'accepted';

    // Update agent workloads
    this.incrementAgentWorkload(handoff.toAgent);
    this.decrementAgentWorkload(handoff.fromAgent);

    // Execute the handoff
    const result = await this.subAgentManager.handleHandoff(
      handoff.fromAgent,
      handoff.toAgent,
      handoff.context,
      handoff.taskDescription
    );

    if (result.success) {
      handoff.status = 'completed';
      handoff.completedAt = new Date();
      
      // Send completion notification
      await this.notificationSystem.sendHandoffNotification('completed', handoff);
    }

    // Send acceptance notification
    await this.notificationSystem.sendHandoffNotification('accepted', handoff);

    // Notify both agents
    await this.notifyHandoffCompletion(handoff, result.success);
  }

  /**
   * Reject a handoff request
   */
  async rejectHandoff(handoffId: string, reason: string): Promise<void> {
    const handoff = this.handoffRequests.get(handoffId);
    if (!handoff) {
      throw new Error(`Handoff request ${handoffId} not found`);
    }

    handoff.status = 'rejected';

    // Send rejection notification
    await this.notificationSystem.sendHandoffNotification('rejected', handoff, { reason });

    // Notify the requesting agent
    await this.sendDirectMessage(
      handoff.fromAgent,
      'system',
      {
        type: 'handoff_rejected',
        handoffId,
        reason,
        toAgent: handoff.toAgent
      }
    );

    // Try to find alternative agent
    const alternative = this.findAlternativeAgent(
      handoff.toAgent,
      this.agentWorkloads.get(handoff.toAgent)?.specializations || []
    );

    if (alternative) {
      await this.suggestHandoff(
        handoff.fromAgent,
        alternative,
        `Original handoff to ${handoff.toAgent} was rejected: ${reason}`,
        handoff.context,
        handoff.taskDescription,
        handoff.projectId
      );
    }
  }

  /**
   * Facilitate collaboration between agents
   */
  async facilitateCollaboration(
    initiator: string,
    collaborators: string[],
    task: string,
    threadId?: string
  ): Promise<CommunicationThread> {
    const participants = [initiator, ...collaborators];
    const topic = `Collaboration: ${task}`;

    let thread: CommunicationThread;
    
    if (threadId) {
      thread = this.threads.get(threadId)!;
      // Add new participants if not already included
      const newParticipants = collaborators.filter(c => !thread.participants.includes(c));
      thread.participants.push(...newParticipants);
    } else {
      thread = await this.createThread(topic, participants);
    }

    // Send collaboration invitation
    await this.sendMessage(
      thread.id,
      initiator,
      {
        type: 'collaboration_request',
        task,
        collaborators,
        message: `I need collaboration on: ${task}`
      },
      MessageType.BROADCAST
    );

    return thread;
  }

  /**
   * Send direct message to an agent
   */
  private async sendDirectMessage(
    to: string,
    from: string,
    content: unknown
  ): Promise<void> {
    const message: SubAgentMessage = {
      id: uuidv4(),
      from,
      to,
      type: MessageType.BROADCAST,
      content,
      timestamp: new Date(),
      sessionId: 'communication-manager'
    };

    this.messageQueue.push(message);
    await this.subAgentManager.sendMessage(message);
  }

  /**
   * Broadcast message to all agents
   */
  private async broadcastMessage(message: Omit<SubAgentMessage, 'id' | 'timestamp'>): Promise<void> {
    const fullMessage: SubAgentMessage = {
      ...message,
      id: uuidv4(),
      timestamp: new Date()
    };

    this.messageQueue.push(fullMessage);
    await this.subAgentManager.sendMessage(fullMessage);
  }

  /**
   * Update agent activity timestamp
   */
  private updateAgentActivity(agentRole: string): void {
    const workload = this.agentWorkloads.get(agentRole);
    if (workload) {
      workload.lastActivity = new Date();
    }
  }

  /**
   * Increment agent workload
   */
  private incrementAgentWorkload(agentRole: string): void {
    const workload = this.agentWorkloads.get(agentRole);
    if (workload) {
      workload.currentTasks++;
      workload.availability = workload.currentTasks >= workload.maxCapacity ? 'busy' : 'available';
    }
  }

  /**
   * Decrement agent workload
   */
  private decrementAgentWorkload(agentRole: string): void {
    const workload = this.agentWorkloads.get(agentRole);
    if (workload && workload.currentTasks > 0) {
      workload.currentTasks--;
      workload.availability = workload.currentTasks < workload.maxCapacity ? 'available' : 'busy';
    }
  }

  /**
   * Notify handoff completion
   */
  private async notifyHandoffCompletion(handoff: HandoffRequest, success: boolean): Promise<void> {
    const message = {
      type: 'handoff_completed',
      handoffId: handoff.id,
      success,
      fromAgent: handoff.fromAgent,
      toAgent: handoff.toAgent,
      taskDescription: handoff.taskDescription
    };

    await this.sendDirectMessage(handoff.fromAgent, 'system', message);
    await this.sendDirectMessage(handoff.toAgent, 'system', message);
  }

  /**
   * Get agent workload information
   */
  getAgentWorkload(agentRole: string): AgentWorkload | null {
    return this.agentWorkloads.get(agentRole) || null;
  }

  /**
   * Get all agent workloads
   */
  getAllAgentWorkloads(): AgentWorkload[] {
    return Array.from(this.agentWorkloads.values());
  }

  /**
   * Get thread by ID
   */
  getThread(threadId: string): CommunicationThread | null {
    return this.threads.get(threadId) || null;
  }

  /**
   * Get all threads
   */
  getAllThreads(): CommunicationThread[] {
    return Array.from(this.threads.values());
  }

  /**
   * Get threads for a project
   */
  getProjectThreads(projectId: string): CommunicationThread[] {
    return Array.from(this.threads.values()).filter(thread => thread.projectId === projectId);
  }

  /**
   * Get handoff requests
   */
  getHandoffRequests(status?: HandoffRequest['status']): HandoffRequest[] {
    const requests = Array.from(this.handoffRequests.values());
    return status ? requests.filter(req => req.status === status) : requests;
  }

  /**
   * Get recent messages
   */
  getRecentMessages(limit: number = 50): SubAgentMessage[] {
    return this.messageQueue
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Archive a thread
   */
  async archiveThread(threadId: string): Promise<void> {
    const thread = this.threads.get(threadId);
    if (thread) {
      thread.status = 'archived';
      thread.updatedAt = new Date();
    }
  }

  /**
   * Close a thread
   */
  async closeThread(threadId: string): Promise<void> {
    const thread = this.threads.get(threadId);
    if (thread) {
      thread.status = 'closed';
      thread.updatedAt = new Date();
    }
  }

  /**
   * Get shared workspace instance
   */
  getSharedWorkspace(): SharedWorkspace {
    return this.sharedWorkspace;
  }

  /**
   * Get notification system instance
   */
  getNotificationSystem(): NotificationSystem {
    return this.notificationSystem;
  }

  /**
   * Get real-time communication instance
   */
  getRealtimeCommunication(): RealtimeCommunication {
    return this.realtimeComm;
  }

  /**
   * Create workspace session for agent
   */
  async createWorkspaceSession(agentRole: string, projectId?: string): Promise<string> {
    const session = await this.sharedWorkspace.createSession(agentRole, projectId);
    return session.id;
  }

  /**
   * Send workspace notification
   */
  async sendWorkspaceNotification(
    type: 'file_locked' | 'file_comment_added' | 'file_conflict',
    data: {
      fileName: string;
      agentRole: string;
      fileId?: string;
      commentId?: string;
    },
    recipient: string | 'all' = 'all',
    projectId?: string
  ): Promise<void> {
    await this.notificationSystem.sendWorkspaceNotification(type, data, recipient, projectId);
  }

  /**
   * Send agent status notification
   */
  async sendAgentStatusNotification(
    type: 'connected' | 'disconnected' | 'overloaded',
    agentData: {
      agentRole: string;
      sessionId?: string;
      currentTasks?: number;
      maxCapacity?: number;
    },
    recipient: string | 'all' = 'all',
    projectId?: string
  ): Promise<void> {
    await this.notificationSystem.sendAgentNotification(type, agentData, recipient, projectId);
  }

  /**
   * Get notifications for an agent
   */
  getAgentNotifications(
    agentRole: string,
    filters?: {
      unreadOnly?: boolean;
      category?: string;
      priority?: string;
      projectId?: string;
      limit?: number;
    }
  ) {
    return this.notificationSystem.getNotifications(agentRole, filters as any);
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(notificationId: string, agentRole: string): Promise<boolean> {
    return await this.notificationSystem.markAsRead(notificationId, agentRole);
  }

  /**
   * Get workspace statistics
   */
  getWorkspaceStats() {
    return this.sharedWorkspace.getWorkspaceStats();
  }

  /**
   * Get real-time connection statistics
   */
  getConnectionStats() {
    return this.realtimeComm.getConnectionStats();
  }

  /**
   * Get notification statistics
   */
  getNotificationStats(agentRole?: string) {
    return this.notificationSystem.getStatistics(agentRole);
  }

  /**
   * Cleanup old data
   */
  async cleanup(): Promise<void> {
    await this.sharedWorkspace.cleanup();
    this.notificationSystem.cleanup();
    this.realtimeComm.cleanup();
  }
}