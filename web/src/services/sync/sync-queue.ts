/**
 * Sync Queue - Manages pending operations for offline sync
 * Uses IndexedDB for persistence
 */

export type SyncOperationType = 'create' | 'update' | 'delete';

export interface SyncOperation {
  id: string;
  entityType: 'article' | 'subscription' | 'tag' | 'note' | 'readingProgress';
  entityId: string;
  operation: SyncOperationType;
  payload: Record<string, unknown>;
  timestamp: number;
  retries: number;
  lastError?: string;
}

const DB_NAME = 'ai-subscription-sync-queue';
const DB_VERSION = 1;
const STORE_NAME = 'sync_queue';

let dbInstance: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('entityType', 'entityType', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('entityId', 'entityId', { unique: false });
      }
    };
  });
}

function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function generateId(): string {
  return `syncop_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * SyncQueue manages pending operations that need to be synchronized
 * when the app is back online
 */
export class SyncQueue {
  private dbReady: Promise<void>;

  constructor() {
    this.dbReady = openDB().then(() => {});
  }

  /**
   * Ensure database is ready
   */
  private async ensureDB(): Promise<IDBDatabase> {
    await this.dbReady;
    return openDB();
  }

  /**
   * Add an operation to the sync queue
   */
  async queueOperation(
    entityType: SyncOperation['entityType'],
    entityId: string,
    operation: SyncOperation['operation'],
    payload: Record<string, unknown>
  ): Promise<string> {
    const op: SyncOperation = {
      id: generateId(),
      entityType,
      entityId,
      operation,
      payload,
      timestamp: Date.now(),
      retries: 0,
    };

    const db = await this.ensureDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    await promisifyRequest(store.put(op));

    return op.id;
  }

  /**
   * Get all pending operations
   */
  async getPending(): Promise<SyncOperation[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('timestamp');
    const all = await promisifyRequest<SyncOperation[]>(index.getAll());
    return all.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Get pending operations count
   */
  async getPendingCount(): Promise<number> {
    const pending = await this.getPending();
    return pending.length;
  }

  /**
   * Process all pending operations with a handler function
   */
  async processQueue(
    handler: (op: SyncOperation) => Promise<{ success: boolean; error?: string }>
  ): Promise<{ processed: number; succeeded: number; failed: number }> {
    const pending = await this.getPending();
    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    for (const op of pending) {
      processed++;
      const result = await handler(op);

      if (result.success) {
        await this.removeOperation(op.id);
        succeeded++;
      } else {
        await this.markFailed(op.id, result.error || 'Unknown error');
        failed++;
      }
    }

    return { processed, succeeded, failed };
  }

  /**
   * Mark an operation as failed (increment retry count)
   */
  async markFailed(operationId: string, error: string): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const op = await promisifyRequest<SyncOperation | undefined>(store.get(operationId));
    if (op) {
      op.retries++;
      op.lastError = error;
      await promisifyRequest(store.put(op));
    }
  }

  /**
   * Remove an operation from the queue
   */
  async removeOperation(operationId: string): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    await promisifyRequest(store.delete(operationId));
  }

  /**
   * Clear all pending operations
   */
  async clearQueue(): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    await promisifyRequest(store.clear());
  }

  /**
   * Get operations by entity type
   */
  async getByEntityType(entityType: SyncOperation['entityType']): Promise<SyncOperation[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('entityType');
    return promisifyRequest<SyncOperation[]>(index.getAll(entityType));
  }

  /**
   * Get operations for a specific entity
   */
  async getByEntityId(entityId: string): Promise<SyncOperation[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('entityId');
    return promisifyRequest<SyncOperation[]>(index.getAll(entityId));
  }

  /**
   * Remove all operations for a specific entity
   */
  async removeByEntityId(entityId: string): Promise<void> {
    const ops = await this.getByEntityId(entityId);
    for (const op of ops) {
      await this.removeOperation(op.id);
    }
  }
}

// Singleton instance
let syncQueueInstance: SyncQueue | null = null;

export function getSyncQueue(): SyncQueue {
  if (!syncQueueInstance) {
    syncQueueInstance = new SyncQueue();
  }
  return syncQueueInstance;
}