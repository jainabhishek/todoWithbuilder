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
 * POST /api/projects/:id/assign - Assign agents to a project
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { agentRoles, autoAssign = false } = body;

    const manager = await getProjectManager();
    const resolvedParams = await params;

    let result;
    if (autoAssign) {
      // Automatically assign appropriate agents based on project requirements
      result = await manager.autoAssignAgents(resolvedParams.id);
    } else {
      // Manually assign specific agent roles
      if (!agentRoles || !Array.isArray(agentRoles)) {
        return NextResponse.json({
          success: false,
          error: 'Agent roles array is required for manual assignment'
        }, { status: 400 });
      }
      
      result = await manager.assignAgents(resolvedParams.id, agentRoles);
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Agents assigned successfully'
    });
  } catch (error) {
    return handleGenericError(error, 'assign agents to project');
  }
}

/**
 * DELETE /api/projects/:id/assign - Remove agent assignments from a project
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const agentRole = searchParams.get('agent');

    const manager = await getProjectManager();
    const resolvedParams = await params;

    if (agentRole) {
      // Remove specific agent
      await manager.removeAgentFromProject(resolvedParams.id, agentRole);
    } else {
      // Remove all agents
      await manager.clearProjectAgents(resolvedParams.id);
    }

    return NextResponse.json({
      success: true,
      message: agentRole 
        ? `Agent ${agentRole} removed from project`
        : 'All agents removed from project'
    });
  } catch (error) {
    return handleGenericError(error, 'remove agents from project');
  }
}