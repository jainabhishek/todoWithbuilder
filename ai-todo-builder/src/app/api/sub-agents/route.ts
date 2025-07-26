import { NextRequest, NextResponse } from 'next/server';
import { SubAgentManager } from '@/lib/sub-agent-manager';
import { handleGenericError } from '@/lib/error-handler';

let subAgentManager: SubAgentManager | null = null;

async function getSubAgentManager(): Promise<SubAgentManager> {
  if (!subAgentManager) {
    subAgentManager = new SubAgentManager();
    await subAgentManager.initialize();
  }
  return subAgentManager;
}

/**
 * GET /api/sub-agents - Get all available sub-agents
 */
export async function GET() {
  try {
    const manager = await getSubAgentManager();
    const agents = manager.getAvailableAgents();
    const statuses = manager.getAgentStatuses();

    return NextResponse.json({
      success: true,
      data: {
        agents,
        statuses,
        total: agents.length
      }
    });
  } catch (error) {
    return handleGenericError(error, 'fetch sub-agents');
  }
}

/**
 * POST /api/sub-agents - Create a new sub-agent or delegate a task
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const manager = await getSubAgentManager();

    // Check if this is a task delegation request
    if (body.action === 'delegate') {
      const { agentName, taskDescription, options = {} } = body;

      if (!agentName || !taskDescription) {
        return NextResponse.json({
          success: false,
          error: 'Agent name and task description are required for delegation'
        }, { status: 400 });
      }

      const result = await manager.delegateTask(agentName, taskDescription, options);

      return NextResponse.json({
        success: result.success,
        data: result,
        message: result.success 
          ? `Task delegated to ${agentName} successfully`
          : `Task delegation failed: ${result.error}`
      });
    }

    // Otherwise, create a new sub-agent
    const { name, description, tools, systemPrompt, workspace } = body;

    if (!name || !description || !systemPrompt) {
      return NextResponse.json({
        success: false,
        error: 'Name, description, and system prompt are required'
      }, { status: 400 });
    }

    await manager.createSubAgent({
      name,
      description,
      tools,
      systemPrompt,
      workspace
    });

    return NextResponse.json({
      success: true,
      message: `Sub-agent ${name} created successfully`
    });
  } catch (error) {
    return handleGenericError(error, 'process sub-agent request');
  }
}

/**
 * PUT /api/sub-agents - Update an existing sub-agent
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, ...updates } = body;

    if (!name) {
      return NextResponse.json({
        success: false,
        error: 'Agent name is required for updates'
      }, { status: 400 });
    }

    const manager = await getSubAgentManager();
    await manager.updateSubAgent(name, updates);

    return NextResponse.json({
      success: true,
      message: `Sub-agent ${name} updated successfully`
    });
  } catch (error) {
    return handleGenericError(error, 'update sub-agent');
  }
}

/**
 * DELETE /api/sub-agents - Delete a sub-agent
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');

    if (!name) {
      return NextResponse.json({
        success: false,
        error: 'Agent name is required for deletion'
      }, { status: 400 });
    }

    const manager = await getSubAgentManager();
    await manager.deleteSubAgent(name);

    return NextResponse.json({
      success: true,
      message: `Sub-agent ${name} deleted successfully`
    });
  } catch (error) {
    return handleGenericError(error, 'delete sub-agent');
  }
}