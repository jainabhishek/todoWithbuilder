import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { SubAgentMessage, MessageType, AgentRole } from './sub-agent-manager';
import { CommunicationThread, HandoffRequest } from './communication-manager';
import { WorkspaceFile, WorkspaceComment } from './shared-workspace';
import { v4 as uuidv4 } from 'uuid';

export interface RealtimeEvent {
  type: 'message' | 'handoff' | 'workspace' | 'agent_status' | 'project_update';
  data: unknown;
  timestamp: Date;
  source: string;
  target?: string | string[];
  projectId?: string;
}

export interface AgentConnection {
  socketId: string;
  agentRole: string;
  sessionId: string;
  projectId?: string;
  connectedAt: Date;
  lastActivity: Date;
  status: 'connected' | 'busy' | 'idle';
}

export interface NotificationPayload {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  data?: unknown;
  persistent?: boolean;
  actions?: Array<{
    label: string;
    action: string;
    data?: unknown;
  }>;
}

/**
 * Real-time Communication Manager
 * Handles Socket.IO connections and real-time messaging between agents
 */
export class RealtimeCommunication {
  private io: SocketIOServer | null = null;
  private connections: Map<string, AgentConnection> = new Map();
  private eventHistory: RealtimeEvent[] = [];
  private maxHistorySize = 1000;

