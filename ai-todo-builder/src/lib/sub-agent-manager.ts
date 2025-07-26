import { promises as fs } from 'fs';
import path from 'path';
import { executeClaudeQuery, type ClaudeCodeOptions } from './claude-sdk';

export interface SubAgentConfig {
  name: string;
  description: string;
  tools?: string[];
  systemPrompt: string;
  workspace?: string;
}

export interface SubAgentMessage {
  id: string;
  from: string;
  to: string | 'broadcast';
  type: MessageType;
  content: unknown;
  timestamp: Date;
  threadId?: string;
  sessionId: string;
}

export enum MessageType {
  TASK_ASSIGNMENT = 'task_assignment',
  TASK_RESULT = 'task_result',
  QUESTION = 'question',
  ANSWER = 'answer',
  STATUS_UPDATE = 'status_update',
  HANDOFF = 'handoff',
  BROADCAST = 'broadcast'
}

export enum AgentRole {
  PRODUCT_MANAGER = 'product-manager',
  UX_DESIGNER = 'ux-designer',
  SOLUTIONS_ARCHITECT = 'solutions-architect',
  FRONTEND_DEVELOPER = 'frontend-developer',
  BACKEND_DEVELOPER = 'backend-developer',
  QA_ENGINEER = 'qa-engineer',
  DEVOPS_ENGINEER = 'devops-engineer',
  SCRUM_MASTER = 'scrum-master'
}

export interface TaskResult {
  success: boolean;
  result: string;
  sessionId: string;
  metadata?: Record<string, unknown>;
  error?: string;
}

export interface AgentStatus {
  role: AgentRole;
  status: 'idle' | 'working' | 'waiting' | 'error';
  currentTask?: string;
  lastActivity: Date;
  sessionId?: string;
}

/**
 * Sub-Agent Configuration Manager
 * Handles creation, management, and communication with Claude Code sub-agents
 */
export class SubAgentManager {
  private agentsDir: string;
  private agentConfigs: Map<string, SubAgentConfig> = new Map();
  private agentSessions: Map<string, string> = new Map(); // agentName -> sessionId
  private messageQueue: SubAgentMessage[] = [];

  constructor(projectRoot: string = process.cwd()) {
    this.agentsDir = path.join(projectRoot, '.claude', 'agents');
  }

  /**
   * Initialize the sub-agent system
   */
  async initialize(): Promise<void> {
    await this.ensureAgentsDirectory();
    await this.loadExistingAgents();
  }

