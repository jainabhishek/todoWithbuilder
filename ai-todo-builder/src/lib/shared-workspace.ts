import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface WorkspaceFile {
  id: string;
  name: string;
  path: string;
  content: string;
  type: 'code' | 'documentation' | 'design' | 'test' | 'config';
  createdBy: string;
  createdAt: Date;
  updatedBy: string;
  updatedAt: Date;
  version: number;
  projectId?: string;
  locked?: boolean;
  lockedBy?: string;
  lockedAt?: Date;
}

export interface WorkspaceComment {
  id: string;
  fileId: string;
  agentRole: string;
  content: string;
  lineNumber?: number;
  resolved: boolean;
  createdAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface WorkspaceSession {
  id: string;
  agentRole: string;
  projectId?: string;
  startedAt: Date;
  lastActivity: Date;
  activeFiles: string[];
  status: 'active' | 'idle' | 'disconnected';
}

/**
 * Shared Workspace Manager
 * Provides collaborative file system for AI agents
 */
export class SharedWorkspace {
  private workspaceDir: string;
  private files: Map<string, WorkspaceFile> = new Map();
  private comments: Map<string, WorkspaceComment[]> = new Map();
  private sessions: Map<string, WorkspaceSession> = new Map();
  private fileLocks: Map<string, { agentRole: string; timestamp: Date }> = new Map();

  constructor(projectRoot: string = process.cwd()) {
    this.workspaceDir = path.join(projectRoot, '.claude', 'workspace');
  }

  /**
   * Initialize the shared workspace
   */
  async initialize(): Promise<void> {
    await this.ensureWorkspaceDirectory();
    await this.loadExistingFiles();
  }

