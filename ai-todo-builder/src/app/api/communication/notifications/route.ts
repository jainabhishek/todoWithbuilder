import { NextRequest, NextResponse } from 'next/server';
import { NotificationSystem } from '@/lib/notification-system';
import { RealtimeCommunication } from '@/lib/realtime-communication';
import { handleGenericError } from '@/lib/error-handler';

let notificationSystem: NotificationSystem | null = null;
let realtimeComm: RealtimeCommunication | null = null;

async function getNotificationSystem(): Promise<NotificationSystem> {
  if (!notificationSystem) {
    if (!realtimeComm) {
      realtimeComm = new RealtimeCommunication();
    }
    notificationSystem = new NotificationSystem(realtimeComm);
  }
  return notificationSystem;
}

/**
 * GET /api/communication/notifications - Get notifications for an agent
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentRole = searchParams.get('agentRole');
    const action = searchParams.get('action');

    if (!agentRole) {
      return NextResponse.json({
        success: false,
        error: 'Agent role is required'
      }, { status: 400 });
    }

    const notificationSys = await getNotificationSystem();

    switch (action) {
      case 'list':
      default:
        const filters = {
          unreadOnly: searchParams.get('unreadOnly') === 'true',
          category: searchParams.get('category') || undefined,
          priority: searchParams.get('priority') || undefined,
          projectId: searchParams.get('projectId') || undefined,
          limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined
        };

        const notifications = notificationSys.getNotifications(agentRole, filters as any);
        return NextResponse.json({
          success: true,
          data: { notifications }
        });

      case 'stats':
        const stats = notificationSys.getStatistics(agentRole);
        return NextResponse.json({
          success: true,
          data: stats
        });

      case 'preferences':
        const preferences = notificationSys.getPreferences(agentRole);
        return NextResponse.json({
          success: true,
          data: { preferences }
        });
    }
  } catch (error) {
    return handleGenericError(error, 'get notifications');
  }
}

/**
 * POST /api/communication/notifications - Send notifications or update preferences
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...data } = body;

    const notificationSys = await getNotificationSystem();

    switch (action) {
      case 'send_handoff':
        const { type, handoff, additionalData } = data;
        if (!type || !handoff) {
          return NextResponse.json({
            success: false,
            error: 'Type and handoff data are required'
          }, { status: 400 });
        }

        await notificationSys.sendHandoffNotification(type, handoff, additionalData);
        return NextResponse.json({
          success: true,
          message: 'Handoff notification sent successfully'
        });

      case 'send_project':
        const { type: projectType, projectData, recipient } = data;
        if (!projectType || !projectData) {
          return NextResponse.json({
            success: false,
            error: 'Type and project data are required'
          }, { status: 400 });
        }

        await notificationSys.sendProjectNotification(projectType, projectData, recipient);
        return NextResponse.json({
          success: true,
          message: 'Project notification sent successfully'
        });

      case 'send_workspace':
        const { type: workspaceType, workspaceData, recipient: workspaceRecipient, projectId } = data;
        if (!workspaceType || !workspaceData) {
          return NextResponse.json({
            success: false,
            error: 'Type and workspace data are required'
          }, { status: 400 });
        }

        await notificationSys.sendWorkspaceNotification(
          workspaceType,
          workspaceData,
          workspaceRecipient,
          projectId
        );
        return NextResponse.json({
          success: true,
          message: 'Workspace notification sent successfully'
        });

      case 'send_agent':
        const { type: agentType, agentData, recipient: agentRecipient, projectId: agentProjectId } = data;
        if (!agentType || !agentData) {
          return NextResponse.json({
            success: false,
            error: 'Type and agent data are required'
          }, { status: 400 });
        }

        await notificationSys.sendAgentNotification(
          agentType,
          agentData,
          agentRecipient,
          agentProjectId
        );
        return NextResponse.json({
          success: true,
          message: 'Agent notification sent successfully'
        });

      case 'send_system':
        const { type: systemType, systemData, recipient: systemRecipient } = data;
        if (!systemType || !systemData) {
          return NextResponse.json({
            success: false,
            error: 'Type and system data are required'
          }, { status: 400 });
        }

        await notificationSys.sendSystemNotification(systemType, systemData, systemRecipient);
        return NextResponse.json({
          success: true,
          message: 'System notification sent successfully'
        });

      case 'mark_read':
        const { notificationId, agentRole } = data;
        if (!notificationId || !agentRole) {
          return NextResponse.json({
            success: false,
            error: 'Notification ID and agent role are required'
          }, { status: 400 });
        }

        const marked = await notificationSys.markAsRead(notificationId, agentRole);
        return NextResponse.json({
          success: marked,
          message: marked ? 'Notification marked as read' : 'Notification not found or not accessible'
        });

      case 'update_preferences':
        const { agentRole: prefAgentRole, preferences } = data;
        if (!prefAgentRole || !preferences) {
          return NextResponse.json({
            success: false,
            error: 'Agent role and preferences are required'
          }, { status: 400 });
        }

        notificationSys.updatePreferences(prefAgentRole, preferences);
        return NextResponse.json({
          success: true,
          message: 'Notification preferences updated successfully'
        });

      case 'create_custom':
        const { templateId, recipient: customRecipient, templateData, sender, projectId: customProjectId, expiresIn } = data;
        if (!templateId || !customRecipient || !templateData) {
          return NextResponse.json({
            success: false,
            error: 'Template ID, recipient, and template data are required'
          }, { status: 400 });
        }

        const notification = notificationSys.createNotification({
          templateId,
          recipient: customRecipient,
          data: templateData,
          sender,
          projectId: customProjectId,
          expiresIn
        });

        await notificationSys.sendNotification(notification);
        return NextResponse.json({
          success: true,
          data: { notification },
          message: 'Custom notification sent successfully'
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 });
    }
  } catch (error) {
    return handleGenericError(error, 'process notification request');
  }
}