  /**
   * Ensure the .claude/agents directory exists
   */
  private async ensureAgentsDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.agentsDir, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create agents directory: ${error}`);
    }
  }

  /**
   * Load existing sub-agent configurations from files
   */
  private async loadExistingAgents(): Promise<void> {
    try {
      const files = await fs.readdir(this.agentsDir);
      const agentFiles = files.filter(file => file.endsWith('.md'));

      for (const file of agentFiles) {
        const agentPath = path.join(this.agentsDir, file);
        const content = await fs.readFile(agentPath, 'utf-8');
        const config = this.parseAgentConfig(content);
        
        if (config) {
          this.agentConfigs.set(config.name, config);
        }
      }
    } catch (error) {
      console.warn('Warning: Could not load existing agents:', error);
    }
  }

  /**
   * Parse sub-agent configuration from markdown file content
   */
  private parseAgentConfig(content: string): SubAgentConfig | null {
    const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    
    if (!frontMatterMatch) {
      return null;
    }

    const [, frontMatter, systemPrompt] = frontMatterMatch;
    const config: Partial<SubAgentConfig> = { systemPrompt: systemPrompt.trim() };

    // Parse YAML-like frontmatter
    const lines = frontMatter.split('\n');
    for (const line of lines) {
      const [key, ...valueParts] = line.split(':');
      if (key && valueParts.length > 0) {
        const value = valueParts.join(':').trim();
        
        switch (key.trim()) {
          case 'name':
            config.name = value;
            break;
          case 'description':
            config.description = value;
            break;
          case 'tools':
            config.tools = value.split(',').map(tool => tool.trim());
            break;
        }
      }
    }

    if (config.name && config.description && config.systemPrompt) {
      return config as SubAgentConfig;
    }

    return null;
  }

  /**
   * Create a new sub-agent configuration
   */
  async createSubAgent(config: SubAgentConfig): Promise<void> {
    const agentPath = path.join(this.agentsDir, `${config.name}.md`);
    const content = this.generateAgentFile(config);

    try {
      await fs.writeFile(agentPath, content);
      this.agentConfigs.set(config.name, config);
    } catch (error) {
      throw new Error(`Failed to create sub-agent ${config.name}: ${error}`);
    }
  }

  /**
   * Generate sub-agent markdown file content
   */
  private generateAgentFile(config: SubAgentConfig): string {
    const frontMatter = [
      '---',
      `name: ${config.name}`,
      `description: ${config.description}`,
      config.tools ? `tools: ${config.tools.join(', ')}` : '',
      '---',
      '',
      config.systemPrompt
    ].filter(Boolean).join('\n');

    return frontMatter;
  }

  /**
   * Get all available sub-agents
   */
  getAvailableAgents(): SubAgentConfig[] {
    return Array.from(this.agentConfigs.values());
  }

  /**
   * Get a specific sub-agent configuration
   */
  getAgent(name: string): SubAgentConfig | undefined {
    return this.agentConfigs.get(name);
  }

  /**
   * Delegate a task to a specific sub-agent
   */
  async delegateTask(
    agentName: string, 
    taskDescription: string, 
    options: ClaudeCodeOptions = {}
  ): Promise<TaskResult> {
    const agent = this.agentConfigs.get(agentName);
    
    if (!agent) {
      return {
        success: false,
        result: '',
        sessionId: '',
        error: `Sub-agent ${agentName} not found`
      };
    }

    try {
      // Create a specialized prompt that invokes the sub-agent
      const prompt = `Use the ${agentName} sub-agent to handle this task: ${taskDescription}`;
      
      const result = await executeClaudeQuery(prompt, {
        ...options,
        systemPrompt: agent.systemPrompt,
        allowedTools: agent.tools,
      });

      // Store session for potential follow-up
      this.agentSessions.set(agentName, result.sessionId);

      return {
        success: true,
        result: result.result,
        sessionId: result.sessionId,
        metadata: {
          agentName,
          totalCostUsd: result.totalCostUsd,
          durationMs: result.durationMs,
          numTurns: result.numTurns
        }
      };
    } catch (error) {
      return {
        success: false,
        result: '',
        sessionId: '',
        error: `Task delegation failed: ${error}`
      };
    }
  }

  /**
   * Send a message between sub-agents
   */
  async sendMessage(message: Omit<SubAgentMessage, 'id' | 'timestamp'>): Promise<void> {
    const fullMessage: SubAgentMessage = {
      ...message,
      id: this.generateMessageId(),
      timestamp: new Date()
    };

    this.messageQueue.push(fullMessage);

    // In a real implementation, this would handle message routing
    // For now, we'll just store messages for potential processing
  }

  /**
   * Get messages for a specific agent or thread
   */
  getMessages(agentName?: string, threadId?: string): SubAgentMessage[] {
    return this.messageQueue.filter(message => {
      if (agentName && message.to !== agentName && message.from !== agentName) {
        return false;
      }
      if (threadId && message.threadId !== threadId) {
        return false;
      }
      return true;
    });
  }

  /**
   * Create a communication thread between agents
   */
  createThread(participants: string[], topic: string): string {
    const threadId = this.generateMessageId();
    
    // Send initial thread creation message
    this.sendMessage({
      from: 'system',
      to: 'broadcast',
      type: MessageType.BROADCAST,
      content: {
        action: 'thread_created',
        threadId,
        participants,
        topic
      },
      sessionId: 'system',
      threadId
    });

    return threadId;
  }

  /**
   * Get the status of all agents
   */
  getAgentStatuses(): AgentStatus[] {
    return Array.from(this.agentConfigs.keys()).map(agentName => ({
      role: agentName as AgentRole,
      status: 'idle', // In a real implementation, this would track actual status
      lastActivity: new Date(),
      sessionId: this.agentSessions.get(agentName)
    }));
  }

  /**
   * Handle agent handoff between different roles
   */
  async handleHandoff(
    fromAgent: string,
    toAgent: string,
    context: unknown,
    taskDescription: string
  ): Promise<TaskResult> {
    // Create handoff message
    await this.sendMessage({
      from: fromAgent,
      to: toAgent,
      type: MessageType.HANDOFF,
      content: {
        context,
        taskDescription,
        handoffReason: 'Task requires specialized expertise'
      },
      sessionId: this.agentSessions.get(fromAgent) || ''
    });

    // Delegate task to the target agent
    return await this.delegateTask(toAgent, taskDescription, {
      systemPrompt: `You are receiving a handoff from ${fromAgent}. Context: ${JSON.stringify(context)}`
    });
  }

  /**
   * Generate a unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update an existing sub-agent configuration
   */
  async updateSubAgent(name: string, updates: Partial<SubAgentConfig>): Promise<void> {
    const existing = this.agentConfigs.get(name);
    
    if (!existing) {
      throw new Error(`Sub-agent ${name} not found`);
    }

    const updated = { ...existing, ...updates };
    await this.createSubAgent(updated); // This will overwrite the existing file
  }

  /**
   * Delete a sub-agent
   */
  async deleteSubAgent(name: string): Promise<void> {
    const agentPath = path.join(this.agentsDir, `${name}.md`);
    
    try {
      await fs.unlink(agentPath);
      this.agentConfigs.delete(name);
      this.agentSessions.delete(name);
    } catch (error) {
      throw new Error(`Failed to delete sub-agent ${name}: ${error}`);
    }
  }
}

/**
 * Default sub-agent configurations based on the design document
 */
export const DEFAULT_AGENT_CONFIGS: Record<AgentRole, SubAgentConfig> = {
  [AgentRole.PRODUCT_MANAGER]: {
    name: 'product-manager',
    description: 'Requirements analysis and user story creation. Use proactively for feature planning and stakeholder communication.',
    tools: ['Read', 'Write', 'Grep'],
    systemPrompt: `You are a senior product manager specializing in feature requirements and user experience.

When invoked:
1. Analyze user feature requests for clarity and feasibility
2. Create detailed user stories with acceptance criteria
3. Identify dependencies and potential conflicts
4. Communicate with stakeholders for clarification
5. Create project specifications and timelines

Focus on user value, technical feasibility, and clear communication.`
  },
  [AgentRole.UX_DESIGNER]: {
    name: 'ux-designer',
    description: 'UI/UX design and user experience optimization. Use proactively for interface design and user flow creation.',
    tools: ['Read', 'Write', 'Bash'],
    systemPrompt: `You are a senior UX/UI designer focused on creating intuitive user experiences.

When invoked:
1. Create wireframes and mockups for new features
2. Design user flows and interaction patterns
3. Ensure accessibility compliance
4. Create design specifications for developers
5. Conduct usability analysis

Prioritize user-centered design, accessibility, and modern UI patterns.`
  },
  [AgentRole.SOLUTIONS_ARCHITECT]: {
    name: 'solutions-architect',
    description: 'System architecture and technical design decisions. Use proactively for complex feature planning and system design.',
    tools: ['Read', 'Write', 'Grep', 'Glob'],
    systemPrompt: `You are a senior solutions architect specializing in scalable system design.

When invoked:
1. Design system architecture for complex features
2. Make technology stack decisions
3. Plan database schemas and data flows
4. Identify performance and scalability considerations
5. Create technical specifications and documentation

Focus on maintainable, scalable solutions that align with business requirements.`
  },
  [AgentRole.FRONTEND_DEVELOPER]: {
    name: 'frontend-developer',
    description: 'React/TypeScript frontend development. Use proactively for UI implementation and component creation.',
    tools: ['Read', 'Write', 'Edit', 'Bash', 'Grep', 'Glob'],
    systemPrompt: `You are a senior frontend developer specializing in React and TypeScript.

When invoked:
1. Implement UI components based on design specifications
2. Write clean, maintainable React code with TypeScript
3. Ensure responsive design and accessibility
4. Write comprehensive unit tests
5. Optimize performance and bundle size

Follow React best practices, use modern hooks, and ensure type safety.`
  },
  [AgentRole.BACKEND_DEVELOPER]: {
    name: 'backend-developer',
    description: 'Node.js/Express API development and database operations. Use proactively for server-side implementation.',
    tools: ['Read', 'Write', 'Edit', 'Bash', 'Grep', 'Glob'],
    systemPrompt: `You are a senior backend developer specializing in Node.js and database design.

When invoked:
1. Design and implement REST APIs
2. Create database schemas and migrations
3. Implement business logic and data validation
4. Write comprehensive API tests
5. Ensure security and performance

Focus on scalable architecture, data integrity, and API best practices.`
  },
  [AgentRole.QA_ENGINEER]: {
    name: 'qa-engineer',
    description: 'Testing and quality assurance. Use proactively after code changes for comprehensive testing.',
    tools: ['Read', 'Write', 'Bash', 'Grep', 'Glob'],
    systemPrompt: `You are a senior QA engineer focused on comprehensive testing strategies.

When invoked:
1. Create test plans and test cases
2. Write automated tests (unit, integration, e2e)
3. Perform manual testing for edge cases
4. Validate accessibility and performance
5. Report bugs with detailed reproduction steps

Ensure comprehensive coverage and maintain high quality standards.`
  },
  [AgentRole.DEVOPS_ENGINEER]: {
    name: 'devops-engineer',
    description: 'Infrastructure, deployment, and CI/CD pipeline management. Use proactively for deployment and infrastructure needs.',
    tools: ['Read', 'Write', 'Bash', 'Grep', 'Glob'],
    systemPrompt: `You are a senior DevOps engineer focused on infrastructure and deployment automation.

When invoked:
1. Set up CI/CD pipelines and deployment processes
2. Configure infrastructure and containerization
3. Implement monitoring and logging solutions
4. Manage environment configurations
5. Ensure security and compliance

Prioritize automation, reliability, and security in all infrastructure decisions.`
  },
  [AgentRole.SCRUM_MASTER]: {
    name: 'scrum-master',
    description: 'Project coordination and agile process facilitation. Use proactively for project planning and team coordination.',
    tools: ['Read', 'Write'],
    systemPrompt: `You are an experienced Scrum Master focused on agile project management and team coordination.

When invoked:
1. Facilitate sprint planning and retrospectives
2. Coordinate between different team members and roles
3. Track project progress and identify blockers
4. Ensure agile best practices are followed
5. Communicate project status to stakeholders

Focus on team productivity, clear communication, and continuous improvement.`
  }
};

/**
 * Initialize all default sub-agents
 */
export async function initializeDefaultSubAgents(projectRoot?: string): Promise<SubAgentManager> {
  const manager = new SubAgentManager(projectRoot);
  await manager.initialize();

  // Create default agents if they don't exist
  for (const config of Object.values(DEFAULT_AGENT_CONFIGS)) {
    const existing = manager.getAgent(config.name);
    if (!existing) {
      await manager.createSubAgent(config);
    }
  }

  return manager;
}