/**
 * Workflow Engine Unit Tests
 * Tests for workflow parsing and execution
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock workflow dependencies
vi.mock('../../db/workflowDB', () => ({
  getAllRules: vi.fn().mockResolvedValue([]),
  saveWorkflow: vi.fn().mockResolvedValue(undefined),
  updateWorkflow: vi.fn().mockResolvedValue(undefined),
  deleteWorkflow: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../services/workflow/scheduler', () => ({
  scheduleWorkflow: vi.fn(),
  unscheduleWorkflow: vi.fn(),
  rescheduleAllWorkflows: vi.fn(),
  startScheduler: vi.fn(),
}));

vi.mock('../../services/workflow/executor', () => ({
  executeActions: vi.fn().mockResolvedValue({ success: true }),
}));

describe('WorkflowEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('WorkflowEngine.getInstance', () => {
    it('should return a singleton instance', async () => {
      const { WorkflowEngine } = await import('../../services/workflow/engine');
      const instance1 = WorkflowEngine.getInstance();
      const instance2 = WorkflowEngine.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('Workflow Instance Creation', () => {
    it('should create workflow with valid structure', async () => {
      const { WorkflowEngine } = await import('../../services/workflow/engine');
      const engine = WorkflowEngine.getInstance();
      
      const workflow = {
        name: 'Test Workflow',
        description: 'Test description',
        enabled: true,
        triggers: [{
          type: 'article-matched' as const,
          conditions: { keyword: 'test' },
        }],
        actions: [{ type: 'send-notification' as const, channel: 'telegram' as const }],
      };
      
      const created = await engine.createWorkflow(workflow);
      
      expect(created.id).toBeDefined();
      expect(created.name).toBe('Test Workflow');
      expect(created.createdAt).toBeDefined();
      expect(created.updatedAt).toBeDefined();
    });
  });

  describe('triggerWorkflow', () => {
    it('should reject workflow not found', async () => {
      const { WorkflowEngine } = await import('../../services/workflow/engine');
      const engine = WorkflowEngine.getInstance();
      
      const result = await engine.triggerWorkflow('non-existent-id', {
        articleId: '123',
        title: 'Test Article',
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('Workflow CRUD', () => {
    it('should get all workflows', async () => {
      const { WorkflowEngine } = await import('../../services/workflow/engine');
      const engine = WorkflowEngine.getInstance();
      
      const workflows = engine.getWorkflows();
      expect(Array.isArray(workflows)).toBe(true);
    });

    it('should get workflow by id', async () => {
      const { WorkflowEngine } = await import('../../services/workflow/engine');
      const engine = WorkflowEngine.getInstance();
      
      const result = engine.getWorkflow('non-existent');
      expect(result).toBeUndefined();
    });
  });

  describe('Article Matching', () => {
    it('should match article with keyword condition', async () => {
      const { WorkflowEngine } = await import('../../services/workflow/engine');
      const engine = WorkflowEngine.getInstance();
      
      // Create a workflow with keyword trigger
      const workflow = await engine.createWorkflow({
        name: 'Keyword Matcher',
        description: 'Matches articles with specific keyword',
        enabled: true,
        triggers: [{
          type: 'article-matched',
          conditions: { keyword: 'important' },
        }],
        actions: [{ type: 'send-notification', channel: 'telegram', template: 'Found important article' }],
      });
      
      // Test matching
      const ctx = {
        articleId: 'article-1',
        title: 'This is an important article',
        description: 'Content about something important',
        content: 'Full article content here',
      };
      
      const result = await engine.triggerWorkflow(workflow.id, ctx);
      expect(result.success).toBe(true);
    });
  });

  describe('getInstances', () => {
    it('should return workflow instances', () => {
      const { WorkflowEngine } = await import('../../services/workflow/engine');
      const engine = WorkflowEngine.getInstance();
      
      const instances = engine.getInstances();
      expect(Array.isArray(instances)).toBe(true);
    });
  });
});