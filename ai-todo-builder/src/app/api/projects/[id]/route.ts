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
 * GET /api/projects/:id - Get a specific project
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const manager = await getProjectManager();
    const resolvedParams = await params;
    const project = await manager.getProject(resolvedParams.id);

    if (!project) {
      return NextResponse.json({
        success: false,
        error: 'Project not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: project
    });
  } catch (error) {
    return handleGenericError(error, 'fetch project');
  }
}

/**
 * PUT /api/projects/:id - Update a specific project
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const manager = await getProjectManager();
    const resolvedParams = await params;
    
    const project = await manager.updateProject(resolvedParams.id, body);

    return NextResponse.json({
      success: true,
      data: project,
      message: 'Project updated successfully'
    });
  } catch (error) {
    return handleGenericError(error, 'update project');
  }
}

/**
 * DELETE /api/projects/:id - Delete a specific project
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const manager = await getProjectManager();
    const resolvedParams = await params;
    await manager.deleteProject(resolvedParams.id);

    return NextResponse.json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    return handleGenericError(error, 'delete project');
  }
}