/**
 * Unit tests for workflow-storage.ts
 * Tests IndexedDB CRUD operations for workflows with SVGNode[] definition
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  saveWorkflow,
  loadWorkflow,
  listWorkflows,
  deleteWorkflow,
  renameWorkflow,
  clearAllWorkflows,
  resetDB,
} from '../workflow-storage';

describe('workflow-storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetDB();
  });

  describe('saveWorkflow', () => {
    it('should create a new workflow with generated ID', async () => {
      // Mock indexedDB
      const mockDB = {
        transaction: vi.fn(() => ({
          objectStore: vi.fn(() => ({
            index: vi.fn(() => ({
              get: vi.fn((name) => {
                const req = { onsuccess: null, onerror: null };
                setTimeout(() => req.onsuccess?.({}), 0);
                return req;
              }),
            })),
            add: vi.fn((data) => {
              const req = { onsuccess: null, onerror: null };
              setTimeout(() => req.onsuccess?.({}), 0);
              return req;
            }),
            put: vi.fn(),
          })),
        })),
        objectStoreNames: { contains: () => true },
      };

      Object.defineProperty(global, 'indexedDB', {
        value: { open: vi.fn(() => {
          const req = { onsuccess: null, onerror: null, onupgradeneeded: null, result: mockDB, error: null };
          setTimeout(() => req.onsuccess?.({}), 0);
          return req;
        })},
      });

      const nodes = [
        { id: 'node1', type: 'start' as const, x: 100, y: 100 },
        { id: 'node2', type: 'task' as const, x: 200, y: 200, label: 'Test Task' },
      ];

      const id = await saveWorkflow('Test Workflow', nodes);

      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      expect(id.startsWith('workflow_')).toBe(true);
    });

    it('should update existing workflow when name exists', async () => {
      const existingWorkflow = {
        id: 'workflow_existing',
        name: 'Existing Workflow',
        definition: [{ id: 'node1', type: 'start' as const, x: 0, y: 0 }],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      const mockDB = {
        transaction: vi.fn(() => ({
          objectStore: vi.fn(() => ({
            index: vi.fn(() => ({
              get: vi.fn((name) => {
                const req = { onsuccess: null, onerror: null, result: existingWorkflow };
                setTimeout(() => req.onsuccess?.({}), 0);
                return req;
              }),
            })),
            add: vi.fn(),
            put: vi.fn((data) => {
              const req = { onsuccess: null, onerror: null };
              setTimeout(() => req.onsuccess?.({}), 0);
              return req;
            }),
          })),
        })),
        objectStoreNames: { contains: () => true },
      };

      Object.defineProperty(global, 'indexedDB', {
        value: { open: vi.fn(() => {
          const req = { onsuccess: null, onerror: null, onupgradeneeded: null, result: mockDB, error: null };
          setTimeout(() => req.onsuccess?.({}), 0);
          return req;
        })},
      });

      const nodes = [{ id: 'node2', type: 'task' as const, x: 300, y: 300 }];
      const id = await saveWorkflow('Existing Workflow', nodes);

      expect(id).toBe('workflow_existing');
    });

    it('should reject when add operation fails', async () => {
      const mockDB = {
        transaction: vi.fn(() => ({
          objectStore: vi.fn(() => ({
            index: vi.fn(() => ({
              get: vi.fn(() => {
                const req = { onsuccess: null, onerror: null, result: undefined };
                setTimeout(() => req.onsuccess?.({}), 0);
                return req;
              }),
            })),
            add: vi.fn(() => {
              const req = { onsuccess: null, onerror: null };
              setTimeout(() => req.onerror?.({}), 0);
              return req;
            }),
          })),
        })),
        objectStoreNames: { contains: () => true },
      };

      Object.defineProperty(global, 'indexedDB', {
        value: { open: vi.fn(() => {
          const req = { onsuccess: null, onerror: null, onupgradeneeded: null, result: mockDB, error: null };
          setTimeout(() => req.onsuccess?.({}), 0);
          return req;
        })},
      });

      await expect(saveWorkflow('Test', [])).rejects.toThrow();
    });
  });

  describe('loadWorkflow', () => {
    it('should return workflow when found', async () => {
      const workflow = {
        id: 'workflow_123',
        name: 'Test Workflow',
        definition: [{ id: 'node1', type: 'start' as const, x: 100, y: 100 }],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      const mockDB = {
        transaction: vi.fn(() => ({
          objectStore: vi.fn(() => ({
            get: vi.fn((id) => {
              const req = { onsuccess: null, onerror: null, result: workflow };
              setTimeout(() => req.onsuccess?.({}), 0);
              return req;
            }),
          })),
        })),
        objectStoreNames: { contains: () => true },
      };

      Object.defineProperty(global, 'indexedDB', {
        value: { open: vi.fn(() => {
          const req = { onsuccess: null, onerror: null, onupgradeneeded: null, result: mockDB, error: null };
          setTimeout(() => req.onsuccess?.({}), 0);
          return req;
        })},
      });

      const result = await loadWorkflow('workflow_123');

      expect(result).toEqual(workflow);
    });

    it('should return null when workflow not found', async () => {
      const mockDB = {
        transaction: vi.fn(() => ({
          objectStore: vi.fn(() => ({
            get: vi.fn((id) => {
              const req = { onsuccess: null, onerror: null, result: undefined };
              setTimeout(() => req.onsuccess?.({}), 0);
              return req;
            }),
          })),
        })),
        objectStoreNames: { contains: () => true },
      };

      Object.defineProperty(global, 'indexedDB', {
        value: { open: vi.fn(() => {
          const req = { onsuccess: null, onerror: null, onupgradeneeded: null, result: mockDB, error: null };
          setTimeout(() => req.onsuccess?.({}), 0);
          return req;
        })},
      });

      const result = await loadWorkflow('nonexistent');

      expect(result).toBeNull();
    });

    it('should reject when get operation fails', async () => {
      const mockDB = {
        transaction: vi.fn(() => ({
          objectStore: vi.fn(() => ({
            get: vi.fn(() => {
              const req = { onsuccess: null, onerror: null };
              setTimeout(() => req.onerror?.({}), 0);
              return req;
            }),
          })),
        })),
        objectStoreNames: { contains: () => true },
      };

      Object.defineProperty(global, 'indexedDB', {
        value: { open: vi.fn(() => {
          const req = { onsuccess: null, onerror: null, onupgradeneeded: null, result: mockDB, error: null };
          setTimeout(() => req.onsuccess?.({}), 0);
          return req;
        })},
      });

      await expect(loadWorkflow('workflow_123')).rejects.toThrow();
    });
  });

  describe('listWorkflows', () => {
    it('should return all workflows', async () => {
      const workflows = [
        {
          id: 'workflow_1',
          name: 'Workflow 1',
          definition: [],
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 'workflow_2',
          name: 'Workflow 2',
          definition: [{ id: 'node1', type: 'task' as const, x: 100, y: 100 }],
          createdAt: '2024-01-02T00:00:00.000Z',
          updatedAt: '2024-01-02T00:00:00.000Z',
        },
      ];

      const mockDB = {
        transaction: vi.fn(() => ({
          objectStore: vi.fn(() => ({
            getAll: vi.fn(() => {
              const req = { onsuccess: null, onerror: null, result: workflows };
              setTimeout(() => req.onsuccess?.({}), 0);
              return req;
            }),
          })),
        })),
        objectStoreNames: { contains: () => true },
      };

      Object.defineProperty(global, 'indexedDB', {
        value: { open: vi.fn(() => {
          const req = { onsuccess: null, onerror: null, onupgradeneeded: null, result: mockDB, error: null };
          setTimeout(() => req.onsuccess?.({}), 0);
          return req;
        })},
      });

      const result = await listWorkflows();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Workflow 1');
      expect(result[1].name).toBe('Workflow 2');
    });

    it('should return empty array when no workflows', async () => {
      const mockDB = {
        transaction: vi.fn(() => ({
          objectStore: vi.fn(() => ({
            getAll: vi.fn(() => {
              const req = { onsuccess: null, onerror: null, result: [] };
              setTimeout(() => req.onsuccess?.({}), 0);
              return req;
            }),
          })),
        })),
        objectStoreNames: { contains: () => true },
      };

      Object.defineProperty(global, 'indexedDB', {
        value: { open: vi.fn(() => {
          const req = { onsuccess: null, onerror: null, onupgradeneeded: null, result: mockDB, error: null };
          setTimeout(() => req.onsuccess?.({}), 0);
          return req;
        })},
      });

      const result = await listWorkflows();

      expect(result).toEqual([]);
    });

    it('should reject when getAll operation fails', async () => {
      const mockDB = {
        transaction: vi.fn(() => ({
          objectStore: vi.fn(() => ({
            getAll: vi.fn(() => {
              const req = { onsuccess: null, onerror: null };
              setTimeout(() => req.onerror?.({}), 0);
              return req;
            }),
          })),
        })),
        objectStoreNames: { contains: () => true },
      };

      Object.defineProperty(global, 'indexedDB', {
        value: { open: vi.fn(() => {
          const req = { onsuccess: null, onerror: null, onupgradeneeded: null, result: mockDB, error: null };
          setTimeout(() => req.onsuccess?.({}), 0);
          return req;
        })},
      });

      await expect(listWorkflows()).rejects.toThrow();
    });
  });

  describe('deleteWorkflow', () => {
    it('should delete workflow successfully', async () => {
      let deleteCalled = false;

      const mockDB = {
        transaction: vi.fn(() => ({
          objectStore: vi.fn(() => ({
            delete: vi.fn(() => {
              const req = { onsuccess: null, onerror: null };
              setTimeout(() => {
                deleteCalled = true;
                req.onsuccess?.({});
              }, 0);
              return req;
            }),
          })),
        })),
        objectStoreNames: { contains: () => true },
      };

      Object.defineProperty(global, 'indexedDB', {
        value: { open: vi.fn(() => {
          const req = { onsuccess: null, onerror: null, onupgradeneeded: null, result: mockDB, error: null };
          setTimeout(() => req.onsuccess?.({}), 0);
          return req;
        })},
      });

      await deleteWorkflow('workflow_123');

      expect(deleteCalled).toBe(true);
    });

    it('should reject when delete operation fails', async () => {
      const mockDB = {
        transaction: vi.fn(() => ({
          objectStore: vi.fn(() => ({
            delete: vi.fn(() => {
              const req = { onsuccess: null, onerror: null };
              setTimeout(() => req.onerror?.({}), 0);
              return req;
            }),
          })),
        })),
        objectStoreNames: { contains: () => true },
      };

      Object.defineProperty(global, 'indexedDB', {
        value: { open: vi.fn(() => {
          const req = { onsuccess: null, onerror: null, onupgradeneeded: null, result: mockDB, error: null };
          setTimeout(() => req.onsuccess?.({}), 0);
          return req;
        })},
      });

      await expect(deleteWorkflow('workflow_123')).rejects.toThrow();
    });
  });

  describe('renameWorkflow', () => {
    it('should rename workflow successfully', async () => {
      const existingWorkflow = {
        id: 'workflow_123',
        name: 'Old Name',
        definition: [],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      let putCalled = false;

      const mockDB = {
        transaction: vi.fn(() => ({
          objectStore: vi.fn(() => ({
            get: vi.fn(() => {
              const req = { onsuccess: null, onerror: null, result: existingWorkflow };
              setTimeout(() => req.onsuccess?.({}), 0);
              return req;
            }),
            put: vi.fn(() => {
              const req = { onsuccess: null, onerror: null };
              setTimeout(() => {
                putCalled = true;
                req.onsuccess?.({});
              }, 0);
              return req;
            }),
          })),
        })),
        objectStoreNames: { contains: () => true },
      };

      Object.defineProperty(global, 'indexedDB', {
        value: { open: vi.fn(() => {
          const req = { onsuccess: null, onerror: null, onupgradeneeded: null, result: mockDB, error: null };
          setTimeout(() => req.onsuccess?.({}), 0);
          return req;
        })},
      });

      await renameWorkflow('workflow_123', 'New Name');

      expect(putCalled).toBe(true);
    });

    it('should throw error when workflow not found', async () => {
      const mockDB = {
        transaction: vi.fn(() => ({
          objectStore: vi.fn(() => ({
            get: vi.fn(() => {
              const req = { onsuccess: null, onerror: null, result: undefined };
              setTimeout(() => req.onsuccess?.({}), 0);
              return req;
            }),
          })),
        })),
        objectStoreNames: { contains: () => true },
      };

      Object.defineProperty(global, 'indexedDB', {
        value: { open: vi.fn(() => {
          const req = { onsuccess: null, onerror: null, onupgradeneeded: null, result: mockDB, error: null };
          setTimeout(() => req.onsuccess?.({}), 0);
          return req;
        })},
      });

      await expect(renameWorkflow('nonexistent', 'New Name')).rejects.toThrow('not found');
    });

    it('should reject when put operation fails', async () => {
      const existingWorkflow = {
        id: 'workflow_123',
        name: 'Old Name',
        definition: [],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      };

      const mockDB = {
        transaction: vi.fn(() => ({
          objectStore: vi.fn(() => ({
            get: vi.fn(() => {
              const req = { onsuccess: null, onerror: null, result: existingWorkflow };
              setTimeout(() => req.onsuccess?.({}), 0);
              return req;
            }),
            put: vi.fn(() => {
              const req = { onsuccess: null, onerror: null };
              setTimeout(() => req.onerror?.({}), 0);
              return req;
            }),
          })),
        })),
        objectStoreNames: { contains: () => true },
      };

      Object.defineProperty(global, 'indexedDB', {
        value: { open: vi.fn(() => {
          const req = { onsuccess: null, onerror: null, onupgradeneeded: null, result: mockDB, error: null };
          setTimeout(() => req.onsuccess?.({}), 0);
          return req;
        })},
      });

      await expect(renameWorkflow('workflow_123', 'New Name')).rejects.toThrow();
    });
  });

  describe('clearAllWorkflows', () => {
    it('should clear all workflows', async () => {
      let clearCalled = false;

      const mockDB = {
        transaction: vi.fn(() => ({
          objectStore: vi.fn(() => ({
            clear: vi.fn(() => {
              const req = { onsuccess: null, onerror: null };
              setTimeout(() => {
                clearCalled = true;
                req.onsuccess?.({});
              }, 0);
              return req;
            }),
          })),
        })),
        objectStoreNames: { contains: () => true },
      };

      Object.defineProperty(global, 'indexedDB', {
        value: { open: vi.fn(() => {
          const req = { onsuccess: null, onerror: null, onupgradeneeded: null, result: mockDB, error: null };
          setTimeout(() => req.onsuccess?.({}), 0);
          return req;
        })},
      });

      await clearAllWorkflows();

      expect(clearCalled).toBe(true);
    });

    it('should reject when clear operation fails', async () => {
      const mockDB = {
        transaction: vi.fn(() => ({
          objectStore: vi.fn(() => ({
            clear: vi.fn(() => {
              const req = { onsuccess: null, onerror: null };
              setTimeout(() => req.onerror?.({}), 0);
              return req;
            }),
          })),
        })),
        objectStoreNames: { contains: () => true },
      };

      Object.defineProperty(global, 'indexedDB', {
        value: { open: vi.fn(() => {
          const req = { onsuccess: null, onerror: null, onupgradeneeded: null, result: mockDB, error: null };
          setTimeout(() => req.onsuccess?.({}), 0);
          return req;
        })},
      });

      await expect(clearAllWorkflows()).rejects.toThrow();
    });
  });
});