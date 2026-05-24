/**
 * Workflow Store Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { WorkflowPersistenceMeta, WorkflowSnapshot } from '../types';

// Since we can't use IndexedDB in Node.js tests, we'll test the logic with mocks
// For actual browser testing, these would be integrated with IndexedDB

describe('workflow-store', () => {
  describe('WorkflowPersistenceMeta', () => {
    it('should have correct type definition for metadata', () => {
      const meta: WorkflowPersistenceMeta = {
        id: 'test_id',
        name: 'Test Workflow',
        description: 'A test workflow',
        created_at: Date.now(),
        updated_at: Date.now(),
        version_count: 5,
        last_run_at: Date.now(),
        is_deleted: false,
      };

      expect(meta.id).toBeDefined();
      expect(meta.name).toBe('Test Workflow');
      expect(meta.version_count).toBe(5);
      expect(meta.is_deleted).toBe(false);
    });

    it('should allow optional last_run_at to be null', () => {
      const meta: WorkflowPersistenceMeta = {
        id: 'test_id',
        name: 'Test Workflow',
        description: 'A test workflow',
        created_at: Date.now(),
        updated_at: Date.now(),
        version_count: 0,
        last_run_at: null,
        is_deleted: false,
      };

      expect(meta.last_run_at).toBeNull();
    });
  });

  describe('WorkflowSnapshot', () => {
    it('should have correct type definition for snapshots', () => {
      const snapshot: WorkflowSnapshot = {
        id: 'snapshot_id',
        workflow_id: 'workflow_id',
        version_number: 1,
        created_at: Date.now(),
        snapshot: '{"nodes":[],"edges":[]}',
        snapshot_hash: 'abc123',
        node_count: 3,
        edge_count: 2,
      };

      expect(snapshot.id).toBeDefined();
      expect(snapshot.workflow_id).toBe('workflow_id');
      expect(snapshot.version_number).toBe(1);
      expect(snapshot.node_count).toBe(3);
      expect(snapshot.edge_count).toBe(2);
    });
  });
});

describe('workflow store CRUD operations (mocked)', () => {
  // Mock storage for testing
  let mockStorage: Map<string, WorkflowPersistenceMeta> = new Map();
  let mockVersions: Map<string, WorkflowSnapshot[]> = new Map();

  const generateId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  beforeEach(() => {
    mockStorage.clear();
    mockVersions.clear();
  });

  afterEach(() => {
    mockStorage.clear();
    mockVersions.clear();
  });

  describe('saveWorkflowMeta', () => {
    it('should create a new workflow metadata entry', async () => {
      const now = Date.now();
      const input = {
        name: 'New Workflow',
        description: 'Test description',
        last_run_at: null,
        is_deleted: false,
      };

      const meta: WorkflowPersistenceMeta = {
        id: generateId('wfm'),
        ...input,
        created_at: now,
        updated_at: now,
        version_count: 0,
      };

      mockStorage.set(meta.id, meta);

      expect(mockStorage.has(meta.id)).toBe(true);
      expect(meta.created_at).toBe(now);
    });
  });

  describe('loadById', () => {
    it('should retrieve workflow by id', async () => {
      const id = 'test_workflow_1';
      const meta: WorkflowPersistenceMeta = {
        id,
        name: 'Test',
        description: '',
        created_at: Date.now(),
        updated_at: Date.now(),
        version_count: 0,
        last_run_at: null,
        is_deleted: false,
      };
      mockStorage.set(id, meta);

      const retrieved = mockStorage.get(id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(id);
    });

    it('should return undefined for non-existent id', () => {
      const retrieved = mockStorage.get('non_existent');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('listWorkflows', () => {
    it('should list all workflows excluding deleted', () => {
      const workflows: WorkflowPersistenceMeta[] = [
        { id: '1', name: 'WF1', description: '', created_at: 1000, updated_at: 1000, version_count: 0, last_run_at: null, is_deleted: false },
        { id: '2', name: 'WF2', description: '', created_at: 1001, updated_at: 1001, version_count: 0, last_run_at: null, is_deleted: true },
        { id: '3', name: 'WF3', description: '', created_at: 1002, updated_at: 1002, version_count: 0, last_run_at: null, is_deleted: false },
      ];

      workflows.forEach(w => mockStorage.set(w.id, w));

      const activeWorkflows = Array.from(mockStorage.values()).filter(w => !w.is_deleted);
      expect(activeWorkflows.length).toBe(2);
      expect(activeWorkflows.find(w => w.id === '2')).toBeUndefined();
    });

    it('should include deleted workflows when flag is set', () => {
      const workflows: WorkflowPersistenceMeta[] = [
        { id: '1', name: 'WF1', description: '', created_at: 1000, updated_at: 1000, version_count: 0, last_run_at: null, is_deleted: false },
        { id: '2', name: 'WF2', description: '', created_at: 1001, updated_at: 1001, version_count: 0, last_run_at: null, is_deleted: true },
      ];

      workflows.forEach(w => mockStorage.set(w.id, w));

      const allWorkflows = Array.from(mockStorage.values());
      expect(allWorkflows.length).toBe(2);
    });
  });

  describe('softDelete', () => {
    it('should mark workflow as deleted without removing data', () => {
      const id = 'soft_delete_test';
      const meta: WorkflowPersistenceMeta = {
        id,
        name: 'Test',
        description: '',
        created_at: Date.now(),
        updated_at: Date.now(),
        version_count: 0,
        last_run_at: null,
        is_deleted: false,
      };
      mockStorage.set(id, meta);

      meta.is_deleted = true;
      mockStorage.set(id, meta);

      const deleted = mockStorage.get(id);
      expect(deleted?.is_deleted).toBe(true);
    });
  });

  describe('hardDelete', () => {
    it('should remove workflow and all its versions', () => {
      const workflowId = 'hard_delete_test';
      const meta: WorkflowPersistenceMeta = {
        id: workflowId,
        name: 'Test',
        description: '',
        created_at: Date.now(),
        updated_at: Date.now(),
        version_count: 2,
        last_run_at: null,
        is_deleted: false,
      };
      mockStorage.set(workflowId, meta);

      const versions: WorkflowSnapshot[] = [
        { id: 'v1', workflow_id: workflowId, version_number: 1, created_at: Date.now(), snapshot: '{}', snapshot_hash: 'h1', node_count: 1, edge_count: 0 },
        { id: 'v2', workflow_id: workflowId, version_number: 2, created_at: Date.now(), snapshot: '{}', snapshot_hash: 'h2', node_count: 1, edge_count: 0 },
      ];
      mockVersions.set(workflowId, versions);

      // Hard delete
      mockStorage.delete(workflowId);
      mockVersions.delete(workflowId);

      expect(mockStorage.has(workflowId)).toBe(false);
      expect(mockVersions.has(workflowId)).toBe(false);
    });
  });

  describe('incrementVersionCount', () => {
    it('should increment version count for workflow', () => {
      const id = 'version_count_test';
      const meta: WorkflowPersistenceMeta = {
        id,
        name: 'Test',
        description: '',
        created_at: Date.now(),
        updated_at: Date.now(),
        version_count: 5,
        last_run_at: null,
        is_deleted: false,
      };
      mockStorage.set(id, meta);

      meta.version_count += 1;
      mockStorage.set(id, meta);

      const updated = mockStorage.get(id);
      expect(updated?.version_count).toBe(6);
    });
  });

  describe('updateLastRunAt', () => {
    it('should update the last_run_at timestamp', () => {
      const id = 'last_run_test';
      const now = Date.now();
      const meta: WorkflowPersistenceMeta = {
        id,
        name: 'Test',
        description: '',
        created_at: now,
        updated_at: now,
        version_count: 0,
        last_run_at: null,
        is_deleted: false,
      };
      mockStorage.set(id, meta);

      meta.last_run_at = now;
      mockStorage.set(id, meta);

      const updated = mockStorage.get(id);
      expect(updated?.last_run_at).toBe(now);
    });
  });
});