  /**
   * Initialize Socket.IO server
   */
  initialize(httpServer: HTTPServer): void {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.NODE_ENV === 'production' ? false : '*',
        methods: ['GET', 'POST']
      },
      transports: ['websocket', 'polling']
    });

    this.setupEventHandlers();
  }

  /**
   * Setup Socket.IO event handlers
   */
  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket) => {
      console.log(`Socket connected: ${socket.id}`);

      // Handle agent registration
      socket.on('register_agent', (data: {
        agentRole: string;
        sessionId: string;
        projectId?: string;
      }) => {
        this.registerAgent(socket.id, data);
      });

      // Handle agent message sending
      socket.on('send_message', (data: {
        message: Omit<SubAgentMessage, 'id' | 'timestamp'>;
      }) => {
        this.handleAgentMessage(socket.id, data.message);
      });

      // Handle handoff requests
      socket.on('request_handoff', (data: {
        toAgent: string;
        reason: string;
        context: unknown;
        taskDescription: string;
        projectId?: string;
      }) => {
        this.handleHandoffRequest(socket.id, data);
      });

      // Handle handoff responses
      socket.on('respond_handoff', (data: {
        handoffId: string;
        response: 'accept' | 'reject';
        reason?: string;
      }) => {
        this.handleHandoffResponse(socket.id, data);
      });

      // Handle workspace file operations
      socket.on('workspace_file_update', (data: {
        fileId: string;
        content: string;
        type: 'update' | 'lock' | 'unlock';
      }) => {
        this.handleWorkspaceFileUpdate(socket.id, data);
      });

      // Handle workspace comments
      socket.on('workspace_comment', (data: {
        fileId: string;
        content: string;
        lineNumber?: number;
      }) => {
        this.handleWorkspaceComment(socket.id, data);
      });

      // Handle agent status updates
      socket.on('update_status', (data: {
        status: 'connected' | 'busy' | 'idle';
        currentTask?: string;
      }) => {
        this.updateAgentStatus(socket.id, data);
      });

      // Handle project updates
      socket.on('project_update', (data: {
        projectId: string;
        update: unknown;
        type: string;
      }) => {
        this.handleProjectUpdate(socket.id, data);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        this.handleDisconnection(socket.id);
      });

      // Handle ping/pong for connection health
      socket.on('ping', () => {
        socket.emit('pong');
        this.updateConnectionActivity(socket.id);
      });
    });
  }

  /**
   * Register an agent connection
   */
  private registerAgent(socketId: string, data: {
    agentRole: string;
    sessionId: string;
    projectId?: string;
  }): void {
    const connection: AgentConnection = {
      socketId,
      agentRole: data.agentRole,
      sessionId: data.sessionId,
      projectId: data.projectId,
      connectedAt: new Date(),
      lastActivity: new Date(),
      status: 'connected'
    };

    this.connections.set(socketId, connection);

    // Join agent-specific room
    this.io?.to(socketId).socketsJoin(`agent:${data.agentRole}`);
    
    // Join project room if specified
    if (data.projectId) {
      this.io?.to(socketId).socketsJoin(`project:${data.projectId}`);
    }

    // Notify other agents about new connection
    this.broadcastEvent({
      type: 'agent_status',
      data: {
        action: 'connected',
        agentRole: data.agentRole,
        sessionId: data.sessionId,
        projectId: data.projectId
      },
      timestamp: new Date(),
      source: data.agentRole
    });

    console.log(`Agent registered: ${data.agentRole} (${socketId})`);
  }

  /**
   * Handle agent message
   */
  private handleAgentMessage(socketId: string, message: Omit<SubAgentMessage, 'id' | 'timestamp'>): void {
    const connection = this.connections.get(socketId);
    if (!connection) return;

    const fullMessage: SubAgentMessage = {
      ...message,
      id: uuidv4(),
      timestamp: new Date()
    };

    // Route message based on target
    if (message.to === 'broadcast') {
      this.broadcastMessage(fullMessage, connection.projectId);
    } else {
      this.sendDirectMessage(fullMessage);
    }

    // Store in event history
    this.addToEventHistory({
      type: 'message',
      data: fullMessage,
      timestamp: new Date(),
      source: connection.agentRole,
      target: message.to,
      projectId: connection.projectId
    });

    this.updateConnectionActivity(socketId);
  }

  /**
   * Handle handoff request
   */
  private handleHandoffRequest(socketId: string, data: {
    toAgent: string;
    reason: string;
    context: unknown;
    taskDescription: string;
    projectId?: string;
  }): void {
    const connection = this.connections.get(socketId);
    if (!connection) return;

    const handoffRequest: HandoffRequest = {
      id: uuidv4(),
      fromAgent: connection.agentRole,
      toAgent: data.toAgent,
      reason: data.reason,
      context: data.context,
      taskDescription: data.taskDescription,
      status: 'pending',
      createdAt: new Date(),
      projectId: data.projectId
    };

    // Send to target agent
    this.io?.to(`agent:${data.toAgent}`).emit('handoff_request', handoffRequest);

    // Notify requesting agent
    this.io?.to(socketId).emit('handoff_initiated', {
      handoffId: handoffRequest.id,
      status: 'pending'
    });

    // Store in event history
    this.addToEventHistory({
      type: 'handoff',
      data: handoffRequest,
      timestamp: new Date(),
      source: connection.agentRole,
      target: data.toAgent,
      projectId: data.projectId
    });

    this.updateConnectionActivity(socketId);
  }

  /**
   * Handle handoff response
   */
  private handleHandoffResponse(socketId: string, data: {
    handoffId: string;
    response: 'accept' | 'reject';
    reason?: string;
  }): void {
    const connection = this.connections.get(socketId);
    if (!connection) return;

    // Find the original handoff request from event history
    const handoffEvent = this.eventHistory
      .filter(event => event.type === 'handoff')
      .find(event => {
        const handoff = event.data as HandoffRequest;
        return handoff.id === data.handoffId;
      });

    if (!handoffEvent) return;

    const handoff = handoffEvent.data as HandoffRequest;
    handoff.status = data.response === 'accept' ? 'accepted' : 'rejected';

    // Notify the requesting agent
    this.io?.to(`agent:${handoff.fromAgent}`).emit('handoff_response', {
      handoffId: data.handoffId,
      response: data.response,
      reason: data.reason,
      respondedBy: connection.agentRole
    });

    // If accepted, facilitate the handoff
    if (data.response === 'accept') {
      this.facilitateHandoff(handoff);
    }

    this.updateConnectionActivity(socketId);
  }

  /**
   * Handle workspace file update
   */
  private handleWorkspaceFileUpdate(socketId: string, data: {
    fileId: string;
    content: string;
    type: 'update' | 'lock' | 'unlock';
  }): void {
    const connection = this.connections.get(socketId);
    if (!connection) return;

    // Broadcast to project members
    const room = connection.projectId ? `project:${connection.projectId}` : 'global';
    
    this.io?.to(room).except(socketId).emit('workspace_file_changed', {
      fileId: data.fileId,
      type: data.type,
      changedBy: connection.agentRole,
      content: data.type === 'update' ? data.content : undefined,
      timestamp: new Date()
    });

    // Store in event history
    this.addToEventHistory({
      type: 'workspace',
      data: {
        action: 'file_update',
        fileId: data.fileId,
        type: data.type,
        agentRole: connection.agentRole
      },
      timestamp: new Date(),
      source: connection.agentRole,
      projectId: connection.projectId
    });

    this.updateConnectionActivity(socketId);
  }

  /**
   * Handle workspace comment
   */
  private handleWorkspaceComment(socketId: string, data: {
    fileId: string;
    content: string;
    lineNumber?: number;
  }): void {
    const connection = this.connections.get(socketId);
    if (!connection) return;

    const comment: WorkspaceComment = {
      id: uuidv4(),
      fileId: data.fileId,
      agentRole: connection.agentRole,
      content: data.content,
      lineNumber: data.lineNumber,
      resolved: false,
      createdAt: new Date()
    };

    // Broadcast to project members
    const room = connection.projectId ? `project:${connection.projectId}` : 'global';
    
    this.io?.to(room).emit('workspace_comment_added', comment);

    // Store in event history
    this.addToEventHistory({
      type: 'workspace',
      data: {
        action: 'comment_added',
        comment
      },
      timestamp: new Date(),
      source: connection.agentRole,
      projectId: connection.projectId
    });

    this.updateConnectionActivity(socketId);
  }

  /**
   * Update agent status
   */
  private updateAgentStatus(socketId: string, data: {
    status: 'connected' | 'busy' | 'idle';
    currentTask?: string;
  }): void {
    const connection = this.connections.get(socketId);
    if (!connection) return;

    connection.status = data.status;
    connection.lastActivity = new Date();

    // Broadcast status update
    this.broadcastEvent({
      type: 'agent_status',
      data: {
        action: 'status_update',
        agentRole: connection.agentRole,
        status: data.status,
        currentTask: data.currentTask,
        sessionId: connection.sessionId
      },
      timestamp: new Date(),
      source: connection.agentRole,
      projectId: connection.projectId
    });
  }

  /**
   * Handle project update
   */
  private handleProjectUpdate(socketId: string, data: {
    projectId: string;
    update: unknown;
    type: string;
  }): void {
    const connection = this.connections.get(socketId);
    if (!connection) return;

    // Broadcast to project members
    this.io?.to(`project:${data.projectId}`).emit('project_updated', {
      projectId: data.projectId,
      update: data.update,
      type: data.type,
      updatedBy: connection.agentRole,
      timestamp: new Date()
    });

    // Store in event history
    this.addToEventHistory({
      type: 'project_update',
      data: {
        projectId: data.projectId,
        update: data.update,
        type: data.type,
        updatedBy: connection.agentRole
      },
      timestamp: new Date(),
      source: connection.agentRole,
      projectId: data.projectId
    });

    this.updateConnectionActivity(socketId);
  }

  /**
   * Handle disconnection
   */
  private handleDisconnection(socketId: string): void {
    const connection = this.connections.get(socketId);
    if (!connection) return;

    // Notify other agents about disconnection
    this.broadcastEvent({
      type: 'agent_status',
      data: {
        action: 'disconnected',
        agentRole: connection.agentRole,
        sessionId: connection.sessionId
      },
      timestamp: new Date(),
      source: connection.agentRole,
      projectId: connection.projectId
    });

    this.connections.delete(socketId);
    console.log(`Agent disconnected: ${connection.agentRole} (${socketId})`);
  }

  /**
   * Update connection activity timestamp
   */
  private updateConnectionActivity(socketId: string): void {
    const connection = this.connections.get(socketId);
    if (connection) {
      connection.lastActivity = new Date();
    }
  }

  /**
   * Broadcast message to all agents or project members
   */
  private broadcastMessage(message: SubAgentMessage, projectId?: string): void {
    const room = projectId ? `project:${projectId}` : 'global';
    this.io?.to(room).emit('agent_message', message);
  }

  /**
   * Send direct message to specific agent
   */
  private sendDirectMessage(message: SubAgentMessage): void {
    this.io?.to(`agent:${message.to}`).emit('agent_message', message);
  }

  /**
   * Facilitate handoff between agents
   */
  private facilitateHandoff(handoff: HandoffRequest): void {
    // Send handoff context to accepting agent
    this.io?.to(`agent:${handoff.toAgent}`).emit('handoff_accepted', {
      handoffId: handoff.id,
      fromAgent: handoff.fromAgent,
      context: handoff.context,
      taskDescription: handoff.taskDescription,
      projectId: handoff.projectId
    });

    // Confirm handoff to requesting agent
    this.io?.to(`agent:${handoff.fromAgent}`).emit('handoff_confirmed', {
      handoffId: handoff.id,
      toAgent: handoff.toAgent,
      status: 'accepted'
    });
  }

  /**
   * Broadcast event to all connected agents
   */
  private broadcastEvent(event: RealtimeEvent): void {
    this.io?.emit('realtime_event', event);
    this.addToEventHistory(event);
  }

  /**
   * Add event to history
   */
  private addToEventHistory(event: RealtimeEvent): void {
    this.eventHistory.push(event);
    
    // Maintain history size limit
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Send notification to specific agent or all agents
   */
  sendNotification(notification: NotificationPayload, target?: string | string[]): void {
    if (!this.io) return;

    if (target) {
      if (Array.isArray(target)) {
        target.forEach(agentRole => {
          this.io?.to(`agent:${agentRole}`).emit('notification', notification);
        });
      } else {
        this.io?.to(`agent:${target}`).emit('notification', notification);
      }
    } else {
      this.io?.emit('notification', notification);
    }
  }

  /**
   * Send notification about handoff updates
   */
  sendHandoffNotification(handoff: HandoffRequest, type: 'requested' | 'accepted' | 'rejected' | 'completed'): void {
    const notification: NotificationPayload = {
      id: uuidv4(),
      type: type === 'rejected' ? 'warning' : type === 'completed' ? 'success' : 'info',
      title: `Handoff ${type}`,
      message: `Task handoff from ${handoff.fromAgent} to ${handoff.toAgent} has been ${type}`,
      data: { handoffId: handoff.id, handoff },
      persistent: type === 'requested'
    };

    if (type === 'requested') {
      notification.actions = [
        { label: 'Accept', action: 'accept_handoff', data: { handoffId: handoff.id } },
        { label: 'Reject', action: 'reject_handoff', data: { handoffId: handoff.id } }
      ];
      this.sendNotification(notification, handoff.toAgent);
    } else {
      this.sendNotification(notification, [handoff.fromAgent, handoff.toAgent]);
    }
  }

  /**
   * Get connected agents
   */
  getConnectedAgents(): AgentConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get agents by project
   */
  getProjectAgents(projectId: string): AgentConnection[] {
    return Array.from(this.connections.values()).filter(conn => conn.projectId === projectId);
  }

  /**
   * Get agent by role
   */
  getAgentByRole(agentRole: string): AgentConnection | undefined {
    return Array.from(this.connections.values()).find(conn => conn.agentRole === agentRole);
  }

  /**
   * Get event history
   */
  getEventHistory(limit?: number, projectId?: string): RealtimeEvent[] {
    let events = this.eventHistory;
    
    if (projectId) {
      events = events.filter(event => event.projectId === projectId);
    }
    
    if (limit) {
      events = events.slice(-limit);
    }
    
    return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(): {
    totalConnections: number;
    agentsByRole: Record<string, number>;
    agentsByProject: Record<string, number>;
    averageConnectionTime: number;
  } {
    const connections = Array.from(this.connections.values());
    const now = new Date();

    return {
      totalConnections: connections.length,
      agentsByRole: connections.reduce((acc, conn) => {
        acc[conn.agentRole] = (acc[conn.agentRole] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      agentsByProject: connections.reduce((acc, conn) => {
        if (conn.projectId) {
          acc[conn.projectId] = (acc[conn.projectId] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>),
      averageConnectionTime: connections.length > 0 
        ? connections.reduce((sum, conn) => sum + (now.getTime() - conn.connectedAt.getTime()), 0) / connections.length
        : 0
    };
  }

  /**
   * Cleanup inactive connections
   */
  cleanup(): void {
    const now = new Date();
    const maxIdleTime = 5 * 60 * 1000; // 5 minutes

    for (const [socketId, connection] of this.connections.entries()) {
      if (now.getTime() - connection.lastActivity.getTime() > maxIdleTime) {
        this.handleDisconnection(socketId);
      }
    }
  }
}

// Global instance
export const realtimeCommunication = new RealtimeCommunication();