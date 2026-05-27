/**
 * Sync Queue Pure Unit Tests
 * Tests sync queue logic without IndexedDB dependencies
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest';

// ============================================================
// Types
// ============================================================

interface SyncOperation {
  id: string;
  entityType: string;
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  payload: Record<string, unknown>;
  timestamp: number;
  retries: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

interface QueueStats {
  pending: number;
  inProgress: number;
  completed: number;
  failed: number;
}

// ============================================================
// Pure functions
// ============================================================

function makeOp(partial: Partial<SyncOperation> & { entityType: string; entityId: string; operation: SyncOperation['operation'] }): SyncOperation {
  return {
    id: partial.id ?? 'test_id',
    entityType: partial.entityType,
    entityId: partial.entityId,
    operation: partial.operation,
    payload: partial.payload ?? {},
    timestamp: partial.timestamp ?? 1000000,
    retries: partial.retries ?? 0,
    status: partial.status ?? 'pending',
  };
}

function op(entityType: string, entityId: string, operation: SyncOperation['operation'], status: SyncOperation['status'] = 'pending', timestamp = 1000, retries = 0): SyncOperation {
  return makeOp({ entityType, entityId, operation, status, timestamp, retries });
}

function canRetry(op: SyncOperation, maxRetries = 3): boolean {
  return op.retries < maxRetries && op.status === 'failed';
}

function incrementRetry(op: SyncOperation): SyncOperation {
  return { ...op, retries: op.retries + 1, status: 'pending' };
}

function markInProgress(op: SyncOperation): SyncOperation {
  return { ...op, status: 'in_progress' };
}

function markCompleted(op: SyncOperation): SyncOperation {
  return { ...op, status: 'completed' };
}

function markFailed(op: SyncOperation): SyncOperation {
  return { ...op, status: 'failed' };
}

function filterByStatus(ops: SyncOperation[], status: SyncOperation['status']): SyncOperation[] {
  return ops.filter(o => o.status === status);
}

function filterByEntity(ops: SyncOperation[], entityType: string, entityId?: string): SyncOperation[] {
  return ops.filter(o => o.entityType === entityType && (!entityId || o.entityId === entityId));
}

function sortByTimestampOldestFirst(ops: SyncOperation[]): SyncOperation[] {
  return [...ops].sort((a, b) => a.timestamp - b.timestamp);
}

function sortByTimestampNewestFirst(ops: SyncOperation[]): SyncOperation[] {
  return [...ops].sort((a, b) => b.timestamp - a.timestamp);
}

function getQueueStats(ops: SyncOperation[]): QueueStats {
  return {
    pending: ops.filter(o => o.status === 'pending').length,
    inProgress: ops.filter(o => o.status === 'in_progress').length,
    completed: ops.filter(o => o.status === 'completed').length,
    failed: ops.filter(o => o.status === 'failed').length,
  };
}

function getPendingOperations(ops: SyncOperation[]): SyncOperation[] {
  return sortByTimestampOldestFirst(filterByStatus(ops, 'pending'));
}

function getRetryableOperations(ops: SyncOperation[], maxRetries = 3): SyncOperation[] {
  return ops.filter(o => canRetry(o, maxRetries));
}

function calculateBackoffMs(op: SyncOperation, baseMs = 1000, maxMs = 30000): number {
  const exp = Math.min(baseMs * Math.pow(2, op.retries), maxMs);
  const jitter = exp * 0.1 * Math.random();
  return Math.round(exp + jitter);
}

function deduplicateByEntity(ops: SyncOperation[]): SyncOperation[] {
  const map = new Map<string, SyncOperation>();
  for (const o of ops) {
    const key = `${o.entityType}:${o.entityId}`;
    if (!map.has(key) || map.get(key)!.timestamp < o.timestamp) {
      map.set(key, o);
    }
  }
  return Array.from(map.values());
}

function mergeQueues(local: SyncOperation[], remote: SyncOperation[]): SyncOperation[] {
  return deduplicateByEntity([...local, ...remote]);
}

function hasPendingOperation(ops: SyncOperation[], entityType: string, entityId: string): boolean {
  return ops.some(o => o.entityType === entityType && o.entityId === entityId && o.status === 'pending');
}

function getProcessableOperations(ops: SyncOperation[], maxRetries = 3): SyncOperation[] {
  const pending = getPendingOperations(ops);
  const retryable = getRetryableOperations(ops, maxRetries);
  return deduplicateByEntity([...pending, ...retryable]);
}

// ============================================================
// Tests
// ============================================================

describe('SyncQueue Pure Logic', () => {
  const sampleOps = [
    op('article', 'a1', 'create', 'pending', 3000),
    op('article', 'a2', 'update', 'in_progress', 2000),
    op('article', 'a1', 'delete', 'completed', 1000),
    op('user', 'u1', 'update', 'failed', 0, 2),
    op('user', 'u2', 'create', 'pending', 4000),
    op('article', 'a3', 'update', 'failed', 500, 1),
  ];

  describe('canRetry', () => {
    it('should return true when failed and below max retries', () => {
      expect(canRetry(op('article', 'a1', 'create', 'failed', 0, 2), 3)).toBe(true);
    });
    it('should return false when at max retries', () => {
      expect(canRetry(op('article', 'a1', 'create', 'failed', 0, 3), 3)).toBe(false);
    });
    it('should return false when not failed', () => {
      expect(canRetry(op('article', 'a1', 'create', 'pending', 0, 2), 3)).toBe(false);
    });
  });

  describe('incrementRetry', () => {
    it('should increment retries and reset to pending', () => {
      const r = incrementRetry(op('article', 'a1', 'create', 'failed', 0, 1));
      expect(r.retries).toBe(2);
      expect(r.status).toBe('pending');
    });
  });

  describe('status transitions', () => {
    it('markInProgress', () => expect(markInProgress(op('a', '1', 'create')).status).toBe('in_progress'));
    it('markCompleted', () => expect(markCompleted(op('a', '1', 'create')).status).toBe('completed'));
    it('markFailed', () => expect(markFailed(op('a', '1', 'create')).status).toBe('failed'));
  });

  describe('filterByStatus', () => {
    it('should filter pending', () => {
      const r = filterByStatus(sampleOps, 'pending');
      expect(r.length).toBe(2);
    });
    it('should filter in_progress', () => {
      expect(filterByStatus(sampleOps, 'in_progress').length).toBe(1);
    });
    it('should filter completed', () => {
      expect(filterByStatus(sampleOps, 'completed').length).toBe(1);
    });
    it('should filter failed', () => {
      expect(filterByStatus(sampleOps, 'failed').length).toBe(2);
    });
  });

  describe('filterByEntity', () => {
    it('should filter by type', () => {
      expect(filterByEntity(sampleOps, 'article').length).toBe(4);
    });
    it('should filter by type and id', () => {
      expect(filterByEntity(sampleOps, 'article', 'a1').length).toBe(2);
    });
  });

  describe('sortByTimestamp', () => {
    it('should sort oldest first', () => {
      const r = sortByTimestampOldestFirst(sampleOps);
      for (let i = 1; i < r.length; i++) {
        expect(r[i - 1].timestamp).toBeLessThanOrEqual(r[i].timestamp);
      }
    });
    it('should sort newest first', () => {
      const r = sortByTimestampNewestFirst(sampleOps);
      for (let i = 1; i < r.length; i++) {
        expect(r[i - 1].timestamp).toBeGreaterThanOrEqual(r[i].timestamp);
      }
    });
  });

  describe('getQueueStats', () => {
    it('should return correct counts', () => {
      const s = getQueueStats(sampleOps);
      expect(s.pending).toBe(2);
      expect(s.inProgress).toBe(1);
      expect(s.completed).toBe(1);
      expect(s.failed).toBe(2);
    });
  });

  describe('getPendingOperations', () => {
    it('should return pending sorted oldest first', () => {
      const r = getPendingOperations(sampleOps);
      expect(r.every(o => o.status === 'pending')).toBe(true);
      for (let i = 1; i < r.length; i++) {
        expect(r[i - 1].timestamp).toBeLessThanOrEqual(r[i].timestamp);
      }
    });
  });

  describe('getRetryableOperations', () => {
    it('should return failed below max retries', () => {
      expect(getRetryableOperations(sampleOps, 3).length).toBe(2);
    });
    it('should exclude at max retries', () => {
      // maxRetries=1 means only retries < 1 (i.e., retries=0) pass. sampleOps has no failed ops with retries=0
      expect(getRetryableOperations(sampleOps, 1).length).toBe(0);
    });
  });

  describe('calculateBackoffMs', () => {
    it('should increase with retries', () => {
      const b0 = calculateBackoffMs(op('a', '1', 'c', 'failed', 0, 0), 1000);
      const b1 = calculateBackoffMs(op('a', '1', 'c', 'failed', 0, 1), 1000);
      const b2 = calculateBackoffMs(op('a', '1', 'c', 'failed', 0, 2), 1000);
      expect(b1).toBeGreaterThan(b0);
      expect(b2).toBeGreaterThan(b1);
    });
    it('should cap at maxMs', () => {
      // With very high retries, exp caps at maxMs, jitter adds up to 10%
      const b = calculateBackoffMs(op('a', '1', 'c', 'failed', 0, 10), 1000, 5000);
      expect(b).toBeLessThanOrEqual(5500); // maxMs + 10% jitter
    });
  });

  describe('deduplicateByEntity', () => {
    it('should keep most recent per entity', () => {
      const ops = [
        op('article', 'a1', 'create', 'completed', 1000),
        op('article', 'a1', 'update', 'pending', 2000),
      ];
      const r = deduplicateByEntity(ops);
      expect(r.length).toBe(1);
      expect(r[0].operation).toBe('update');
    });
  });

  describe('mergeQueues', () => {
    it('should merge and deduplicate', () => {
      const local = [op('article', 'a1', 'create', 'pending', 1000)];
      const remote = [op('article', 'a1', 'update', 'pending', 2000), op('article', 'a2', 'create', 'pending', 1500)];
      const r = mergeQueues(local, remote);
      expect(r.length).toBe(2);
      expect(r.find(o => o.entityId === 'a1')?.operation).toBe('update');
    });
  });

  describe('hasPendingOperation', () => {
    it('should detect pending for entity', () => {
      expect(hasPendingOperation(sampleOps, 'article', 'a1')).toBe(true);
      expect(hasPendingOperation(sampleOps, 'user', 'u3')).toBe(false);
    });
  });

  describe('getProcessableOperations', () => {
    it('should return pending and retryable', () => {
      const r = getProcessableOperations(sampleOps, 3);
      expect(r.length).toBe(4); // 2 pending + 2 retryable
      expect(r.every(o => o.status === 'pending' || o.status === 'failed')).toBe(true);
    });
  });

  describe('sync queue pipeline', () => {
    it('should complete full pipeline', () => {
      const r = getProcessableOperations(sampleOps, 3);
      const sorted = sortByTimestampOldestFirst(r);
      const deduped = deduplicateByEntity(sorted);
      expect(deduped.every(o => o.status === 'pending' || o.status === 'failed')).toBe(true);
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i - 1].timestamp).toBeLessThanOrEqual(sorted[i].timestamp);
      }
    });
  });
});