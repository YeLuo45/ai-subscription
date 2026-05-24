/**
 * Unit tests for SyncQueue
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SyncQueue, type SyncOperation } from '../sync-queue';

// Mock IndexedDB
const mockStore = {
  getAll: vi.fn().mockResolvedValue([]),
  get: vi.fn().mockResolvedValue(undefined),
  put: vi.fn().mockResolvedValue(undefined),
  delete: vi.fn().mockResolvedValue(undefined),
  clear: vi.fn().mockResolvedValue(undefined),
  count: vi.fn().mockResolvedValue(0),
};

const mockDB = {
  transaction: vi.fn().mockReturnValue({
    objectStore: vi.fn().mockReturnValue(mockStore),
  }),
};

const mockRequest = {
  onsuccess: null as (() => void) | null,
  onerror: null as (() => void) | null,
  result: mockDB,
};

vi.stubGlobal('indexedDB', {
  open: vi.fn().mockReturnValue(mockRequest),
});

describe('SyncQueue', () => {
  let syncQueue: SyncQueue;

  const sampleOperation: Omit<SyncOperation, 'id' | 'timestamp' | 'retries'> = {
    entityType: 'article',
    entityId: 'article-123',
    operation: 'update',
    payload: { title: 'Updated Title' },
  };

  beforeEach(() => {
    syncQueue = new SyncQueue();
    vi.clearAllMocks();
  });

  describe('queueOperation', () => {
    it('should queue a new operation', async () => {
      const id = await syncQueue.queueOperation(
        sampleOperation.entityType,
        sampleOperation.entityId,
        sampleOperation.operation,
        sampleOperation.payload
      );

      expect(id).toBeTruthy();
      expect(id.startsWith('syncop_')).toBe(true);
      expect(mockStore.put).toHaveBeenCalled();
    });

    it('should store operation with correct properties', async () => {
      await syncQueue.queueOperation(
        sampleOperation.entityType,
        sampleOperation.entityId,
        sampleOperation.operation,
        sampleOperation.payload
      );

      const putCall = mockStore.put.mock.calls[0][0];
      expect(putCall.entityType).toBe('article');
      expect(putCall.entityId).toBe('article-123');
      expect(putCall.operation).toBe('update');
      expect(putCall.retries).toBe(0);
    });
  });

  describe('getPending', () => {
    it('should return empty array when no operations', async () => {
      const pending = await syncQueue.getPending();
      expect(pending).toEqual([]);
    });

    it('should return sorted operations by timestamp', async () => {
      await syncQueue.queueOperation('article', 'a', 'create', {});
      await syncQueue.queueOperation('article', 'b', 'create', {});
      await syncQueue.queueOperation('article', 'c', 'create', {});

      const pending = await syncQueue.getPending();
      expect(pending.length).toBe(3);
      expect(pending[0].entityId).toBe('a');
      expect(pending[1].entityId).toBe('b');
      expect(pending[2].entityId).toBe('c');
    });
  });

  describe('getPendingCount', () => {
    it('should return 0 for empty queue', async () => {
      const count = await syncQueue.getPendingCount();
      expect(count).toBe(0);
    });

    it('should return correct count', async () => {
      await syncQueue.queueOperation('article', 'a', 'create', {});
      await syncQueue.queueOperation('article', 'b', 'create', {});

      const count = await syncQueue.getPendingCount();
      expect(count).toBe(2);
    });
  });

  describe('processQueue', () => {
    it('should process all pending operations', async () => {
      await syncQueue.queueOperation('article', 'a', 'create', {});
      await syncQueue.queueOperation('article', 'b', 'create', {});

      const handler = vi.fn().mockResolvedValue({ success: true });
      const result = await syncQueue.processQueue(handler);

      expect(result.processed).toBe(2);
      expect(result.succeeded).toBe(2);
      expect(result.failed).toBe(0);
      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('should remove successful operations from queue', async () => {
      await syncQueue.queueOperation('article', 'a', 'create', {});
      await syncQueue.queueOperation('article', 'b', 'create', {});

      const handler = vi.fn().mockResolvedValue({ success: true });
      await syncQueue.processQueue(handler);

      const count = await syncQueue.getPendingCount();
      expect(count).toBe(0);
    });

    it('should mark failed operations', async () => {
      await syncQueue.queueOperation('article', 'a', 'create', {});
      await syncQueue.queueOperation('article', 'b', 'create', {});

      const handler = vi.fn()
        .mockResolvedValueOnce({ success: false, error: 'Network error' })
        .mockResolvedValueOnce({ success: true });

      const result = await syncQueue.processQueue(handler);

      expect(result.processed).toBe(2);
      expect(result.succeeded).toBe(1);
      expect(result.failed).toBe(1);
    });
  });

  describe('markFailed', () => {
    it('should increment retry count', async () => {
      const id = await syncQueue.queueOperation('article', 'a', 'create', {});
      await syncQueue.markFailed(id, 'Test error');

      const getCall = mockStore.get.mock.calls[0][0];
      expect(getCall).toBe(id);

      const putCall = mockStore.put.mock.calls[0][0];
      expect(putCall.retries).toBe(1);
      expect(putCall.lastError).toBe('Test error');
    });
  });

  describe('removeOperation', () => {
    it('should remove operation by id', async () => {
      const id = await syncQueue.queueOperation('article', 'a', 'create', {});
      await syncQueue.removeOperation(id);

      expect(mockStore.delete).toHaveBeenCalledWith(id);
    });
  });

  describe('clearQueue', () => {
    it('should clear all operations', async () => {
      await syncQueue.queueOperation('article', 'a', 'create', {});
      await syncQueue.queueOperation('article', 'b', 'create', {});
      await syncQueue.clearQueue();

      expect(mockStore.clear).toHaveBeenCalled();
    });
  });

  describe('getByEntityType', () => {
    it('should return operations filtered by entity type', async () => {
      await syncQueue.queueOperation('article', 'a', 'create', {});
      await syncQueue.queueOperation('subscription', 'b', 'create', {});
      await syncQueue.queueOperation('article', 'c', 'create', {});

      const articleOps = await syncQueue.getByEntityType('article');
      expect(articleOps.length).toBe(2);
      expect(articleOps.every(op => op.entityType === 'article')).toBe(true);
    });
  });

  describe('getByEntityId', () => {
    it('should return operations for specific entity', async () => {
      await syncQueue.queueOperation('article', 'article-1', 'create', {});
      await syncQueue.queueOperation('article', 'article-1', 'update', {});
      await syncQueue.queueOperation('article', 'article-2', 'create', {});

      const ops = await syncQueue.getByEntityId('article-1');
      expect(ops.length).toBe(2);
    });
  });

  describe('removeByEntityId', () => {
    it('should remove all operations for an entity', async () => {
      await syncQueue.queueOperation('article', 'article-1', 'create', {});
      await syncQueue.queueOperation('article', 'article-1', 'update', {});
      await syncQueue.removeByEntityId('article-1');

      const ops = await syncQueue.getByEntityId('article-1');
      expect(ops.length).toBe(0);
    });
  });
});

describe('SyncQueue singleton', () => {
  it('should return different instances when constructed directly', () => {
    const queue1 = new SyncQueue();
    const queue2 = new SyncQueue();
    expect(queue1).not.toBe(queue2);
  });
});