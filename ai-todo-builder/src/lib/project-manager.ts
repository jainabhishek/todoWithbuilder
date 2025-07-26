import { SubAgentManager, AgentRole } from './sub-agent-manager';
import { CommunicationManager } from './communication-manager';
import { SharedWorkspace } from './shared-workspace';
import { RealtimeCommunication } from './realtime-communication';
import { v4 as uuidv4 } from 'uuid';

export interface Project {
  id: string;
  title: string;
  description: string;
  userRequest: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  assignedAgents: string[];
  progress: number;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  timeline: ProjectTimeline;
  deliverables: Deliverable[];
  currentPhase: ProjectPhase;
  executionContext?: ProjectExecutionContext;
}

export enum ProjectStatus {
  PLANNING = 'planning',
  IN_PROGRESS = 'in-progress',
  REVIEW = 'review',
  COMPLETED = 'completed',
  ON_HOLD = 'on-hold',
  CANCELLED = 'cancelled'
}

export enum ProjectPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum ProjectPhase {
  REQUIREMENTS = 'requirements',
  DESIGN = 'design',
  DEVELOPMENT = 'development',
  TESTING = 'testing',
  DEPLOYMENT = 'deployment',
  COMPLETED = 'completed'
}

export interface ProjectTimeline {
  startDate: Date;
  estimatedEndDate: Date;
  actualEndDate?: Date;
  milestones: Milestone[];
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  phase: ProjectPhase;
  dueDate: Date;
  completed: boolean;
  completedAt?: Date;
  assignedAgent?: string;
}

export interface Deliverable {
  id: string;
  projectId: string;
  agentRole: string;
  type: DeliverableType;
  name: string;
  content: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  phase: ProjectPhase;
}

export enum DeliverableType {
  REQUIREMENTS = 'requirements',
  DESIGN = 'design',
  CODE = 'code',
  TESTS = 'tests',
  DOCUMENTATION = 'documentation',
  DEPLOYMENT = 'deployment'
}

export interface ProjectExecutionContext {
  currentAgent?: string;
  currentTask?: string;
  executionLog: ExecutionLogEntry[];
  handoffHistory: HandoffEntry[];
  sessionIds: Record<string, string>; // agentRole -> sessionId
}

export interface ExecutionLogEntry {
  id: string;
  timestamp: Date;
  agentRole: string;
  action: string;
  details: string;
  success: boolean;
  error?: string;
}

export interface HandoffEntry {
  id: string;
  timestamp: Date;
  fromAgent: string;
  toAgent: string;
  reason: string;
  context: unknown;
  taskDescription: string;
  success: boolean;
}

export interface AgentAssignment {
  projectId: string;
  agentRole: string;
  assignedAt: Date;
  status: 'assigned' | 'working' | 'completed' | 'blocked';
  currentTask?: string;
}

/**
 * Project Management System
 * Orchestrates AI agents to work on projects collaboratively
 */
export class ProjectManager {
  private subAgentManager: SubAgentManager;
  private communicationManager: CommunicationManager;
  private sharedWorkspace: SharedWorkspace;
  private realtimeComm: RealtimeCommunication;
  private projects: Map<string, Project> = new Map();
  private agentAssignments: Map<string, AgentAssignment[]> = new Map();

  constructor() {
    this.subAgentManager = new SubAgentManager();
    this.sharedWorkspace = new SharedWorkspace();
    this.realtimeComm = new RealtimeCommunication();
    this.communicationManager = new CommunicationManager(
      this.subAgentManager,
      this.sharedWorkspace,
      this.realtimeComm
    );
  }

  /**
   * Initialize the project manager
   */
  async initialize(): Promise<void> {
    await this.subAgentManager.initialize();
    await this.sharedWorkspace.initialize();
    await this.loadExistingProjects();
  }

  /**
   * Load existing projects from storage
   */
  private async loadExistingProjects(): Promise<void> {
    // In a real implementation, this would load from database
    // For now, we'll start with empty state
  }

  /**
   * Create a new project
   */
  async createProject(params: {
    title: string;
    description: string;
    userRequest: string;
    priority?: ProjectPriority;
  }): Promise<Project> {
    const project: Project = {
      id: uuidv4(),
      title: params.title,
      description: params.description,
      userRequest: params.userRequest,
      status: ProjectStatus.PLANNING,
      priority: params.priority || ProjectPriority.MEDIUM,
      assignedAgents: [],
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      currentPhase: ProjectPhase.REQUIREMENTS,
      timeline: {
        startDate: new Date(),
        estimatedEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        milestones: this.generateDefaultMilestones()
      },
      deliverables: [],
      executionContext: {
        executionLog: [],
        handoffHistory: [],
        sessionIds: {}
      }
    };

    this.projects.set(project.id, project);
    return project;
  }

