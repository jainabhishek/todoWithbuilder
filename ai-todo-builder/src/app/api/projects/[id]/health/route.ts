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
 * GET /api/projects/:id/health - Get project health metrics
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const manager = await getProjectManager();
    const resolvedParams = await params;
    const health = manager.getProjectHealth(resolvedParams.id);

    return NextResponse.json({
      success: true,
      data: health
    });
  } catch (error) {
    return handleGenericError(error, 'get project health');
  }
}