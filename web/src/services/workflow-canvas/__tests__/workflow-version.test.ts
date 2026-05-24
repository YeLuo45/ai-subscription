/**
 * Unit tests for workflow-version.ts
 * Tests version history management for workflows with auto-prune at 20 versions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createVersion,
  getVersions,
  rollback,
  getVersion,
  deleteVersionsByWorkflow,
  clearAllVersions,
  resetVersionDB,
} from '../workflow-version';

// Helper to create mock request with callbacks
function createMockRequest(result?: unknown, error?: Error | null): {
  onsuccess: ((event: Event) => void) | null;
  onerror: ((event: Event) => void) | null;
  result: unknown;
  error: Error | null;
} {
  return {
    onsuccess: null,
    onerror: null,
    result: result ?? undefined,
    error: error ?? null,
  };
}

// Mock object store
const mockObjectStore = {
  add: vi.fn(),
  put: vi.fn(),
  get: vi.fn(),
  getAll: vi.fn(),
  delete: vi.fn(),
  clear: vi.fn(),
  index: vi.fn(),
  openCursor: vi.fn(),
  count: vi.fn(),
};

// Mock database
let mockDB: IDBDatabase;
let mockTransaction: IDBTransaction;

function setupMockDB(): void {
  const mockObjectStoreInstance = {
    add: mockObjectStore.add,
    put: mockObjectStore.put,
    get: mockObjectStore.get,
    getAll: mockObjectStore.getAll,
    delete: mockObjectStore.delete,
    clear: mockObjectStore.clear,
    index: mockObjectStore.index,
    openCursor: mockObjectStore.openCursor,
    count: mockObjectStore.count,
  } as unknown as IDBObjectStore;

  mockTransaction = {
    objectStore: vi.fn(() => mockObjectStoreInstance),
  } as unknown as IDBTransaction;

  mockDB = {
    transaction: vi.fn(() => mockTransaction),
    objectStoreNames: {
      contains: vi.fn(() => true),
    },
  } as unknown as IDBDatabase;
}

function createMockIDBOpenRequest(db: IDBDatabase): IDBOpenDBRequest {
  return {
    onerror: null,
    onsuccess: null,
    onupgradeneeded: null,
    result: db,
    error: null,
    readyState: 'done',
    transaction: null,
    source: null,
  } as unknown as IDBOpenDBRequest;
}

// Helper to trigger success on request
function triggerSuccess(request: { onsuccess: ((event: Event) => void) | null; result?: unknown }, result?: unknown): void {
  if (request.onsuccess && typeof request.onsuccess === 'function') {
    Object.defineProperty(request, 'result', { value: result ?? request.result, writable: true });
    request.onsuccess({} as Event);
  }
}

// Helper to trigger error on request
function triggerError(request: { onerror: ((event: Event) => void) | null; error: Error | null }, errorMsg = 'Operation failed'): void {
  if (request.onerror && typeof request.onerror === 'function') {
    Object.defineProperty(request, 'error', { value: new Error(errorMsg), writable: true });
    request.onerror({} as Event);
  }
}

describe('workflow-version', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetVersionDB();
    setupMockDB();

    // Mock global indexedDB
    Object.defineProperty(global, 'indexedDB', {
      value: {
        open: vi.fn(() => createMockIDBOpenRequest(mockDB)),
      },
      writable: true,
    });

    // Reset mockObjectStore
    mockObjectStore.add.mockImplementation(() => createMockRequest());
    mockObjectStore.put.mockImplementation(() => createMockRequest());
    mockObjectStore.get.mockImplementation(() => createMockRequest());
    mockObjectStore.getAll.mockImplementation(() => createMockRequest());
    mockObjectStore.delete.mockImplementation(() => createMockRequest());
    mockObjectStore.clear.mockImplementation(() => createMockRequest());
    mockObjectStore.index.mockImplementation(() => ({
      get: vi.fn(() => createMockRequest()),
      count: vi.fn(() => createMockRequest(0)),
    }));
    mockObjectStore.openCursor.mockImplementation(() => createMockRequest());
    mockObjectStore.count.mockImplementation(() => createMockRequest(0));
  });

  describe('createVersion', () => {
    it('should create a new version with auto-incremented version number', async () => {
      const nodes = [
        { id: 'node1', type: 'start' as const, x: 100, y: 100 },
        { id: 'node2', type: 'task' as const, x: 200, y: 200, label: 'Test Task' },
      ];

      // Mock count to return 0 (no existing versions)
      mockObjectStore.index.mockReturnValue({
        count: vi.fn(() => createMockRequest(0)),
        get: vi.fn(() => createMockRequest()),
      });

      mockObjectStore.add.mockImplementation((data) => {
        return createMockRequest(data);
      });

      await createVersion('workflow_123', nodes);

      expect(mockObjectStore.add).toHaveBeenCalled();
      const addedVersion = mockObjectStore.add.mock.calls[0][0];
      expect(addedVersion.workflowId).toBe('workflow_123');
      expect(addedVersion.version).toBe(1);
      expect(addedVersion.definition).toEqual(nodes);
    });

    it('should increment version number for subsequent versions', async () => {
      const nodes = [{ id: 'node1', type: 'task' as const, x: 100, y: 100 }];

      // Mock count to return 2 (existing versions)
      mockObjectStore.index.mockReturnValue({
        count: vi.fn(() => createMockRequest(2)),
        get: vi.fn(() => createMockRequest()),
      });

      mockObjectStore.add.mockImplementation((data) => {
        return createMockRequest(data);
      });

      await createVersion('workflow_123', nodes);

      const addedVersion = mockObjectStore.add.mock.calls[0][0];
      expect(addedVersion.version).toBe(3);
    });

    it('should prune oldest version when at max (20)', async () => {
      const nodes = [{ id: 'node1', type: 'task' as const, x: 100, y: 100 }];

      // Mock count to return 20 (at max)
      mockObjectStore.index.mockReturnValue({
        count: vi.fn(() => createMockRequest(20)),
        get: vi.fn(() => createMockRequest()),
      });

      // Mock cursor for pruning - return oldest version
      const oldestVersion = {
        id: 'version_oldest',
        workflowId: 'workflow_123',
        version: 1,
        definition: [],
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      mockObjectStore.openCursor.mockImplementation(() => {
        const req = createMockRequest();
        req.onsuccess = null;
        return req;
      });

      // Simulate cursor iteration
      const cursorMock = {
        delete: vi.fn(() => createMockRequest()),
        continue: vi.fn(),
        value: oldestVersion,
      };

      // When openCursor is called, trigger success with cursor
      mockObjectStore.openCursor.mockImplementation(() => {
        const req = createMockRequest();
        // Simulate the cursor result
        setTimeout(() => {
          if (req.onsuccess) {
            Object.defineProperty(req, 'result', { value: cursorMock, writable: true });
            req.onsuccess({} as Event);
          }
        }, 0);
        return req;
      });

      mockObjectStore.add.mockImplementation((data) => createMockRequest(data));

      await createVersion('workflow_123', nodes);

      // After pruning and adding, add should be called
      expect(mockObjectStore.add).toHaveBeenCalled();
    });

    it('should reject when add operation fails', async () => {
      mockObjectStore.index.mockReturnValue({
        count: vi.fn(() => createMockRequest(0)),
        get: vi.fn(() => createMockRequest()),
      });

      const req = createMockRequest();
      mockObjectStore.add.mockImplementation(() => req);
      triggerError(req, 'Add failed');

      await expect(createVersion('workflow_123', [])).rejects.toThrow('Add failed');
    });
  });

  describe('getVersions', () => {
    it('should return all versions for a workflow sorted by version descending', async () => {
      const versions = [
        { id: 'v1', workflowId: 'workflow_123', version: 1, definition: [], createdAt: '2024-01-01T00:00:00.000Z' },
        { id: 'v2', workflowId: 'workflow_123', version: 2, definition: [], createdAt: '2024-01-02T00:00:00.000Z' },
        { id: 'v3', workflowId: 'workflow_123', version: 3, definition: [], createdAt: '2024-01-03T00:00:00.000Z' },
      ];

      mockObjectStore.getAll.mockImplementation(() => createMockRequest(versions));

      const result = await getVersions('workflow_123');

      expect(result).toHaveLength(3);
      expect(result[0].version).toBe(3); // Descending order
      expect(result[2].version).toBe(1);
    });

    it('should return empty array when no versions exist', async () => {
      mockObjectStore.getAll.mockImplementation(() => createMockRequest([]));

      const result = await getVersions('workflow_123');

      expect(result).toEqual([]);
    });

    it('should reject when getAll operation fails', async () => {
      const req = createMockRequest();
      mockObjectStore.getAll.mockImplementation(() => req);
      triggerError(req, 'GetAll failed');

      await expect(getVersions('workflow_123')).rejects.toThrow('GetAll failed');
    });
  });

  describe('rollback', () => {
    it('should return definition of specified version', async () => {
      const version = {
        id: 'version_456',
        workflowId: 'workflow_123',
        version: 2,
        definition: [{ id: 'node1', type: 'task' as const, x: 100, y: 100 }],
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      mockObjectStore.get.mockImplementation(() => createMockRequest(version));

      const result = await rollback('version_456');

      expect(result).toEqual(version.definition);
    });

    it('should throw error when version not found', async () => {
      mockObjectStore.get.mockImplementation(() => createMockRequest(undefined));

      await expect(rollback('nonexistent')).rejects.toThrow('Version nonexistent not found');
    });

    it('should reject when get operation fails', async () => {
      const req = createMockRequest();
      mockObjectStore.get.mockImplementation(() => req);
      triggerError(req, 'Get failed');

      await expect(rollback('version_456')).rejects.toThrow('Get failed');
    });
  });

  describe('getVersion', () => {
    it('should return version when found', async () => {
      const version = {
        id: 'version_456',
        workflowId: 'workflow_123',
        version: 2,
        definition: [],
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      mockObjectStore.get.mockImplementation(() => createMockRequest(version));

      const result = await getVersion('version_456');

      expect(result).toEqual(version);
    });

    it('should return null when version not found', async () => {
      mockObjectStore.get.mockImplementation(() => createMockRequest(undefined));

      const result = await getVersion('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('deleteVersionsByWorkflow', () => {
    it('should delete all versions for a workflow using cursor', async () => {
      // Mock cursor iteration
      let callCount = 0;
      const versions = [
        { id: 'v1', workflowId: 'workflow_123', version: 1, definition: [], createdAt: '2024-01-01T00:00:00.000Z' },
        { id: 'v2', workflowId: 'workflow_123', version: 2, definition: [], createdAt: '2024-01-02T00:00:00.000Z' },
      ];

      mockObjectStore.openCursor.mockImplementation(() => {
        const req = createMockRequest();
        setTimeout(() => {
          if (req.onsuccess) {
            if (callCount < versions.length) {
              const cursor = {
                delete: vi.fn(() => createMockRequest()),
                continue: vi.fn(),
                value: versions[callCount],
              };
              Object.defineProperty(req, 'result', { value: cursor, writable: true });
              callCount++;
            } else {
              Object.defineProperty(req, 'result', { value: null, writable: true });
            }
            req.onsuccess({} as Event);
          }
        }, 0);
        return req;
      });

      await deleteVersionsByWorkflow('workflow_123');

      expect(mockObjectStore.openCursor).toHaveBeenCalled();
    });

    it('should resolve even when no versions exist', async () => {
      mockObjectStore.openCursor.mockImplementation(() => {
        const req = createMockRequest();
        setTimeout(() => {
          if (req.onsuccess) {
            Object.defineProperty(req, 'result', { value: null, writable: true });
            req.onsuccess({} as Event);
          }
        }, 0);
        return req;
      });

      await expect(deleteVersionsByWorkflow('workflow_123')).resolves.toBeUndefined();
    });
  });

  describe('clearAllVersions', () => {
    it('should clear all versions', async () => {
      mockObjectStore.clear.mockImplementation(() => createMockRequest());

      await clearAllVersions();

      expect(mockObjectStore.clear).toHaveBeenCalled();
    });

    it('should reject when clear operation fails', async () => {
      const req = createMockRequest();
      mockObjectStore.clear.mockImplementation(() => req);
      triggerError(req, 'Clear failed');

      await expect(clearAllVersions()).rejects.toThrow('Clear failed');
    });
  });
});