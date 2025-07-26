import { NextRequest, NextResponse } from 'next/server';
import { SharedWorkspace } from '@/lib/shared-workspace';
import { handleGenericError } from '@/lib/error-handler';

let sharedWorkspace: SharedWorkspace | null = null;

async function getSharedWorkspace(): Promise<SharedWorkspace> {
  if (!sharedWorkspace) {
    sharedWorkspace = new SharedWorkspace();
    await sharedWorkspace.initialize();
  }
  return sharedWorkspace;
}

/**
 * GET /api/communication/workspace - Get workspace files and information
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const projectId = searchParams.get('projectId');
    const agentRole = searchParams.get('agentRole');
    const fileId = searchParams.get('fileId');

    const workspace = await getSharedWorkspace();

    switch (action) {
      case 'files':
        const files = projectId 
          ? workspace.getProjectFiles(projectId)
          : workspace.getSharedFiles();
        
        return NextResponse.json({
          success: true,
          data: { files }
        });

      case 'file':
        if (!fileId) {
          return NextResponse.json({
            success: false,
            error: 'File ID is required'
          }, { status: 400 });
        }

        const file = workspace.getFile(fileId);
        if (!file) {
          return NextResponse.json({
            success: false,
            error: 'File not found'
          }, { status: 404 });
        }

        return NextResponse.json({
          success: true,
          data: { file }
        });

      case 'comments':
        if (!fileId) {
          return NextResponse.json({
            success: false,
            error: 'File ID is required'
          }, { status: 400 });
        }

        const comments = workspace.getFileComments(fileId);
        return NextResponse.json({
          success: true,
          data: { comments }
        });

      case 'sessions':
        const sessions = agentRole 
          ? workspace.getAgentSessions(agentRole)
          : workspace.getActiveSessions();
        
        return NextResponse.json({
          success: true,
          data: { sessions }
        });

      case 'locks':
        const locks = workspace.getFileLocks();
        return NextResponse.json({
          success: true,
          data: { locks }
        });

      case 'stats':
        const stats = workspace.getWorkspaceStats();
        return NextResponse.json({
          success: true,
          data: stats
        });

      case 'search':
        const query = searchParams.get('query');
        if (!query) {
          return NextResponse.json({
            success: false,
            error: 'Search query is required'
          }, { status: 400 });
        }

        const searchResults = workspace.searchFiles(query, projectId || undefined);
        return NextResponse.json({
          success: true,
          data: { files: searchResults }
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Use: files, file, comments, sessions, locks, stats, or search'
        }, { status: 400 });
    }
  } catch (error) {
    return handleGenericError(error, 'get workspace information');
  }
}

/**
 * POST /api/communication/workspace - Create or update workspace items
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...data } = body;

    const workspace = await getSharedWorkspace();

    switch (action) {
      case 'create_session':
        const { agentRole, projectId } = data;
        if (!agentRole) {
          return NextResponse.json({
            success: false,
            error: 'Agent role is required'
          }, { status: 400 });
        }

        const session = await workspace.createSession(agentRole, projectId);
        return NextResponse.json({
          success: true,
          data: { session },
          message: 'Workspace session created successfully'
        });

      case 'create_file':
        const { name, content, type, createdBy, relativePath } = data;
        if (!name || !content || !type || !createdBy) {
          return NextResponse.json({
            success: false,
            error: 'Name, content, type, and createdBy are required'
          }, { status: 400 });
        }

        const file = await workspace.createFile({
          name,
          content,
          type,
          createdBy,
          projectId: data.projectId,
          relativePath
        });

        return NextResponse.json({
          success: true,
          data: { file },
          message: 'File created successfully'
        });

      case 'update_file':
        const { fileId, updatedBy } = data;
        if (!fileId || !data.content || !updatedBy) {
          return NextResponse.json({
            success: false,
            error: 'File ID, content, and updatedBy are required'
          }, { status: 400 });
        }

        const updatedFile = await workspace.updateFile(fileId, data.content, updatedBy);
        return NextResponse.json({
          success: true,
          data: { file: updatedFile },
          message: 'File updated successfully'
        });

      case 'lock_file':
        const lockResult = await workspace.lockFile(data.fileId, data.agentRole);
        return NextResponse.json({
          success: lockResult,
          message: lockResult ? 'File locked successfully' : 'File is already locked by another agent'
        });

      case 'unlock_file':
        const unlockResult = await workspace.unlockFile(data.fileId, data.agentRole);
        return NextResponse.json({
          success: unlockResult,
          message: unlockResult ? 'File unlocked successfully' : 'File is not locked by this agent'
        });

      case 'add_comment':
        const { fileId: commentFileId, agentRole: commentAgent, content: commentContent, lineNumber } = data;
        if (!commentFileId || !commentAgent || !commentContent) {
          return NextResponse.json({
            success: false,
            error: 'File ID, agent role, and content are required'
          }, { status: 400 });
        }

        const comment = await workspace.addComment({
          fileId: commentFileId,
          agentRole: commentAgent,
          content: commentContent,
          lineNumber
        });

        return NextResponse.json({
          success: true,
          data: { comment },
          message: 'Comment added successfully'
        });

      case 'resolve_comment':
        const { commentId, resolvedBy } = data;
        if (!commentId || !resolvedBy) {
          return NextResponse.json({
            success: false,
            error: 'Comment ID and resolvedBy are required'
          }, { status: 400 });
        }

        const resolved = await workspace.resolveComment(commentId, resolvedBy);
        return NextResponse.json({
          success: resolved,
          message: resolved ? 'Comment resolved successfully' : 'Comment not found'
        });

      case 'update_session':
        const { sessionId, activeFiles } = data;
        if (!sessionId) {
          return NextResponse.json({
            success: false,
            error: 'Session ID is required'
          }, { status: 400 });
        }

        await workspace.updateSessionActivity(sessionId, activeFiles);
        return NextResponse.json({
          success: true,
          message: 'Session activity updated'
        });

      case 'end_session':
        if (!data.sessionId) {
          return NextResponse.json({
            success: false,
            error: 'Session ID is required'
          }, { status: 400 });
        }

        await workspace.endSession(data.sessionId);
        return NextResponse.json({
          success: true,
          message: 'Session ended successfully'
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 });
    }
  } catch (error) {
    return handleGenericError(error, 'process workspace request');
  }
}