  /**
   * Generate default milestones for a project
   */
  private generateDefaultMilestones(): Milestone[] {
    const now = new Date();
    return [
      {
        id: uuidv4(),
        title: 'Requirements Analysis',
        description: 'Analyze user requirements and create detailed specifications',
        phase: ProjectPhase.REQUIREMENTS,
        dueDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000), // 1 day
        completed: false
      },
      {
        id: uuidv4(),
        title: 'Design & Architecture',
        description: 'Create UI/UX designs and technical architecture',
        phase: ProjectPhase.DESIGN,
        dueDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days
        completed: false
      },
      {
        id: uuidv4(),
        title: 'Implementation',
        description: 'Develop the feature according to specifications',
        phase: ProjectPhase.DEVELOPMENT,
        dueDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000), // 5 days
        completed: false
      },
      {
        id: uuidv4(),
        title: 'Testing & QA',
        description: 'Test the implementation and ensure quality',
        phase: ProjectPhase.TESTING,
        dueDate: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000), // 6 days
        completed: false
      },
      {
        id: uuidv4(),
        title: 'Deployment',
        description: 'Deploy the feature to production',
        phase: ProjectPhase.DEPLOYMENT,
        dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days
        completed: false
      }
    ];
  }

  /**
   * Get all projects with optional filtering
   */
  async getProjects(filters?: {
    status?: string;
    agentId?: string;
  }): Promise<Project[]> {
    let projects = Array.from(this.projects.values());

    if (filters?.status) {
      projects = projects.filter(p => p.status === filters.status);
    }

    if (filters?.agentId) {
      projects = projects.filter(p => p.assignedAgents.includes(filters.agentId!));
    }

    return projects.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  /**
   * Get a specific project
   */
  async getProject(id: string): Promise<Project | null> {
    return this.projects.get(id) || null;
  }

  /**
   * Update a project
   */
  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    const project = this.projects.get(id);
    if (!project) {
      throw new Error(`Project ${id} not found`);
    }

    const updatedProject = {
      ...project,
      ...updates,
      updatedAt: new Date()
    };

    this.projects.set(id, updatedProject);
    return updatedProject;
  }

  /**
   * Delete a project
   */
  async deleteProject(id: string): Promise<void> {
    this.projects.delete(id);
    this.agentAssignments.delete(id);
  }

  /**
   * Automatically assign appropriate agents based on project requirements
   */
  async autoAssignAgents(projectId: string): Promise<AgentAssignment[]> {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    // Analyze project requirements to determine needed agents
    const requiredAgents = await this.analyzeRequiredAgents(project);
    
    return this.assignAgents(projectId, requiredAgents);
  }

  /**
   * Analyze project requirements to determine which agents are needed
   */
  private async analyzeRequiredAgents(project: Project): Promise<string[]> {
    // Use the product manager agent to analyze requirements
    const analysisResult = await this.subAgentManager.delegateTask(
      AgentRole.PRODUCT_MANAGER,
      `Analyze this feature request and determine which AI agents would be needed: "${project.userRequest}". 
       Consider: ${project.description}
       
       Available agents: product-manager, ux-designer, solutions-architect, frontend-developer, backend-developer, qa-engineer, devops-engineer, scrum-master
       
       Return a JSON array of agent names that would be needed for this project.`
    );

    if (analysisResult.success) {
      try {
        // Extract agent list from the response
        const agentMatch = analysisResult.result.match(/\[(.*?)\]/);
        if (agentMatch) {
          const agentList = JSON.parse(agentMatch[0]);
          return agentList.filter((agent: string) => 
            Object.values(AgentRole).includes(agent as AgentRole)
          );
        }
      } catch (error) {
        console.warn('Failed to parse agent analysis result:', error);
      }
    }

    // Fallback to default agent set
    return [
      AgentRole.PRODUCT_MANAGER,
      AgentRole.FRONTEND_DEVELOPER,
      AgentRole.QA_ENGINEER
    ];
  }

  /**
   * Assign specific agents to a project
   */
  async assignAgents(projectId: string, agentRoles: string[]): Promise<AgentAssignment[]> {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    const assignments: AgentAssignment[] = agentRoles.map(role => ({
      projectId,
      agentRole: role,
      assignedAt: new Date(),
      status: 'assigned' as const
    }));

    this.agentAssignments.set(projectId, assignments);

    // Update project with assigned agents
    await this.updateProject(projectId, {
      assignedAgents: agentRoles,
      status: ProjectStatus.PLANNING
    });

    // Log the assignment
    await this.logExecution(projectId, 'system', 'agents_assigned', 
      `Assigned agents: ${agentRoles.join(', ')}`, true);

    return assignments;
  }

  /**
   * Remove an agent from a project
   */
  async removeAgentFromProject(projectId: string, agentRole: string): Promise<void> {
    const assignments = this.agentAssignments.get(projectId) || [];
    const updatedAssignments = assignments.filter(a => a.agentRole !== agentRole);
    
    this.agentAssignments.set(projectId, updatedAssignments);

    const project = this.projects.get(projectId);
    if (project) {
      await this.updateProject(projectId, {
        assignedAgents: updatedAssignments.map(a => a.agentRole)
      });
    }
  }

  /**
   * Clear all agent assignments from a project
   */
  async clearProjectAgents(projectId: string): Promise<void> {
    this.agentAssignments.delete(projectId);
    
    const project = this.projects.get(projectId);
    if (project) {
      await this.updateProject(projectId, {
        assignedAgents: []
      });
    }
  }

  /**
   * Execute a project through its phases
   */
  async executeProject(
    projectId: string, 
    phase: string = 'all'
  ): Promise<ProjectExecutionContext> {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    if (project.assignedAgents.length === 0) {
      throw new Error('No agents assigned to project. Please assign agents first.');
    }

    // Update project status
    await this.updateProject(projectId, {
      status: ProjectStatus.IN_PROGRESS,
      startedAt: new Date()
    });

    // Start execution based on phase
    if (phase === 'all') {
      return await this.executeAllPhases(project);
    } else {
      return await this.executePhase(project, phase as ProjectPhase);
    }
  }

  /**
   * Execute all project phases sequentially
   */
  private async executeAllPhases(project: Project): Promise<ProjectExecutionContext> {
    const phases = [
      ProjectPhase.REQUIREMENTS,
      ProjectPhase.DESIGN,
      ProjectPhase.DEVELOPMENT,
      ProjectPhase.TESTING,
      ProjectPhase.DEPLOYMENT
    ];

    for (const phase of phases) {
      await this.executePhase(project, phase);
      
      // Update progress
      const phaseIndex = phases.indexOf(phase);
      const progress = Math.round(((phaseIndex + 1) / phases.length) * 100);
      
      await this.updateProject(project.id, {
        currentPhase: phase,
        progress
      });
    }

    // Mark project as completed
    await this.updateProject(project.id, {
      status: ProjectStatus.COMPLETED,
      completedAt: new Date(),
      progress: 100
    });

    return project.executionContext!;
  }

  /**
   * Execute a specific project phase
   */
  private async executePhase(project: Project, phase: ProjectPhase): Promise<ProjectExecutionContext> {
    await this.logExecution(project.id, 'system', 'phase_started', 
      `Starting ${phase} phase`, true);

    switch (phase) {
      case ProjectPhase.REQUIREMENTS:
        return await this.executeRequirementsPhase(project);
      case ProjectPhase.DESIGN:
        return await this.executeDesignPhase(project);
      case ProjectPhase.DEVELOPMENT:
        return await this.executeDevelopmentPhase(project);
      case ProjectPhase.TESTING:
        return await this.executeTestingPhase(project);
      case ProjectPhase.DEPLOYMENT:
        return await this.executeDeploymentPhase(project);
      default:
        throw new Error(`Unknown phase: ${phase}`);
    }
  }

  /**
   * Execute requirements analysis phase
   */
  private async executeRequirementsPhase(project: Project): Promise<ProjectExecutionContext> {
    if (!project.assignedAgents.includes(AgentRole.PRODUCT_MANAGER)) {
      throw new Error('Product Manager agent required for requirements phase');
    }

    const task = `Analyze the following feature request and create detailed requirements:
    
    Title: ${project.title}
    Description: ${project.description}
    User Request: ${project.userRequest}
    
    Please provide:
    1. Detailed user stories with acceptance criteria
    2. Technical requirements
    3. Dependencies and constraints
    4. Success criteria`;

    const result = await this.subAgentManager.delegateTask(
      AgentRole.PRODUCT_MANAGER,
      task
    );

    if (result.success) {
      // Store requirements as deliverable
      await this.addDeliverable(project.id, {
        agentRole: AgentRole.PRODUCT_MANAGER,
        type: DeliverableType.REQUIREMENTS,
        name: 'Project Requirements',
        content: result.result,
        phase: ProjectPhase.REQUIREMENTS
      });

      // Mark requirements milestone as completed
      await this.completeMilestone(project.id, ProjectPhase.REQUIREMENTS);
    }

    await this.logExecution(project.id, AgentRole.PRODUCT_MANAGER, 'requirements_analysis', 
      'Completed requirements analysis', result.success, result.error);

    return project.executionContext!;
  }

  /**
   * Execute design phase
   */
  private async executeDesignPhase(project: Project): Promise<ProjectExecutionContext> {
    const designAgents = project.assignedAgents.filter(agent => 
      [AgentRole.UX_DESIGNER, AgentRole.SOLUTIONS_ARCHITECT].includes(agent as AgentRole)
    );

    if (designAgents.length === 0) {
      throw new Error('UX Designer or Solutions Architect required for design phase');
    }

    // Get requirements from previous phase
    const requirements = project.deliverables.find(d => 
      d.type === DeliverableType.REQUIREMENTS
    );

    for (const agentRole of designAgents) {
      let task = '';
      let deliverableName = '';

      if (agentRole === AgentRole.UX_DESIGNER) {
        task = `Create UI/UX design for the following feature:
        
        ${requirements?.content || project.description}
        
        Please provide:
        1. User interface mockups
        2. User flow diagrams
        3. Accessibility considerations
        4. Design specifications for developers`;
        deliverableName = 'UI/UX Design';
      } else if (agentRole === AgentRole.SOLUTIONS_ARCHITECT) {
        task = `Create technical architecture for the following feature:
        
        ${requirements?.content || project.description}
        
        Please provide:
        1. System architecture design
        2. Database schema changes
        3. API specifications
        4. Technical implementation plan`;
        deliverableName = 'Technical Architecture';
      }

      const result = await this.subAgentManager.delegateTask(agentRole, task);

      if (result.success) {
        await this.addDeliverable(project.id, {
          agentRole,
          type: DeliverableType.DESIGN,
          name: deliverableName,
          content: result.result,
          phase: ProjectPhase.DESIGN
        });
      }

      await this.logExecution(project.id, agentRole, 'design_creation', 
        `Completed ${deliverableName.toLowerCase()}`, result.success, result.error);
    }

    await this.completeMilestone(project.id, ProjectPhase.DESIGN);
    return project.executionContext!;
  }

  /**
   * Execute development phase
   */
  private async executeDevelopmentPhase(project: Project): Promise<ProjectExecutionContext> {
    const developers = project.assignedAgents.filter(agent => 
      [AgentRole.FRONTEND_DEVELOPER, AgentRole.BACKEND_DEVELOPER].includes(agent as AgentRole)
    );

    if (developers.length === 0) {
      throw new Error('Frontend or Backend Developer required for development phase');
    }

    // Get design specifications
    const designSpecs = project.deliverables.filter(d => 
      d.type === DeliverableType.DESIGN
    );

    for (const agentRole of developers) {
      const relevantSpecs = designSpecs.find(spec => 
        (agentRole === AgentRole.FRONTEND_DEVELOPER && spec.name.includes('UI/UX')) ||
        (agentRole === AgentRole.BACKEND_DEVELOPER && spec.name.includes('Architecture'))
      );

      const task = `Implement the following feature based on the specifications:
      
      Project: ${project.title}
      Description: ${project.description}
      
      Specifications:
      ${relevantSpecs?.content || 'No specific design specifications available'}
      
      Please implement the feature according to best practices and provide:
      1. Complete implementation code
      2. Documentation
      3. Unit tests
      4. Integration instructions`;

      const result = await this.subAgentManager.delegateTask(agentRole, task);

      if (result.success) {
        await this.addDeliverable(project.id, {
          agentRole,
          type: DeliverableType.CODE,
          name: `${agentRole === AgentRole.FRONTEND_DEVELOPER ? 'Frontend' : 'Backend'} Implementation`,
          content: result.result,
          phase: ProjectPhase.DEVELOPMENT
        });
      }

      await this.logExecution(project.id, agentRole, 'implementation', 
        'Completed feature implementation', result.success, result.error);
    }

    await this.completeMilestone(project.id, ProjectPhase.DEVELOPMENT);
    return project.executionContext!;
  }

  /**
   * Execute testing phase
   */
  private async executeTestingPhase(project: Project): Promise<ProjectExecutionContext> {
    if (!project.assignedAgents.includes(AgentRole.QA_ENGINEER)) {
      throw new Error('QA Engineer required for testing phase');
    }

    // Get implementation code
    const implementations = project.deliverables.filter(d => 
      d.type === DeliverableType.CODE
    );

    const task = `Create comprehensive tests for the implemented feature:
    
    Project: ${project.title}
    
    Implementation details:
    ${implementations.map(impl => `${impl.name}:\n${impl.content}`).join('\n\n')}
    
    Please provide:
    1. Test plan and test cases
    2. Unit tests
    3. Integration tests
    4. End-to-end tests
    5. Test execution results`;

    const result = await this.subAgentManager.delegateTask(
      AgentRole.QA_ENGINEER,
      task
    );

    if (result.success) {
      await this.addDeliverable(project.id, {
        agentRole: AgentRole.QA_ENGINEER,
        type: DeliverableType.TESTS,
        name: 'Test Suite',
        content: result.result,
        phase: ProjectPhase.TESTING
      });
    }

    await this.logExecution(project.id, AgentRole.QA_ENGINEER, 'testing', 
      'Completed testing phase', result.success, result.error);

    await this.completeMilestone(project.id, ProjectPhase.TESTING);
    return project.executionContext!;
  }

  /**
   * Execute deployment phase
   */
  private async executeDeploymentPhase(project: Project): Promise<ProjectExecutionContext> {
    if (!project.assignedAgents.includes(AgentRole.DEVOPS_ENGINEER)) {
      throw new Error('DevOps Engineer required for deployment phase');
    }

    const task = `Create deployment plan and documentation for the feature:
    
    Project: ${project.title}
    
    Please provide:
    1. Deployment checklist
    2. Environment setup instructions
    3. Rollback procedures
    4. Monitoring and alerting setup
    5. Post-deployment verification steps`;

    const result = await this.subAgentManager.delegateTask(
      AgentRole.DEVOPS_ENGINEER,
      task
    );

    if (result.success) {
      await this.addDeliverable(project.id, {
        agentRole: AgentRole.DEVOPS_ENGINEER,
        type: DeliverableType.DEPLOYMENT,
        name: 'Deployment Plan',
        content: result.result,
        phase: ProjectPhase.DEPLOYMENT
      });
    }

    await this.logExecution(project.id, AgentRole.DEVOPS_ENGINEER, 'deployment', 
      'Completed deployment phase', result.success, result.error);

    await this.completeMilestone(project.id, ProjectPhase.DEPLOYMENT);
    return project.executionContext!;
  }

  /**
   * Add a deliverable to a project
   */
  private async addDeliverable(projectId: string, deliverable: Omit<Deliverable, 'id' | 'projectId' | 'createdAt' | 'metadata'>): Promise<void> {
    const project = this.projects.get(projectId);
    if (!project) return;

    const newDeliverable: Deliverable = {
      id: uuidv4(),
      projectId,
      createdAt: new Date(),
      metadata: {},
      ...deliverable
    };

    project.deliverables.push(newDeliverable);
    await this.updateProject(projectId, { deliverables: project.deliverables });
  }

  /**
   * Complete a milestone
   */
  private async completeMilestone(projectId: string, phase: ProjectPhase): Promise<void> {
    const project = this.projects.get(projectId);
    if (!project) return;

    const milestone = project.timeline.milestones.find(m => m.phase === phase);
    if (milestone) {
      milestone.completed = true;
      milestone.completedAt = new Date();
      await this.updateProject(projectId, { timeline: project.timeline });
    }
  }

  /**
   * Log execution activity
   */
  private async logExecution(
    projectId: string,
    agentRole: string,
    action: string,
    details: string,
    success: boolean,
    error?: string
  ): Promise<void> {
    const project = this.projects.get(projectId);
    if (!project?.executionContext) return;

    const logEntry: ExecutionLogEntry = {
      id: uuidv4(),
      timestamp: new Date(),
      agentRole,
      action,
      details,
      success,
      error
    };

    project.executionContext.executionLog.push(logEntry);
    await this.updateProject(projectId, { executionContext: project.executionContext });
  }

  /**
   * Get project execution status
   */
  async getProjectExecutionStatus(projectId: string): Promise<ProjectExecutionContext | null> {
    const project = this.projects.get(projectId);
    return project?.executionContext || null;
  }

  /**
   * Stop project execution
   */
  async stopProjectExecution(projectId: string): Promise<void> {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    await this.updateProject(projectId, {
      status: ProjectStatus.ON_HOLD
    });

    await this.logExecution(projectId, 'system', 'execution_stopped', 
      'Project execution stopped by user', true);
  }

  /**
   * Create a project communication thread
   */
  async createProjectThread(projectId: string, topic: string, participants: string[]): Promise<string> {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    const thread = await this.communicationManager.createThread(topic, participants, projectId);
    
    await this.logExecution(projectId, 'system', 'thread_created', 
      `Created communication thread: ${topic} with participants: ${participants.join(', ')}`, true);

    return thread.id;
  }

  /**
   * Request agent handoff for a project task
   */
  async requestAgentHandoff(
    projectId: string,
    fromAgent: string,
    toAgent: string,
    reason: string,
    taskDescription: string,
    context?: unknown
  ): Promise<string> {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    const handoffRequest = await this.communicationManager.suggestHandoff(
      fromAgent,
      toAgent,
      reason,
      context || {},
      taskDescription,
      projectId
    );

    await this.logExecution(projectId, fromAgent, 'handoff_requested', 
      `Requested handoff to ${toAgent}: ${reason}`, true);

    return handoffRequest.id;
  }

  /**
   * Accept an agent handoff
   */
  async acceptHandoff(handoffId: string): Promise<void> {
    await this.communicationManager.acceptHandoff(handoffId);
    
    const handoff = this.communicationManager.getHandoffRequests().find(h => h.id === handoffId);
    if (handoff?.projectId) {
      await this.logExecution(handoff.projectId, handoff.toAgent, 'handoff_accepted', 
        `Accepted handoff from ${handoff.fromAgent}`, true);
    }
  }

  /**
   * Reject an agent handoff
   */
  async rejectHandoff(handoffId: string, reason: string): Promise<void> {
    await this.communicationManager.rejectHandoff(handoffId, reason);
    
    const handoff = this.communicationManager.getHandoffRequests().find(h => h.id === handoffId);
    if (handoff?.projectId) {
      await this.logExecution(handoff.projectId, handoff.toAgent, 'handoff_rejected', 
        `Rejected handoff from ${handoff.fromAgent}: ${reason}`, true);
    }
  }

  /**
   * Get project communication threads
   */
  getProjectThreads(projectId: string) {
    return this.communicationManager.getProjectThreads(projectId);
  }

  /**
   * Get agent workloads
   */
  getAgentWorkloads() {
    return this.communicationManager.getAllAgentWorkloads();
  }

  /**
   * Get pending handoff requests for a project
   */
  getProjectHandoffRequests(projectId: string) {
    return this.communicationManager.getHandoffRequests('pending')
      .filter(req => req.projectId === projectId);
  }

  /**
   * Send message in project thread
   */
  async sendProjectMessage(
    projectId: string,
    threadId: string,
    from: string,
    content: unknown
  ): Promise<void> {
    await this.communicationManager.sendMessage(threadId, from, content);
    
    await this.logExecution(projectId, from, 'message_sent', 
      `Sent message in thread ${threadId}`, true);
  }

  /**
   * Coordinate agent collaboration for a project phase
   */
  async coordinatePhaseCollaboration(
    projectId: string,
    phase: ProjectPhase,
    leadAgent: string,
    collaborators: string[]
  ): Promise<string> {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    const taskDescription = `Collaborate on ${phase} phase for project: ${project.title}`;
    
    const thread = await this.communicationManager.facilitateCollaboration(
      leadAgent,
      collaborators,
      taskDescription
    );

    await this.logExecution(projectId, leadAgent, 'collaboration_initiated', 
      `Started collaboration for ${phase} phase with: ${collaborators.join(', ')}`, true);

    return thread.id;
  }

  /**
   * Get project progress with agent coordination details
   */
  async getProjectProgressWithCoordination(projectId: string) {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    const threads = this.getProjectThreads(projectId);
    const handoffRequests = this.getProjectHandoffRequests(projectId);
    const agentWorkloads = this.getAgentWorkloads();

    return {
      project,
      coordination: {
        activeThreads: threads.filter(t => t.status === 'active').length,
        totalMessages: threads.reduce((sum, t) => sum + t.messages.length, 0),
        pendingHandoffs: handoffRequests.length,
        agentWorkloads: agentWorkloads.filter(w => 
          project.assignedAgents.includes(w.agentRole)
        )
      }
    };
  }

  /**
   * Auto-coordinate project execution with intelligent agent handoffs
   */
  private async autoCoordinateExecution(project: Project): Promise<void> {
    // Create main project coordination thread
    const mainThreadId = await this.createProjectThread(
      project.id,
      `Project Coordination: ${project.title}`,
      project.assignedAgents
    );

    // Set up phase-specific coordination
    const phases = [
      { phase: ProjectPhase.REQUIREMENTS, lead: AgentRole.PRODUCT_MANAGER },
      { phase: ProjectPhase.DESIGN, lead: AgentRole.UX_DESIGNER },
      { phase: ProjectPhase.DEVELOPMENT, lead: AgentRole.FRONTEND_DEVELOPER },
      { phase: ProjectPhase.TESTING, lead: AgentRole.QA_ENGINEER },
      { phase: ProjectPhase.DEPLOYMENT, lead: AgentRole.DEVOPS_ENGINEER }
    ];

    for (const { phase, lead } of phases) {
      if (project.assignedAgents.includes(lead)) {
        const collaborators = project.assignedAgents.filter(agent => agent !== lead);
        
        if (collaborators.length > 0) {
          await this.coordinatePhaseCollaboration(
            project.id,
            phase,
            lead,
            collaborators
          );
        }
      }
    }

    await this.logExecution(project.id, 'system', 'auto_coordination_setup', 
      'Set up automatic coordination for project execution', true);
  }

  /**
   * Enhanced project execution with coordination
   */
  async executeProjectWithCoordination(
    projectId: string, 
    phase: string = 'all'
  ): Promise<ProjectExecutionContext> {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    if (project.assignedAgents.length === 0) {
      throw new Error('No agents assigned to project. Please assign agents first.');
    }

    // Set up coordination before execution
    await this.autoCoordinateExecution(project);

    // Update project status
    await this.updateProject(projectId, {
      status: ProjectStatus.IN_PROGRESS,
      startedAt: new Date()
    });

    // Execute with coordination
    if (phase === 'all') {
      return await this.executeAllPhasesWithCoordination(project);
    } else {
      return await this.executePhaseWithCoordination(project, phase as ProjectPhase);
    }
  }

  /**
   * Execute all phases with coordination
   */
  private async executeAllPhasesWithCoordination(project: Project): Promise<ProjectExecutionContext> {
    const phases = [
      ProjectPhase.REQUIREMENTS,
      ProjectPhase.DESIGN,
      ProjectPhase.DEVELOPMENT,
      ProjectPhase.TESTING,
      ProjectPhase.DEPLOYMENT
    ];

    for (const phase of phases) {
      await this.executePhaseWithCoordination(project, phase);
      
      // Update progress
      const phaseIndex = phases.indexOf(phase);
      const progress = Math.round(((phaseIndex + 1) / phases.length) * 100);
      
      await this.updateProject(project.id, {
        currentPhase: phase,
        progress
      });

      // Brief pause between phases for coordination
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Mark project as completed
    await this.updateProject(project.id, {
      status: ProjectStatus.COMPLETED,
      completedAt: new Date(),
      progress: 100
    });

    return project.executionContext!;
  }

  /**
   * Execute phase with coordination
   */
  private async executePhaseWithCoordination(
    project: Project, 
    phase: ProjectPhase
  ): Promise<ProjectExecutionContext> {
    await this.logExecution(project.id, 'system', 'phase_started', 
      `Starting ${phase} phase with coordination`, true);

    // Execute the phase (using existing logic)
    const result = await this.executePhase(project, phase);

    // Post-phase coordination
    await this.postPhaseCoordination(project, phase);

    return result;
  }

  /**
   * Handle post-phase coordination
   */
  private async postPhaseCoordination(project: Project, phase: ProjectPhase): Promise<void> {
    const phaseDeliverables = project.deliverables.filter(d => d.phase === phase);
    
    if (phaseDeliverables.length > 0) {
      // Notify all agents about phase completion and deliverables
      const threads = this.getProjectThreads(project.id);
      const mainThread = threads.find(t => t.topic.includes('Project Coordination'));
      
      if (mainThread) {
        await this.communicationManager.sendMessage(
          mainThread.id,
          'system',
          {
            type: 'phase_completed',
            phase,
            deliverables: phaseDeliverables.map(d => ({
              name: d.name,
              type: d.type,
              agentRole: d.agentRole
            })),
            message: `${phase} phase completed with ${phaseDeliverables.length} deliverables`
          }
        );
      }
    }

    await this.logExecution(project.id, 'system', 'post_phase_coordination', 
      `Completed post-phase coordination for ${phase}`, true);
  }

  /**
   * Get all communication threads across projects
   */
  getAllThreads() {
    return this.communicationManager.getAllThreads();
  }

  /**
   * Get all handoff requests across projects
   */
  getAllHandoffRequests(status?: 'pending' | 'accepted' | 'rejected' | 'completed') {
    return this.communicationManager.getHandoffRequests(status);
  }

  /**
   * Broadcast message to all agents
   */
  async broadcastMessage(from: string, content: unknown): Promise<void> {
    await this.communicationManager.sendMessage('broadcast', from, content);
  }

  /**
   * Rebalance agent workloads across projects
   */
  async rebalanceWorkloads(): Promise<{ rebalanced: number; recommendations: string[] }> {
    const workloads = this.getAgentWorkloads();
    const overloadedAgents = workloads.filter(w => w.availability === 'busy');
    const availableAgents = workloads.filter(w => w.availability === 'available');
    
    const recommendations: string[] = [];
    let rebalanced = 0;

    for (const overloaded of overloadedAgents) {
      const alternative = availableAgents.find(agent => 
        agent.specializations.some(spec => 
          overloaded.specializations.includes(spec)
        )
      );

      if (alternative) {
        recommendations.push(
          `Consider reassigning tasks from ${overloaded.agentRole} to ${alternative.agentRole}`
        );
        rebalanced++;
      }
    }

    return { rebalanced, recommendations };
  }

  /**
   * Get project statistics for dashboard
   */
  getProjectStatistics() {
    const projects = Array.from(this.projects.values());
    
    return {
      total: projects.length,
      byStatus: {
        planning: projects.filter(p => p.status === ProjectStatus.PLANNING).length,
        inProgress: projects.filter(p => p.status === ProjectStatus.IN_PROGRESS).length,
        completed: projects.filter(p => p.status === ProjectStatus.COMPLETED).length,
        onHold: projects.filter(p => p.status === ProjectStatus.ON_HOLD).length,
        cancelled: projects.filter(p => p.status === ProjectStatus.CANCELLED).length,
      },
      byPriority: {
        low: projects.filter(p => p.priority === ProjectPriority.LOW).length,
        medium: projects.filter(p => p.priority === ProjectPriority.MEDIUM).length,
        high: projects.filter(p => p.priority === ProjectPriority.HIGH).length,
        urgent: projects.filter(p => p.priority === ProjectPriority.URGENT).length,
      },
      averageProgress: projects.length > 0 
        ? Math.round(projects.reduce((sum, p) => sum + p.progress, 0) / projects.length)
        : 0,
      activeAgents: new Set(projects.flatMap(p => p.assignedAgents)).size
    };
  }

  /**
   * Get project health metrics
   */
  getProjectHealth(projectId: string) {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    const now = new Date();
    const daysSinceStart = project.startedAt 
      ? Math.floor((now.getTime() - project.startedAt.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    const overdueMilestones = project.timeline.milestones.filter(m => 
      !m.completed && m.dueDate < now
    ).length;

    const completedMilestones = project.timeline.milestones.filter(m => m.completed).length;
    const totalMilestones = project.timeline.milestones.length;

    const health = {
      score: 100,
      issues: [] as string[],
      recommendations: [] as string[]
    };

    // Deduct points for overdue milestones
    if (overdueMilestones > 0) {
      health.score -= overdueMilestones * 20;
      health.issues.push(`${overdueMilestones} overdue milestone(s)`);
      health.recommendations.push('Review project timeline and reassign resources');
    }

    // Deduct points for stalled progress
    if (project.status === ProjectStatus.IN_PROGRESS && project.progress === 0 && daysSinceStart > 1) {
      health.score -= 30;
      health.issues.push('No progress after project start');
      health.recommendations.push('Check agent assignments and remove blockers');
    }

    // Deduct points for insufficient agent coverage
    if (project.assignedAgents.length < 2) {
      health.score -= 15;
      health.issues.push('Limited agent coverage');
      health.recommendations.push('Consider assigning additional specialized agents');
    }

    // Bonus points for good progress
    if (project.progress > 50) {
      health.score += 10;
    }

    health.score = Math.max(0, Math.min(100, health.score));

    return {
      ...health,
      metrics: {
        daysSinceStart,
        overdueMilestones,
        completedMilestones,
        totalMilestones,
        progressRate: daysSinceStart > 0 ? project.progress / daysSinceStart : 0
      }
    };
  }

  /**
   * Get all handoff requests with optional status filter
   */
  getAllHandoffRequests(status?: 'pending' | 'accepted' | 'rejected' | 'completed') {
    return this.communicationManager.getHandoffRequests(status);
  }

  /**
   * Get all communication threads
   */
  getAllThreads() {
    return this.communicationManager.getAllThreads();
  }

  /**
   * Get project statistics
   */
  getProjectStatistics() {
    const projects = Array.from(this.projects.values());
    
    return {
      total: projects.length,
      byStatus: projects.reduce((acc, project) => {
        acc[project.status] = (acc[project.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byPriority: projects.reduce((acc, project) => {
        acc[project.priority] = (acc[project.priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      averageProgress: projects.length > 0 
        ? projects.reduce((sum, p) => sum + p.progress, 0) / projects.length 
        : 0,
      activeAgents: new Set(projects.flatMap(p => p.assignedAgents)).size
    };
  }

  /**
   * Broadcast message to all agents
   */
  async broadcastMessage(from: string, content: unknown): Promise<void> {
    await this.communicationManager.sendMessage(
      'broadcast',
      from,
      content
    );
  }

  /**
   * Rebalance agent workloads
   */
  async rebalanceWorkloads(): Promise<{ rebalanced: number; recommendations: string[] }> {
    const workloads = this.communicationManager.getAllAgentWorkloads();
    const overloadedAgents = workloads.filter(w => w.availability === 'busy');
    const availableAgents = workloads.filter(w => w.availability === 'available');
    
    let rebalanced = 0;
    const recommendations: string[] = [];

    // Simple rebalancing logic
    for (const overloaded of overloadedAgents) {
      const available = availableAgents.find(a => 
        a.specializations.some(spec => overloaded.specializations.includes(spec))
      );
      
      if (available) {
        recommendations.push(`Consider moving tasks from ${overloaded.agentRole} to ${available.agentRole}`);
        rebalanced++;
      }
    }

    if (rebalanced === 0) {
      recommendations.push('All agents are optimally balanced');
    }

    return { rebalanced, recommendations };
  }

  /**
   * Get communication manager instance
   */
  getCommunicationManager(): CommunicationManager {
    return this.communicationManager;
  }

  /**
   * Get shared workspace instance
   */
  getSharedWorkspace(): SharedWorkspace {
    return this.sharedWorkspace;
  }

  /**
   * Get real-time communication instance
   */
  getRealtimeCommunication(): RealtimeCommunication {
    return this.realtimeComm;
  }
}