  /**
   * Ensure workspace directory exists
   */
  private async ensureWorkspaceDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.workspaceDir, { recursive: true });
      await fs.mkdir(path.join(this.workspaceDir, 'projects'), { recursive: true });
      await fs.mkdir(path.join(this.workspaceDir, 'shared'), { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create workspace directory: ${error}`);
    }
  }

  /**
   * Load existing workspace files
   */
  private async loadExistingFiles(): Promise<void> {
    try {
      const metadataPath = path.join(this.workspaceDir, 'metadata.json');
      
      try {
        const metadataContent = await fs.readFile(metadataPath, 'utf-8');
        const metadata = JSON.parse(metadataContent);
        
        for (const fileData of metadata.files || []) {
          this.files.set(fileData.id, {
            ...fileData,
            createdAt: new Date(fileData.createdAt),
            updatedAt: new Date(fileData.updatedAt),
            lockedAt: fileData.lockedAt ? new Date(fileData.lockedAt) : undefined
          });
        }

        for (const commentData of metadata.comments || []) {
          const fileComments = this.comments.get(commentData.fileId) || [];
          fileComments.push({
            ...commentData,
            createdAt: new Date(commentData.createdAt),
            resolvedAt: commentData.resolvedAt ? new Date(commentData.resolvedAt) : undefined
          });
          this.comments.set(commentData.fileId, fileComments);
        }
      } catch (error) {
        // Metadata file doesn't exist yet, start fresh
      }
    } catch (error) {
      console.warn('Warning: Could not load workspace metadata:', error);
    }
  }

  /**
   * Save workspace metadata
   */
  private async saveMetadata(): Promise<void> {
    const metadata = {
      files: Array.from(this.files.values()),
      comments: Array.from(this.comments.entries()).flatMap(([fileId, comments]) => 
        comments.map(comment => ({ ...comment, fileId }))
      ),
      lastUpdated: new Date().toISOString()
    };

    const metadataPath = path.join(this.workspaceDir, 'metadata.json');
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
  }

  /**
   * Create a new workspace session for an agent
   */
  async createSession(agentRole: string, projectId?: string): Promise<WorkspaceSession> {
    const session: WorkspaceSession = {
      id: uuidv4(),
      agentRole,
      projectId,
      startedAt: new Date(),
      lastActivity: new Date(),
      activeFiles: [],
      status: 'active'
    };

    this.sessions.set(session.id, session);
    return session;
  }

  /**
   * Update session activity
   */
  async updateSessionActivity(sessionId: string, activeFiles?: string[]): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = new Date();
      if (activeFiles) {
        session.activeFiles = activeFiles;
      }
    }
  }

  /**
   * End a workspace session
   */
  async endSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'disconnected';
      
      // Release any file locks held by this session
      for (const [fileId, lock] of this.fileLocks.entries()) {
        if (lock.agentRole === session.agentRole) {
          this.fileLocks.delete(fileId);
          await this.unlockFile(fileId, session.agentRole);
        }
      }
    }
  }

  /**
   * Create or update a file in the workspace
   */
  async createFile(params: {
    name: string;
    content: string;
    type: WorkspaceFile['type'];
    createdBy: string;
    projectId?: string;
    relativePath?: string;
  }): Promise<WorkspaceFile> {
    const fileId = uuidv4();
    const filePath = params.relativePath || 
      path.join(params.projectId ? 'projects' : 'shared', params.name);

    const file: WorkspaceFile = {
      id: fileId,
      name: params.name,
      path: filePath,
      content: params.content,
      type: params.type,
      createdBy: params.createdBy,
      createdAt: new Date(),
      updatedBy: params.createdBy,
      updatedAt: new Date(),
      version: 1,
      projectId: params.projectId
    };

    // Write file to disk
    const fullPath = path.join(this.workspaceDir, filePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, params.content);

    this.files.set(fileId, file);
    await this.saveMetadata();

    return file;
  }

  /**
   * Update an existing file
   */
  async updateFile(
    fileId: string, 
    content: string, 
    updatedBy: string
  ): Promise<WorkspaceFile> {
    const file = this.files.get(fileId);
    if (!file) {
      throw new Error(`File ${fileId} not found`);
    }

    // Check if file is locked by another agent
    const lock = this.fileLocks.get(fileId);
    if (lock && lock.agentRole !== updatedBy) {
      throw new Error(`File is locked by ${lock.agentRole}`);
    }

    // Update file content
    file.content = content;
    file.updatedBy = updatedBy;
    file.updatedAt = new Date();
    file.version += 1;

    // Write to disk
    const fullPath = path.join(this.workspaceDir, file.path);
    await fs.writeFile(fullPath, content);

    await this.saveMetadata();
    return file;
  }

  /**
   * Lock a file for exclusive editing
   */
  async lockFile(fileId: string, agentRole: string): Promise<boolean> {
    const file = this.files.get(fileId);
    if (!file) {
      throw new Error(`File ${fileId} not found`);
    }

    const existingLock = this.fileLocks.get(fileId);
    if (existingLock && existingLock.agentRole !== agentRole) {
      return false; // File is already locked by another agent
    }

    this.fileLocks.set(fileId, { agentRole, timestamp: new Date() });
    
    file.locked = true;
    file.lockedBy = agentRole;
    file.lockedAt = new Date();

    await this.saveMetadata();
    return true;
  }

  /**
   * Unlock a file
   */
  async unlockFile(fileId: string, agentRole: string): Promise<boolean> {
    const file = this.files.get(fileId);
    if (!file) {
      throw new Error(`File ${fileId} not found`);
    }

    const lock = this.fileLocks.get(fileId);
    if (!lock || lock.agentRole !== agentRole) {
      return false; // File is not locked by this agent
    }

    this.fileLocks.delete(fileId);
    
    file.locked = false;
    file.lockedBy = undefined;
    file.lockedAt = undefined;

    await this.saveMetadata();
    return true;
  }

  /**
   * Get file by ID
   */
  getFile(fileId: string): WorkspaceFile | undefined {
    return this.files.get(fileId);
  }

  /**
   * Get files by project
   */
  getProjectFiles(projectId: string): WorkspaceFile[] {
    return Array.from(this.files.values()).filter(file => file.projectId === projectId);
  }

  /**
   * Get all shared files
   */
  getSharedFiles(): WorkspaceFile[] {
    return Array.from(this.files.values()).filter(file => !file.projectId);
  }

  /**
   * Get files by type
   */
  getFilesByType(type: WorkspaceFile['type'], projectId?: string): WorkspaceFile[] {
    return Array.from(this.files.values()).filter(file => 
      file.type === type && (projectId ? file.projectId === projectId : true)
    );
  }

  /**
   * Search files by content or name
   */
  searchFiles(query: string, projectId?: string): WorkspaceFile[] {
    const searchTerm = query.toLowerCase();
    return Array.from(this.files.values()).filter(file => {
      if (projectId && file.projectId !== projectId) return false;
      
      return file.name.toLowerCase().includes(searchTerm) ||
             file.content.toLowerCase().includes(searchTerm);
    });
  }

  /**
   * Add a comment to a file
   */
  async addComment(params: {
    fileId: string;
    agentRole: string;
    content: string;
    lineNumber?: number;
  }): Promise<WorkspaceComment> {
    const file = this.files.get(params.fileId);
    if (!file) {
      throw new Error(`File ${params.fileId} not found`);
    }

    const comment: WorkspaceComment = {
      id: uuidv4(),
      fileId: params.fileId,
      agentRole: params.agentRole,
      content: params.content,
      lineNumber: params.lineNumber,
      resolved: false,
      createdAt: new Date()
    };

    const fileComments = this.comments.get(params.fileId) || [];
    fileComments.push(comment);
    this.comments.set(params.fileId, fileComments);

    await this.saveMetadata();
    return comment;
  }

  /**
   * Resolve a comment
   */
  async resolveComment(commentId: string, resolvedBy: string): Promise<boolean> {
    for (const [fileId, comments] of this.comments.entries()) {
      const comment = comments.find(c => c.id === commentId);
      if (comment) {
        comment.resolved = true;
        comment.resolvedAt = new Date();
        comment.resolvedBy = resolvedBy;
        await this.saveMetadata();
        return true;
      }
    }
    return false;
  }

  /**
   * Get comments for a file
   */
  getFileComments(fileId: string): WorkspaceComment[] {
    return this.comments.get(fileId) || [];
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): WorkspaceSession[] {
    return Array.from(this.sessions.values()).filter(session => 
      session.status === 'active' || session.status === 'idle'
    );
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): WorkspaceSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get sessions by agent role
   */
  getAgentSessions(agentRole: string): WorkspaceSession[] {
    return Array.from(this.sessions.values()).filter(session => 
      session.agentRole === agentRole
    );
  }

  /**
   * Get file locks
   */
  getFileLocks(): Array<{ fileId: string; agentRole: string; timestamp: Date }> {
    return Array.from(this.fileLocks.entries()).map(([fileId, lock]) => ({
      fileId,
      ...lock
    }));
  }

  /**
   * Check if file is locked
   */
  isFileLocked(fileId: string): boolean {
    return this.fileLocks.has(fileId);
  }

  /**
   * Get workspace statistics
   */
  getWorkspaceStats(): {
    totalFiles: number;
    filesByType: Record<string, number>;
    activeSessions: number;
    lockedFiles: number;
    totalComments: number;
    unresolvedComments: number;
  } {
    const files = Array.from(this.files.values());
    const allComments = Array.from(this.comments.values()).flat();

    return {
      totalFiles: files.length,
      filesByType: files.reduce((acc, file) => {
        acc[file.type] = (acc[file.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      activeSessions: this.getActiveSessions().length,
      lockedFiles: this.fileLocks.size,
      totalComments: allComments.length,
      unresolvedComments: allComments.filter(c => !c.resolved).length
    };
  }

  /**
   * Clean up old sessions and locks
   */
  async cleanup(): Promise<void> {
    const now = new Date();
    const maxIdleTime = 30 * 60 * 1000; // 30 minutes

    // Clean up idle sessions
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now.getTime() - session.lastActivity.getTime() > maxIdleTime) {
        await this.endSession(sessionId);
        this.sessions.delete(sessionId);
      }
    }

    // Clean up stale file locks
    for (const [fileId, lock] of this.fileLocks.entries()) {
      if (now.getTime() - lock.timestamp.getTime() > maxIdleTime) {
        this.fileLocks.delete(fileId);
        const file = this.files.get(fileId);
        if (file) {
          file.locked = false;
          file.lockedBy = undefined;
          file.lockedAt = undefined;
        }
      }
    }

    await this.saveMetadata();
  }
}