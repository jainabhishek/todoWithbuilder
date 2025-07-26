import { NextRequest, NextResponse } from 'next/server';
import { handleGenericError } from '@/lib/error-handler';
import { ProjectManager } from '@/lib/project-manager';

let projectManager: ProjectManager | null = null;

async function getProjectManager(): Promise<ProjectManager> {
  if (!projectManager) {
    projectManager = new ProjectManager();
    await projectManager.initialize();
  }
  return projectManager;
}

/**
 * GET /api/projects/:id/coordination - Get project coordination details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const manager = await getProjectManager();
    const resolvedParams = await params;
    const coordination = await manager.getProjectProgressWithCoordination(resolvedParams.id);

    return NextResponse.json({
      success: true,
      data: coordination
    });
  } catch (error) {
    return handleGenericError(error, 'get project coordination');
  }
}

/**
 * POST /api/projects/:id/coordination - Create coordination actions
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { action, ...actionData } = body;
    const manager = await getProjectManager();
    const resolvedParams = await params;

    let result;

    switch (action) {
      case 'create_thread':
        result = await manager.createProjectThread(
          resolvedParams.id,
          actionData.topic,
          actionData.participants
        );
        break;

      case 'request_handoff':
        result = await manager.requestAgentHandoff(
          resolvedParams.id,
          actionData.fromAgent,
          actionData.toAgent,
          actionData.reason,
          actionData.taskDescription,
          actionData.context
        );
        break;

      case 'accept_handoff':
        await manager.acceptHandoff(actionData.handoffId);
        result = { handoffId: actionData.handoffId, status: 'accepted' };
        break;

      case 'reject_handoff':
        await manager.rejectHandoff(actionData.handoffId, actionData.reason);
        result = { handoffId: actionData.handoffId, status: 'rejected' };
        break;

      case 'coordinate_collaboration':
        result = await manager.coordinatePhaseCollaboration(
          resolvedParams.id,
          actionData.phase,
          actionData.leadAgent,
          actionData.collaborators
        );
        break;

      case 'send_message':
        await manager.sendProjectMessage(
          resolvedParams.id,
          actionData.threadId,
          actionData.from,
          actionData.content
        );
        result = { messageId: 'sent', threadId: actionData.threadId };
        break;

      case 'execute_with_coordination':
        result = await manager.executeProjectWithCoordination(
          resolvedParams.id,
          actionData.phase
        );
        break;

      default:
        return NextResponse.json({
          success: false,
          error: `Unknown coordination action: ${action}`
        }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: `Coordination action '${action}' completed successfully`
    });
  } catch (error) {
    return handleGenericError(error, 'execute coordination action');
  }
}