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
 * GET /api/coordination - Get global coordination information
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    const manager = await getProjectManager();
    let data;

    switch (type) {
      case 'workloads':
        data = manager.getAgentWorkloads();
        break;

      case 'handoffs':
        const status = searchParams.get('status') as 'pending' | 'accepted' | 'rejected' | 'completed' | undefined;
        data = manager.getAllHandoffRequests(status);
        break;

      case 'threads':
        const projectId = searchParams.get('projectId');
        if (projectId) {
          data = manager.getProjectThreads(projectId);
        } else {
          data = manager.getAllThreads();
        }
        break;

      case 'statistics':
        data = manager.getProjectStatistics();
        break;

      default:
        // Return overview of all coordination data
        data = {
          agentWorkloads: manager.getAgentWorkloads(),
          statistics: manager.getProjectStatistics(),
          pendingHandoffs: manager.getAllHandoffRequests('pending').length,
          activeThreads: manager.getAllThreads().filter(t => t.status === 'active').length
        };
    }

    return NextResponse.json({
      success: true,
      data
    });
  } catch (error) {
    return handleGenericError(error, 'get coordination information');
  }
}

/**
 * POST /api/coordination - Execute global coordination actions
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...actionData } = body;

    const manager = await getProjectManager();
    let result;

    switch (action) {
      case 'broadcast_message':
        await manager.broadcastMessage(actionData.from || 'system', actionData.content);
        result = { message: 'Message broadcasted successfully' };
        break;

      case 'rebalance_workloads':
        result = await manager.rebalanceWorkloads();
        break;

      default:
        return NextResponse.json({
          success: false,
          error: `Unknown global coordination action: ${action}`
        }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: `Global coordination action '${action}' completed successfully`
    });
  } catch (error) {
    return handleGenericError(error, 'execute global coordination action');
  }
}