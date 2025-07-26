import { SubAgentManager, DEFAULT_AGENT_CONFIGS, AgentRole } from '../sub-agent-manager';
import { promises as fs } from 'fs';
import path from 'path';
import { jest } from '@jest/globals';

// Mock the file system operations
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    readdir: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    unlink: jest.fn(),
  }
}));

// Mock the claude-sdk module
jest.mock('../claude-sdk', () => ({
  executeClaudeQuery: jest.fn().mockResolvedValue({
    messages: [],
    result: 'Mock task result',
    sessionId: 'mock-session-id',
    totalCostUsd: 0.01,
    durationMs: 1000,
    numTurns: 1
  })
}));

const mockFs = fs as jest.Mocked<typeof fs>;

describe('SubAgentManager', () => {
  let manager: SubAgentManager;
  const testProjectRoot = '/test/project';

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new SubAgentManager(testProjectRoot);
  });

  describe('initialization', () => {
    it('should create agents directory and load existing agents', async () => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue(['product-manager.md', 'frontend-developer.md'] as string[]);
      mockFs.readFile
        .mockResolvedValueOnce(`---
name: product-manager
description: Test PM agent
tools: Read, Write
---
Test system prompt for PM`)
        .mockResolvedValueOnce(`---
name: frontend-developer
description: Test FE agent
tools: Read, Write, Edit
---
Test system prompt for FE`);

      await manager.initialize();

      expect(mockFs.mkdir).toHaveBeenCalledWith(
        path.join(testProjectRoot, '.claude', 'agents'),
        { recursive: true }
      );
      expect(mockFs.readdir).toHaveBeenCalled();
      expect(mockFs.readFile).toHaveBeenCalledTimes(2);

      const agents = manager.getAvailableAgents();
      expect(agents).toHaveLength(2);
      expect(agents[0].name).toBe('product-manager');
      expect(agents[1].name).toBe('frontend-developer');
    });

    it('should handle missing agents directory gracefully', async () => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.readdir.mockRejectedValue(new Error('Directory not found'));

      await expect(manager.initialize()).resolves.not.toThrow();
      expect(mockFs.mkdir).toHaveBeenCalled();
    });
  });

  describe('agent management', () => {
    beforeEach(async () => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue([]);
      await manager.initialize();
    });

    it('should create a new sub-agent', async () => {
      const config = {
        name: 'test-agent',
        description: 'Test agent description',
        tools: ['Read', 'Write'],
        systemPrompt: 'Test system prompt'
      };

      mockFs.writeFile.mockResolvedValue(undefined);

      await manager.createSubAgent(config);

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        path.join(testProjectRoot, '.claude', 'agents', 'test-agent.md'),
        expect.stringContaining('name: test-agent')
      );

      const agent = manager.getAgent('test-agent');
      expect(agent).toEqual(config);
    });

    it('should update an existing sub-agent', async () => {
      const originalConfig = {
        name: 'test-agent',
        description: 'Original description',
        systemPrompt: 'Original prompt'
      };

      mockFs.writeFile.mockResolvedValue(undefined);
      await manager.createSubAgent(originalConfig);

      const updates = {
        description: 'Updated description',
        tools: ['Read', 'Write', 'Edit']
      };

      await manager.updateSubAgent('test-agent', updates);

      const updatedAgent = manager.getAgent('test-agent');
      expect(updatedAgent?.description).toBe('Updated description');
      expect(updatedAgent?.tools).toEqual(['Read', 'Write', 'Edit']);
      expect(updatedAgent?.systemPrompt).toBe('Original prompt'); // Should remain unchanged
    });

    it('should delete a sub-agent', async () => {
      const config = {
        name: 'test-agent',
        description: 'Test agent',
        systemPrompt: 'Test prompt'
      };

      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.unlink.mockResolvedValue(undefined);

      await manager.createSubAgent(config);
      expect(manager.getAgent('test-agent')).toBeDefined();

      await manager.deleteSubAgent('test-agent');

      expect(mockFs.unlink).toHaveBeenCalledWith(
        path.join(testProjectRoot, '.claude', 'agents', 'test-agent.md')
      );
      expect(manager.getAgent('test-agent')).toBeUndefined();
    });
  });

  describe('task delegation', () => {
    beforeEach(async () => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue([]);
      await manager.initialize();

      // Create a test agent
      await manager.createSubAgent({
        name: 'test-agent',
        description: 'Test agent',
        systemPrompt: 'Test prompt',
        tools: ['Read', 'Write']
      });
    });

    it('should delegate task to existing agent', async () => {
      const result = await manager.delegateTask('test-agent', 'Test task description');

      expect(result.success).toBe(true);
      expect(result.result).toBe('Mock task result');
      expect(result.sessionId).toBe('mock-session-id');
    });

    it('should handle delegation to non-existent agent', async () => {
      const result = await manager.delegateTask('non-existent-agent', 'Test task');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Sub-agent non-existent-agent not found');
    });
  });

  describe('communication', () => {
    beforeEach(async () => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue([]);
      await manager.initialize();
    });

    it('should send and retrieve messages', async () => {
      const message = {
        from: 'agent1',
        to: 'agent2',
        type: 'task_assignment' as const,
        content: { task: 'Test task' },
        sessionId: 'session-123'
      };

      await manager.sendMessage(message);

      const messages = manager.getMessages('agent1');
      expect(messages).toHaveLength(1);
      expect(messages[0].from).toBe('agent1');
      expect(messages[0].to).toBe('agent2');
    });

    it('should create communication threads', () => {
      const participants = ['agent1', 'agent2', 'agent3'];
      const topic = 'Feature development coordination';

      const threadId = manager.createThread(participants, topic);

      expect(threadId).toBeDefined();
      expect(typeof threadId).toBe('string');

      const messages = manager.getMessages(undefined, threadId);
      expect(messages).toHaveLength(1);
      expect(messages[0].content.action).toBe('thread_created');
    });
  });

  describe('default configurations', () => {
    it('should have all required agent roles in default configs', () => {
      const expectedRoles = Object.values(AgentRole);
      const configRoles = Object.keys(DEFAULT_AGENT_CONFIGS);

      expectedRoles.forEach(role => {
        expect(configRoles).toContain(role);
      });
    });

    it('should have valid configuration structure for all default agents', () => {
      Object.values(DEFAULT_AGENT_CONFIGS).forEach(config => {
        expect(config.name).toBeDefined();
        expect(config.description).toBeDefined();
        expect(config.systemPrompt).toBeDefined();
        expect(config.tools).toBeDefined();
        expect(Array.isArray(config.tools)).toBe(true);
      });
    });
  });
});