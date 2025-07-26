import { NextRequest, NextResponse } from 'next/server';
import { WorkflowCoordinator } from '@/lib/workflow-coordinator';
import { CommunicationManager } from '@/lib/communication-manager';
import { SharedWorkspace } from '@/lib/shared-workspace';
import { NotificationSystem } from '@/lib/notification-system';
import { RealtimeCommunication } from '@/lib/realtime-communication';
import { SubAgentManager } from '@/lib/sub-agent-manager';
import { handleGenericError } from '@/lib/error-handler';

let workflowCoordinator: WorkflowCoordinator | null = null;

async function getWorkflowCoordinator(): Promise<WorkflowCoordinator> {
  if (!workflowCoordinator) {
    const subAgentManager = new SubAgentManager();
    await subAgentManager.initialize();
    
    const sharedWorkspace = new SharedWorkspace();
    await sharedWorkspace.initialize();
    
    const realtimeComm = new RealtimeCommunication();
    const communicationManager = new CommunicationManager(subAgentManager, sharedWorkspace, realtimeComm);
    const notificationSystem = communicationManager.getNotificationSystem();
    
    workflowCoordinator = new WorkflowCoordinator(communicationManager, sharedWorkspace, notificationSystem);
  }
  return workflowCoordinator;
}

/**
 * GET /api/communication/workflows - Get workflow information
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const workflowId = searchParams.get('workflowId');
    const reviewId = searchParams.get('reviewId');
    const conflictId = searchParams.get('conflictId');
    const handoffId = searchParams.get('handoffId');

    const coordinator = await getWorkflowCoordinator();

    switch (action) {
      case 'workflows':
        if (workflowId) {
          const workflow = coordinator.getWorkflow(workflowId);
          return NextResponse.json({
            success: true,
            data: { workflow }
          });
        } else {
          const workflows = coordinator.getAllWorkflows();
          return NextResponse.json({
            success: true,
            data: { workflows }
          });
        }

      case 'code_reviews':
        if (reviewId) {
          const review = coordinator.getCodeReview(reviewId);
          return NextResponse.json({
            success: true,
            data: { review }
          });
        } else {
          const reviews = coordinator.getAllCodeReviews();
          return NextResponse.json({
            success: true,
            data: { reviews }
          });
        }

      case 'conflicts':
        if (conflictId) {
          const conflict = coordinator.getConflict(conflictId);
          return NextResponse.json({
            success: true,
            data: { conflict }
          });
        } else {
          const conflicts = coordinator.getAllConflicts();
          return NextResponse.json({
            success: true,
            data: { conflicts }
          });
        }

      case 'handoffs':
        if (handoffId) {
          const handoff = coordinator.getHandoffProcess(handoffId);
          return NextResponse.json({
            success: true,
            data: { handoff }
          });
        } else {
          const handoffs = coordinator.getAllHandoffProcesses();
          return NextResponse.json({
            success: true,
            data: { handoffs }
          });
        }

      case 'statistics':
        const stats = coordinator.getWorkflowStatistics();
        return NextResponse.json({
          success: true,
          data: stats
        });

      default:
        // Return overview of all workflow data
        const overview = {
          workflows: coordinator.getAllWorkflows(),
          codeReviews: coordinator.getAllCodeReviews(),
          conflicts: coordinator.getAllConflicts(),
          handoffs: coordinator.getAllHandoffProcesses(),
          statistics: coordinator.getWorkflowStatistics()
        };
        
        return NextResponse.json({
          success: true,
          data: overview
        });
    }
  } catch (error) {
    return handleGenericError(error, 'get workflow information');
  }
}

/**
 * POST /api/communication/workflows - Create or update workflow items
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...data } = body;

    const coordinator = await getWorkflowCoordinator();

    switch (action) {
      case 'create_workflow':
        const { projectId, phase, steps } = data;
        if (!projectId || !phase || !steps || !Array.isArray(steps)) {
          return NextResponse.json({
            success: false,
            error: 'Project ID, phase, and steps array are required'
          }, { status: 400 });
        }

        const workflowId = await coordinator.createWorkflow(projectId, phase, steps);
        return NextResponse.json({
          success: true,
          data: { workflowId },
          message: 'Workflow created successfully'
        });

      case 'start_step':
        const { workflowId: startWorkflowId, stepId: startStepId } = data;
        if (!startWorkflowId || !startStepId) {
          return NextResponse.json({
            success: false,
            error: 'Workflow ID and step ID are required'
          }, { status: 400 });
        }

        const started = await coordinator.startWorkflowStep(startWorkflowId, startStepId);
        return NextResponse.json({
          success: started,
          message: started ? 'Workflow step started successfully' : 'Failed to start workflow step (check dependencies)'
        });

      case 'complete_step':
        const { workflowId: completeWorkflowId, stepId: completeStepId, deliverables } = data;
        if (!completeWorkflowId || !completeStepId || !deliverables) {
          return NextResponse.json({
            success: false,
            error: 'Workflow ID, step ID, and deliverables are required'
          }, { status: 400 });
        }

        const completed = await coordinator.completeWorkflowStep(completeWorkflowId, completeStepId, deliverables);
        return NextResponse.json({
          success: completed,
          message: completed ? 'Workflow step completed successfully' : 'Failed to complete workflow step'
        });

      case 'review_step':
        const { workflowId: reviewWorkflowId, stepId: reviewStepId, reviewerId, status, comments } = data;
        if (!reviewWorkflowId || !reviewStepId || !reviewerId || !status) {
          return NextResponse.json({
            success: false,
            error: 'Workflow ID, step ID, reviewer ID, and status are required'
          }, { status: 400 });
        }

        const reviewed = await coordinator.reviewWorkflowStep(reviewWorkflowId, reviewStepId, reviewerId, status, comments);
        return NextResponse.json({
          success: reviewed,
          message: reviewed ? 'Step review submitted successfully' : 'Failed to submit step review'
        });

      case 'create_handoff':
        const { fromAgent, toAgent, context } = data;
        if (!fromAgent || !toAgent || !context) {
          return NextResponse.json({
            success: false,
            error: 'From agent, to agent, and context are required'
          }, { status: 400 });
        }

        const handoff = await coordinator.createHandoffProcess(fromAgent, toAgent, context);
        return NextResponse.json({
          success: true,
          data: { handoff },
          message: 'Handoff process created successfully'
        });

      case 'complete_handoff_step':
        const { handoffId: completeHandoffId, stepId: completeHandoffStepId, notes } = data;
        if (!completeHandoffId || !completeHandoffStepId) {
          return NextResponse.json({
            success: false,
            error: 'Handoff ID and step ID are required'
          }, { status: 400 });
        }

        const handoffStepCompleted = await coordinator.completeHandoffStep(completeHandoffId, completeHandoffStepId, notes);
        return NextResponse.json({
          success: handoffStepCompleted,
          message: handoffStepCompleted ? 'Handoff step completed successfully' : 'Failed to complete handoff step'
        });

      case 'create_code_review':
        const { fileId, authorId, reviewerId, priority } = data;
        if (!fileId || !authorId || !reviewerId) {
          return NextResponse.json({
            success: false,
            error: 'File ID, author ID, and reviewer ID are required'
          }, { status: 400 });
        }

        const codeReview = await coordinator.createCodeReview(fileId, authorId, reviewerId, priority);
        return NextResponse.json({
          success: true,
          data: { codeReview },
          message: 'Code review created successfully'
        });

      case 'add_review_comment':
        const { reviewId: commentReviewId, content, type, severity, lineNumber } = data;
        if (!commentReviewId || !content) {
          return NextResponse.json({
            success: false,
            error: 'Review ID and content are required'
          }, { status: 400 });
        }

        const comment = await coordinator.addCodeReviewComment(commentReviewId, content, type, severity, lineNumber);
        return NextResponse.json({
          success: true,
          data: { comment },
          message: 'Code review comment added successfully'
        });

      case 'complete_code_review':
        const { reviewId: completeReviewId, status: reviewStatus, checklist } = data;
        if (!completeReviewId || !reviewStatus) {
          return NextResponse.json({
            success: false,
            error: 'Review ID and status are required'
          }, { status: 400 });
        }

        const reviewCompleted = await coordinator.completeCodeReview(completeReviewId, reviewStatus, checklist || {});
        return NextResponse.json({
          success: reviewCompleted,
          message: reviewCompleted ? 'Code review completed successfully' : 'Failed to complete code review'
        });

      case 'create_conflict':
        const { type, severity, description, involvedAgents, projectId: conflictProjectId } = data;
        if (!type || !severity || !description || !involvedAgents) {
          return NextResponse.json({
            success: false,
            error: 'Type, severity, description, and involved agents are required'
          }, { status: 400 });
        }

        const conflict = await coordinator.createConflict(type, severity, description, involvedAgents, conflictProjectId);
        return NextResponse.json({
          success: true,
          data: { conflict },
          message: 'Conflict created successfully'
        });

      case 'assign_mediator':
        const { conflictId: mediateConflictId, mediatorId } = data;
        if (!mediateConflictId || !mediatorId) {
          return NextResponse.json({
            success: false,
            error: 'Conflict ID and mediator ID are required'
          }, { status: 400 });
        }

        const mediatorAssigned = await coordinator.assignMediator(mediateConflictId, mediatorId);
        return NextResponse.json({
          success: mediatorAssigned,
          message: mediatorAssigned ? 'Mediator assigned successfully' : 'Failed to assign mediator'
        });

      case 'resolve_conflict':
        const { conflictId: resolveConflictId, resolution, resolvedBy } = data;
        if (!resolveConflictId || !resolution || !resolvedBy) {
          return NextResponse.json({
            success: false,
            error: 'Conflict ID, resolution, and resolved by are required'
          }, { status: 400 });
        }

        const conflictResolved = await coordinator.resolveConflict(resolveConflictId, resolution, resolvedBy);
        return NextResponse.json({
          success: conflictResolved,
          message: conflictResolved ? 'Conflict resolved successfully' : 'Failed to resolve conflict'
        });

      case 'escalate_conflict':
        const { conflictId: escalateConflictId } = data;
        if (!escalateConflictId) {
          return NextResponse.json({
            success: false,
            error: 'Conflict ID is required'
          }, { status: 400 });
        }

        const conflictEscalated = await coordinator.escalateConflict(escalateConflictId);
        return NextResponse.json({
          success: conflictEscalated,
          message: conflictEscalated ? 'Conflict escalated successfully' : 'Failed to escalate conflict'
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 });
    }
  } catch (error) {
    return handleGenericError(error, 'process workflow request');
  }
}