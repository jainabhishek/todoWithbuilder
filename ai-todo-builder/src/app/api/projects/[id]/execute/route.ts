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
 * POST /api/projects/:id/execute - Start project execution
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { phase = 'all' } = body;

    const manager = await getProjectManager();
    const resolvedParams = await params;
    const result = await manager.executeProject(resolvedParams.id, phase);

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Project execution started successfully'
    });
  } catch (error) {
    return handleGenericError(error, 'execute project');
  }
}

/**
 * GET /api/projects/:id/execute - Get project execution status
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const manager = await getProjectManager();
    const resolvedParams = await params;
    const status = await manager.getProjectExecutionStatus(resolvedParams.id);

    return NextResponse.json({
      success: true,
      data: status
    });
  } catch (error) {
    return handleGenericError(error, 'get project execution status');
  }
}

/**
 * DELETE /api/projects/:id/execute - Stop project execution
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const manager = await getProjectManager();
    const resolvedParams = await params;
    await manager.stopProjectExecution(resolvedParams.id);

    return NextResponse.json({
      success: true,
      message: 'Project execution stopped'
    });
  } catch (error) {
    return handleGenericError(error, 'stop project execution');
  }
}