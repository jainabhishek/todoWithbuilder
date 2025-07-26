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
 * GET /api/projects/statistics - Get project statistics
 */
export async function GET(request: NextRequest) {
  try {
    const manager = await getProjectManager();
    const statistics = manager.getProjectStatistics();

    return NextResponse.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    return handleGenericError(error, 'get project statistics');
  }
}