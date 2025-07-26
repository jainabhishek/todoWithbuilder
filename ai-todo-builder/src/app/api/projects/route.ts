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
 * GET /api/projects - Get all projects
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const agentId = searchParams.get('agent');

    const manager = await getProjectManager();
    const projects = await manager.getProjects({ 
      status: status || undefined, 
      agentId: agentId || undefined 
    });

    return NextResponse.json({
      success: true,
      data: {
        projects,
        total: projects.length
      }
    });
  } catch (error) {
    return handleGenericError(error, 'fetch projects');
  }
}

/**
 * POST /api/projects - Create a new project
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, userRequest, priority = 'medium' } = body;

    if (!title || !description || !userRequest) {
      return NextResponse.json({
        success: false,
        error: 'Title, description, and user request are required'
      }, { status: 400 });
    }

    const manager = await getProjectManager();
    const project = await manager.createProject({
      title,
      description,
      userRequest,
      priority
    });

    return NextResponse.json({
      success: true,
      data: project,
      message: 'Project created successfully'
    });
  } catch (error) {
    return handleGenericError(error, 'create project');
  }
}

/**
 * PUT /api/projects/:id - Update a project
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Project ID is required'
      }, { status: 400 });
    }

    const manager = await getProjectManager();
    const project = await manager.updateProject(id, updates);

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
 * DELETE /api/projects/:id - Delete a project
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Project ID is required'
      }, { status: 400 });
    }

    const manager = await getProjectManager();
    await manager.deleteProject(id);

    return NextResponse.json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    return handleGenericError(error, 'delete project');
  }
}