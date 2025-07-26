import { v4 as uuidv4 } from 'uuid';
import { AgentRole } from './sub-agent-manager';
import { HandoffRequest } from './communication-manager';
import { RealtimeCommunication, NotificationPayload } from './realtime-communication';

export interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  category: 'handoff' | 'project' | 'workspace' | 'system' | 'agent';
  title: string;
  message: string;
  data?: unknown;
  recipient: string | 'all';
  sender?: string;
  persistent: boolean;
  read: boolean;
  createdAt: Date;
  readAt?: Date;
  expiresAt?: Date;
  actions?: NotificationAction[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  projectId?: string;
}

export interface NotificationAction {
  id: string;
  label: string;
  action: string;
  data?: unknown;
  style?: 'primary' | 'secondary' | 'danger';
}

export interface NotificationPreferences {
  agentRole: string;
  categories: {
    handoff: boolean;
    project: boolean;
    workspace: boolean;
    system: boolean;
    agent: boolean;
  };
  realtime: boolean;
  persistent: boolean;
  priority: {
    low: boolean;
    medium: boolean;
    high: boolean;
    urgent: boolean;
  };
}

export interface NotificationTemplate {
  id: string;
  category: Notification['category'];
  type: Notification['type'];
  titleTemplate: string;
  messageTemplate: string;
  priority: Notification['priority'];
  persistent: boolean;
  actions?: Omit<NotificationAction, 'id'>[];
}

/**
 * Notification System
 * Manages notifications for agent handoffs, updates, and system events
 */
export class NotificationSystem {
  private notifications: Map<string, Notification> = new Map();
  private preferences: Map<string, NotificationPreferences> = new Map();
  private templates: Map<string, NotificationTemplate> = new Map();
  private realtimeComm: RealtimeCommunication;

  constructor(realtimeComm: RealtimeCommunication) {
    this.realtimeComm = realtimeComm;
    this.initializeTemplates();
    this.initializeDefaultPreferences();
  }

