import { NextRequest, NextResponse } from 'next/server';
import { RealtimeCommunication } from '@/lib/realtime-communication';
import { handleGenericError } from '@/lib/error-handler';

let realtimeComm: RealtimeCommunication | null = null;

function getRealtimeCommunication(): RealtimeCommunication {
  if (!realtimeComm) {
    realtimeComm = new RealtimeCommunication();
  }
  return realtimeComm;
}

/**
 * GET /api/communication/realtime - Get real-time communication information
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const projectId = searchParams.get('projectId');
    const agentRole = searchParams.get('agentRole');

    const realtime = getRealtimeCommunication();

    switch (action) {
      case 'connections':
        const connections = projectId 
          ? realtime.getProjectAgents(projectId)
          : realtime.getConnectedAgents();
        
        return NextResponse.json({
          success: true,
          data: { connections }
        });

      case 'agent':
        if (!agentRole) {
          return NextResponse.json({
            success: false,
            error: 'Agent role is required'
          }, { status: 400 });
        }

        const agent = realtime.getAgentByRole(agentRole);
        return NextResponse.json({
          success: true,
          data: { agent }
        });

      case 'events':
        const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
        const events = realtime.getEventHistory(limit, projectId || undefined);
        
        return NextResponse.json({
          success: true,
          data: { events }
        });

      case 'stats':
        const stats = realtime.getConnectionStats();
        return NextResponse.json({
          success: true,
          data: stats
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Use: connections, agent, events, or stats'
        }, { status: 400 });
    }
  } catch (error) {
    return handleGenericError(error, 'get real-time communication information');
  }
}

/**
 * POST /api/communication/realtime - Send real-time messages or notifications
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...data } = body;

    const realtime = getRealtimeCommunication();

    switch (action) {
      case 'send_notification':
        const { notification, target } = data;
        if (!notification) {
          return NextResponse.json({
            success: false,
            error: 'Notification data is required'
          }, { status: 400 });
        }

        realtime.sendNotification(notification, target);
        return NextResponse.json({
          success: true,
          message: 'Notification sent successfully'
        });

      case 'send_handoff_notification':
        const { handoff, type } = data;
        if (!handoff || !type) {
          return NextResponse.json({
            success: false,
            error: 'Handoff data and type are required'
          }, { status: 400 });
        }

        realtime.sendHandoffNotification(handoff, type);
        return NextResponse.json({
          success: true,
          message: 'Handoff notification sent successfully'
        });

      case 'cleanup':
        realtime.cleanup();
        return NextResponse.json({
          success: true,
          message: 'Real-time communication cleanup completed'
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 });
    }
  } catch (error) {
    return handleGenericError(error, 'process real-time communication request');
  }
}