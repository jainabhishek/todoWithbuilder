// Core Todo Types
export interface TodoItem {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, unknown>; // Extensible for AI-added features
}

export interface TodoAPI {
  getTodos(): Promise<TodoItem[]>;
  createTodo(todo: Omit<TodoItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<TodoItem>;
  updateTodo(id: string, updates: Partial<TodoItem>): Promise<TodoItem>;
  deleteTodo(id: string): Promise<void>;
}

// Feature Registry Types
export interface FeatureDefinition {
  id: string;
  name: string;
  version: string;
  components: React.ComponentType[];
  apiEndpoints: APIEndpoint[];
  databaseMigrations: Migration[];
  enabled: boolean;
}

export interface FeatureRegistry {
  registerFeature(feature: FeatureDefinition): void;
  enableFeature(featureId: string): void;
  disableFeature(featureId: string): void;
  getActiveFeatures(): FeatureDefinition[];
}

export interface APIEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  handler: (...args: unknown[]) => unknown;
}

export interface Migration {
  id: string;
  up: string;
  down: string;
}

// AI Agent Types
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

export interface AIAgent {
  id: string;
  role: AgentRole;
  session: string;
  status: AgentStatus;
}

export enum AgentStatus {
  IDLE = 'idle',
  WORKING = 'working',
  WAITING = 'waiting',
  ERROR = 'error',
  COMPLETED = 'completed'
}

// Sub-Agent Configuration Types
export interface SubAgentConfig {
  name: string;
  description: string;
  tools?: string[];
  systemPrompt: string;
  workspace?: string;
}

export interface SubAgentStatus {
  role: AgentRole;
  status: 'idle' | 'working' | 'waiting' | 'error';
  currentTask?: string;
  lastActivity: Date;
  sessionId?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assignedAgent: string;
  status: TaskStatus;
  createdAt: Date;
  completedAt?: Date;
}

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface TaskResult {
  success: boolean;
  result?: unknown;
  error?: string;
  artifacts?: string[];
}

// Project Management Types
export interface Project {
  id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  assignedAgents: string[];
  timeline: ProjectTimeline;
  deliverables: Deliverable[];
  createdAt: Date;
}

export enum ProjectStatus {
  PLANNING = 'planning',
  IN_PROGRESS = 'in_progress',
  REVIEW = 'review',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
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
  dueDate: Date;
  completed: boolean;
}

export interface Deliverable {
  id: string;
  projectId: string;
  agentId: string;
  type: DeliverableType;
  name: string;
  content: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export enum DeliverableType {
  CODE = 'code',
  DESIGN = 'design',
  DOCUMENTATION = 'documentation',
  TEST = 'test'
}

// Communication Types
export interface AgentMessage {
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
  STATUS_UPDATE = 'status_update',
  QUESTION = 'question',
  RESPONSE = 'response',
  HANDOFF = 'handoff',
  NOTIFICATION = 'notification'
}

// Code Generation Types
export interface GeneratedCode {
  files: CodeFile[];
  dependencies: string[];
  migrations: Migration[];
  tests: TestFile[];
  sessionId: string;
}

export interface CodeFile {
  path: string;
  content: string;
  type: 'component' | 'api' | 'utility' | 'config';
}

export interface TestFile {
  path: string;
  content: string;
  type: 'unit' | 'integration' | 'e2e';
}

export interface ComponentSpec {
  name: string;
  props: Record<string, unknown>;
  functionality: string[];
  styling: string;
}

export interface APISpec {
  endpoint: string;
  method: string;
  parameters: Record<string, unknown>;
  response: Record<string, unknown>;
  validation: string[];
}

export interface CodeContext {
  files: string[];
  dependencies: string[];
  framework: string;
  testingFramework: string;
}