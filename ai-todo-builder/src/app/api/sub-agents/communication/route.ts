import { NextRequest, NextResponse } from 'next/server';
import { SubAgentManager, MessageType } from '@/lib/sub-agent-manager';
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
 * GET /api/sub-agents/communication - Get messages for an agent or thread
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentName = searchParams.get('agent');
    const threadId = searchParams.get('thread');

    const manager = await getSubAgentManager();
    const messages = manager.getMessages(agentName || undefined, threadId || undefined);

    return NextResponse.json({
      success: true,
      data: {
        messages,
        total: messages.length
      }
    });
  } catch (error) {
    return handleGenericError(error, 'fetch messages');
  }
}

/**
 * POST /api/sub-agents/communication - Send a message or create a thread
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const manager = await getSubAgentManager();

    // Check if this is a thread creation request
    if (body.action === 'create_thread') {
      const { participants, topic } = body;

      if (!participants || !Array.isArray(participants) || !topic) {
        return NextResponse.json({
          success: false,
          error: 'Participants array and topic are required for thread creation'
        }, { status: 400 });
      }

      const threadId = manager.createThread(participants, topic);

      return NextResponse.json({
        success: true,
        data: { threadId },
        message: 'Thread created successfully'
      });
    }

    // Check if this is a handoff request
    if (body.action === 'handoff') {
      const { fromAgent, toAgent, context, taskDescription } = body;

      if (!fromAgent || !toAgent || !taskDescription) {
        return NextResponse.json({
          success: false,
          error: 'From agent, to agent, and task description are required for handoff'
        }, { status: 400 });
      }

      const result = await manager.handleHandoff(fromAgent, toAgent, context, taskDescription);

      return NextResponse.json({
        success: result.success,
        data: result,
        message: result.success 
          ? `Task handed off from ${fromAgent} to ${toAgent} successfully`
          : `Handoff failed: ${result.error}`
      });
    }

    // Otherwise, send a regular message
    const { from, to, type, content, sessionId, threadId } = body;

    if (!from || !to || !type || !content || !sessionId) {
      return NextResponse.json({
        success: false,
        error: 'From, to, type, content, and sessionId are required'
      }, { status: 400 });
    }

    // Validate message type
    if (!Object.values(MessageType).includes(type)) {
      return NextResponse.json({
        success: false,
        error: `Invalid message type. Must be one of: ${Object.values(MessageType).join(', ')}`
      }, { status: 400 });
    }

    await manager.sendMessage({
      from,
      to,
      type,
      content,
      sessionId,
      threadId
    });

    return NextResponse.json({
      success: true,
      message: 'Message sent successfully'
    });
  } catch (error) {
    return handleGenericError(error, 'process communication request');
  }
}