  /**
   * Initialize notification templates
   */
  private initializeTemplates(): void {
    const templates: NotificationTemplate[] = [
      // Handoff notifications
      {
        id: 'handoff_requested',
        category: 'handoff',
        type: 'info',
        titleTemplate: 'Handoff Request from {fromAgent}',
        messageTemplate: '{fromAgent} wants to hand off task: {taskDescription}',
        priority: 'high',
        persistent: true,
        actions: [
          { label: 'Accept', action: 'accept_handoff', style: 'primary' },
          { label: 'Reject', action: 'reject_handoff', style: 'secondary' },
          { label: 'View Details', action: 'view_handoff_details' }
        ]
      },
      {
        id: 'handoff_accepted',
        category: 'handoff',
        type: 'success',
        titleTemplate: 'Handoff Accepted',
        messageTemplate: '{toAgent} has accepted your handoff request for: {taskDescription}',
        priority: 'medium',
        persistent: false
      },
      {
        id: 'handoff_rejected',
        category: 'handoff',
        type: 'warning',
        titleTemplate: 'Handoff Rejected',
        messageTemplate: '{toAgent} has rejected your handoff request: {reason}',
        priority: 'medium',
        persistent: false,
        actions: [
          { label: 'Find Alternative', action: 'find_alternative_agent', style: 'primary' },
          { label: 'Retry Later', action: 'retry_handoff', style: 'secondary' }
        ]
      },
      {
        id: 'handoff_completed',
        category: 'handoff',
        type: 'success',
        titleTemplate: 'Handoff Completed',
        messageTemplate: 'Task handoff for "{taskDescription}" has been completed successfully',
        priority: 'low',
        persistent: false
      },

      // Project notifications
      {
        id: 'project_assigned',
        category: 'project',
        type: 'info',
        titleTemplate: 'New Project Assignment',
        messageTemplate: 'You have been assigned to project: {projectTitle}',
        priority: 'medium',
        persistent: true,
        actions: [
          { label: 'View Project', action: 'view_project', style: 'primary' },
          { label: 'Accept', action: 'accept_assignment', style: 'primary' }
        ]
      },
      {
        id: 'project_phase_started',
        category: 'project',
        type: 'info',
        titleTemplate: 'Project Phase Started',
        messageTemplate: '{phase} phase has started for project: {projectTitle}',
        priority: 'medium',
        persistent: false
      },
      {
        id: 'project_completed',
        category: 'project',
        type: 'success',
        titleTemplate: 'Project Completed',
        messageTemplate: 'Project "{projectTitle}" has been completed successfully',
        priority: 'low',
        persistent: false
      },
      {
        id: 'project_blocked',
        category: 'project',
        type: 'warning',
        titleTemplate: 'Project Blocked',
        messageTemplate: 'Project "{projectTitle}" is blocked: {reason}',
        priority: 'high',
        persistent: true,
        actions: [
          { label: 'View Details', action: 'view_project_details', style: 'primary' },
          { label: 'Request Help', action: 'request_help', style: 'secondary' }
        ]
      },

      // Workspace notifications
      {
        id: 'file_locked',
        category: 'workspace',
        type: 'warning',
        titleTemplate: 'File Locked',
        messageTemplate: '{fileName} is now locked by {agentRole}',
        priority: 'low',
        persistent: false
      },
      {
        id: 'file_comment_added',
        category: 'workspace',
        type: 'info',
        titleTemplate: 'New Comment',
        messageTemplate: '{agentRole} added a comment to {fileName}',
        priority: 'low',
        persistent: false,
        actions: [
          { label: 'View Comment', action: 'view_comment', style: 'primary' },
          { label: 'Reply', action: 'reply_comment', style: 'secondary' }
        ]
      },
      {
        id: 'file_conflict',
        category: 'workspace',
        type: 'error',
        titleTemplate: 'File Conflict',
        messageTemplate: 'Conflict detected in {fileName} - manual resolution required',
        priority: 'high',
        persistent: true,
        actions: [
          { label: 'Resolve Conflict', action: 'resolve_conflict', style: 'danger' },
          { label: 'View Changes', action: 'view_changes', style: 'secondary' }
        ]
      },

      // Agent notifications
      {
        id: 'agent_connected',
        category: 'agent',
        type: 'success',
        titleTemplate: 'Agent Connected',
        messageTemplate: '{agentRole} has joined the project',
        priority: 'low',
        persistent: false
      },
      {
        id: 'agent_disconnected',
        category: 'agent',
        type: 'warning',
        titleTemplate: 'Agent Disconnected',
        messageTemplate: '{agentRole} has left the project',
        priority: 'low',
        persistent: false
      },
      {
        id: 'agent_overloaded',
        category: 'agent',
        type: 'warning',
        titleTemplate: 'Agent Overloaded',
        messageTemplate: '{agentRole} is at maximum capacity - consider redistributing tasks',
        priority: 'medium',
        persistent: false,
        actions: [
          { label: 'Rebalance Tasks', action: 'rebalance_tasks', style: 'primary' },
          { label: 'View Workload', action: 'view_workload', style: 'secondary' }
        ]
      },

      // System notifications
      {
        id: 'system_maintenance',
        category: 'system',
        type: 'warning',
        titleTemplate: 'System Maintenance',
        messageTemplate: 'System maintenance scheduled for {maintenanceTime}',
        priority: 'medium',
        persistent: true
      },
      {
        id: 'system_error',
        category: 'system',
        type: 'error',
        titleTemplate: 'System Error',
        messageTemplate: 'System error detected: {errorMessage}',
        priority: 'urgent',
        persistent: true,
        actions: [
          { label: 'Report Issue', action: 'report_issue', style: 'danger' },
          { label: 'View Logs', action: 'view_logs', style: 'secondary' }
        ]
      }
    ];

    templates.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  /**
   * Initialize default preferences for all agent roles
   */
  private initializeDefaultPreferences(): void {
    Object.values(AgentRole).forEach(role => {
      this.preferences.set(role, {
        agentRole: role,
        categories: {
          handoff: true,
          project: true,
          workspace: true,
          system: true,
          agent: false
        },
        realtime: true,
        persistent: true,
        priority: {
          low: false,
          medium: true,
          high: true,
          urgent: true
        }
      });
    });
  }

  /**
   * Create a notification from template
   */
  createNotification(params: {
    templateId: string;
    recipient: string | 'all';
    data: Record<string, unknown>;
    sender?: string;
    projectId?: string;
    expiresIn?: number; // milliseconds
  }): Notification {
    const template = this.templates.get(params.templateId);
    if (!template) {
      throw new Error(`Notification template ${params.templateId} not found`);
    }

    const notification: Notification = {
      id: uuidv4(),
      type: template.type,
      category: template.category,
      title: this.interpolateTemplate(template.titleTemplate, params.data),
      message: this.interpolateTemplate(template.messageTemplate, params.data),
      data: params.data,
      recipient: params.recipient,
      sender: params.sender,
      persistent: template.persistent,
      read: false,
      createdAt: new Date(),
      priority: template.priority,
      projectId: params.projectId,
      expiresAt: params.expiresIn ? new Date(Date.now() + params.expiresIn) : undefined,
      actions: template.actions?.map(action => ({
        ...action,
        id: uuidv4(),
        data: { ...action.data, ...params.data }
      }))
    };

    return notification;
  }

  /**
   * Send a notification
   */
  async sendNotification(notification: Notification): Promise<void> {
    // Check recipient preferences
    if (notification.recipient !== 'all') {
      const prefs = this.preferences.get(notification.recipient);
      if (prefs && !this.shouldSendNotification(notification, prefs)) {
        return;
      }
    }

    // Store notification
    this.notifications.set(notification.id, notification);

    // Send via real-time communication
    const payload: NotificationPayload = {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      persistent: notification.persistent,
      actions: notification.actions?.map(action => ({
        label: action.label,
        action: action.action,
        data: action.data
      }))
    };

    if (notification.recipient === 'all') {
      this.realtimeComm.sendNotification(payload);
    } else {
      this.realtimeComm.sendNotification(payload, notification.recipient);
    }

    // Auto-expire if needed
    if (notification.expiresAt) {
      setTimeout(() => {
        this.expireNotification(notification.id);
      }, notification.expiresAt.getTime() - Date.now());
    }
  }

  /**
   * Check if notification should be sent based on preferences
   */
  private shouldSendNotification(notification: Notification, prefs: NotificationPreferences): boolean {
    // Check category preference
    if (!prefs.categories[notification.category]) {
      return false;
    }

    // Check priority preference
    if (!prefs.priority[notification.priority]) {
      return false;
    }

    // Check if persistent notifications are disabled
    if (notification.persistent && !prefs.persistent) {
      return false;
    }

    return true;
  }

  /**
   * Interpolate template with data
   */
  private interpolateTemplate(template: string, data: Record<string, unknown>): string {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return String(data[key] || match);
    });
  }

  /**
   * Send handoff notification
   */
  async sendHandoffNotification(
    type: 'requested' | 'accepted' | 'rejected' | 'completed',
    handoff: HandoffRequest,
    additionalData?: Record<string, unknown>
  ): Promise<void> {
    const templateId = `handoff_${type}`;
    const data = {
      fromAgent: handoff.fromAgent.replace('-', ' '),
      toAgent: handoff.toAgent.replace('-', ' '),
      taskDescription: handoff.taskDescription,
      reason: handoff.reason,
      handoffId: handoff.id,
      ...additionalData
    };

    let recipient: string;
    switch (type) {
      case 'requested':
        recipient = handoff.toAgent;
        break;
      case 'accepted':
      case 'rejected':
        recipient = handoff.fromAgent;
        break;
      case 'completed':
        recipient = 'all';
        break;
    }

    const notification = this.createNotification({
      templateId,
      recipient,
      data,
      sender: type === 'requested' ? handoff.fromAgent : handoff.toAgent,
      projectId: handoff.projectId
    });

    await this.sendNotification(notification);
  }

  /**
   * Send project notification
   */
  async sendProjectNotification(
    type: 'assigned' | 'phase_started' | 'completed' | 'blocked',
    projectData: {
      projectId: string;
      projectTitle: string;
      agentRole?: string;
      phase?: string;
      reason?: string;
    },
    recipient: string | 'all' = 'all'
  ): Promise<void> {
    const templateId = `project_${type}`;
    
    const notification = this.createNotification({
      templateId,
      recipient,
      data: projectData,
      projectId: projectData.projectId
    });

    await this.sendNotification(notification);
  }

  /**
   * Send workspace notification
   */
  async sendWorkspaceNotification(
    type: 'file_locked' | 'file_comment_added' | 'file_conflict',
    workspaceData: {
      fileName: string;
      agentRole: string;
      fileId?: string;
      commentId?: string;
    },
    recipient: string | 'all' = 'all',
    projectId?: string
  ): Promise<void> {
    const templateId = type;
    
    const notification = this.createNotification({
      templateId,
      recipient,
      data: workspaceData,
      sender: workspaceData.agentRole,
      projectId
    });

    await this.sendNotification(notification);
  }

  /**
   * Send agent status notification
   */
  async sendAgentNotification(
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
    const templateId = `agent_${type}`;
    
    const notification = this.createNotification({
      templateId,
      recipient,
      data: {
        ...agentData,
        agentRole: agentData.agentRole.replace('-', ' ')
      },
      projectId
    });

    await this.sendNotification(notification);
  }

  /**
   * Send system notification
   */
  async sendSystemNotification(
    type: 'maintenance' | 'error',
    systemData: {
      maintenanceTime?: string;
      errorMessage?: string;
      errorCode?: string;
    },
    recipient: string | 'all' = 'all'
  ): Promise<void> {
    const templateId = `system_${type}`;
    
    const notification = this.createNotification({
      templateId,
      recipient,
      data: systemData,
      sender: 'system'
    });

    await this.sendNotification(notification);
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, agentRole: string): Promise<boolean> {
    const notification = this.notifications.get(notificationId);
    if (!notification) return false;

    if (notification.recipient === agentRole || notification.recipient === 'all') {
      notification.read = true;
      notification.readAt = new Date();
      return true;
    }

    return false;
  }

  /**
   * Get notifications for an agent
   */
  getNotifications(
    agentRole: string,
    filters?: {
      unreadOnly?: boolean;
      category?: Notification['category'];
      priority?: Notification['priority'];
      projectId?: string;
      limit?: number;
    }
  ): Notification[] {
    let notifications = Array.from(this.notifications.values()).filter(
      n => n.recipient === agentRole || n.recipient === 'all'
    );

    if (filters) {
      if (filters.unreadOnly) {
        notifications = notifications.filter(n => !n.read);
      }
      if (filters.category) {
        notifications = notifications.filter(n => n.category === filters.category);
      }
      if (filters.priority) {
        notifications = notifications.filter(n => n.priority === filters.priority);
      }
      if (filters.projectId) {
        notifications = notifications.filter(n => n.projectId === filters.projectId);
      }
    }

    // Sort by priority and creation time
    notifications.sort((a, b) => {
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    if (filters?.limit) {
      notifications = notifications.slice(0, filters.limit);
    }

    return notifications;
  }

  /**
   * Update notification preferences
   */
  updatePreferences(agentRole: string, preferences: Partial<NotificationPreferences>): void {
    const existing = this.preferences.get(agentRole) || {
      agentRole,
      categories: { handoff: true, project: true, workspace: true, system: true, agent: false },
      realtime: true,
      persistent: true,
      priority: { low: false, medium: true, high: true, urgent: true }
    };

    this.preferences.set(agentRole, { ...existing, ...preferences });
  }

  /**
   * Get notification preferences
   */
  getPreferences(agentRole: string): NotificationPreferences | undefined {
    return this.preferences.get(agentRole);
  }

  /**
   * Expire a notification
   */
  private expireNotification(notificationId: string): void {
    this.notifications.delete(notificationId);
  }

  /**
   * Clean up old notifications
   */
  cleanup(): void {
    const now = new Date();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

    for (const [id, notification] of this.notifications.entries()) {
      // Remove expired notifications
      if (notification.expiresAt && notification.expiresAt < now) {
        this.notifications.delete(id);
        continue;
      }

      // Remove old read notifications
      if (notification.read && notification.readAt) {
        const age = now.getTime() - notification.readAt.getTime();
        if (age > maxAge) {
          this.notifications.delete(id);
        }
      }

      // Remove old unread non-persistent notifications
      if (!notification.read && !notification.persistent) {
        const age = now.getTime() - notification.createdAt.getTime();
        if (age > maxAge) {
          this.notifications.delete(id);
        }
      }
    }
  }

  /**
   * Get notification statistics
   */
  getStatistics(agentRole?: string): {
    total: number;
    unread: number;
    byCategory: Record<string, number>;
    byPriority: Record<string, number>;
    byType: Record<string, number>;
  } {
    let notifications = Array.from(this.notifications.values());
    
    if (agentRole) {
      notifications = notifications.filter(n => n.recipient === agentRole || n.recipient === 'all');
    }

    return {
      total: notifications.length,
      unread: notifications.filter(n => !n.read).length,
      byCategory: notifications.reduce((acc, n) => {
        acc[n.category] = (acc[n.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byPriority: notifications.reduce((acc, n) => {
        acc[n.priority] = (acc[n.priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byType: notifications.reduce((acc, n) => {
        acc[n.type] = (acc[n.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
  }
}