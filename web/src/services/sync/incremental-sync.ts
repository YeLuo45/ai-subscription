/**
 * Incremental Sync Service
 * Handles incremental synchronization with timestamp-based change tracking
 */

import { getSyncQueue, type SyncOperation } from './sync-queue';

export interface SyncConfig {
  lastSyncTimestamp: number;
  syncInterval: number; // in ms
  enabled: boolean;
}

export interface IncrementalSyncResult {
  success: boolean;
  pulled: number;
  pushed: number;
  conflicts: number;
  errors: string[];
  timestamp: number;
}

const DB_NAME = 'ai-subscription-incremental-sync';
const DB_VERSION = 1;
const STORE_NAME = 'sync_config';
const CONFIG_KEY = 'incremental_sync_config';

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
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
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

/**
 * IncrementalSync manages efficient incremental synchronization
 * by tracking changes since last sync timestamp
 */
export class IncrementalSync {
  private syncQueue = getSyncQueue();
  private syncInProgress = false;
  private listeners: Set<(state: { isSyncing: boolean; lastSync: number | null }) => void> = new Set();

  constructor() {
    this.setupNetworkListeners();
  }

  /**
   * Set up network status listeners for auto-sync
   */
  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.sync().catch(console.error);
    });
  }

  /**
   * Subscribe to sync state changes
   */
  subscribe(listener: (state: { isSyncing: boolean; lastSync: number | null }) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Emit sync state to all listeners
   */
  private emitState(): void {
    this.getLastSyncTimestamp().then(lastSync => {
      const state = { isSyncing: this.syncInProgress, lastSync };
      this.listeners.forEach(l => l(state));
    });
  }

  /**
   * Check if currently online
   */
  isOnline(): boolean {
    return navigator.onLine;
  }

  /**
   * Get the last sync timestamp
   */
  async getLastSyncTimestamp(): Promise<number | null> {
    try {
      const db = await openDB();
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const config = await promisifyRequest<SyncConfig | undefined>(store.get(CONFIG_KEY));
      return config?.lastSyncTimestamp ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Set the last sync timestamp
   */
  async setLastSyncTimestamp(timestamp: number): Promise<void> {
    try {
      const db = await openDB();
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const existing = await promisifyRequest<SyncConfig | undefined>(store.get(CONFIG_KEY));
      
      const config: SyncConfig = {
        lastSyncTimestamp: timestamp,
        syncInterval: existing?.syncInterval ?? 5 * 60 * 1000, // Default 5 min
        enabled: existing?.enabled ?? true,
      };

      await promisifyRequest(store.put({ key: CONFIG_KEY, ...config }));
    } catch (error) {
      console.error('[IncrementalSync] Failed to save sync timestamp:', error);
    }
  }

  /**
   * Perform incremental sync
   * This should be called by a sync adapter implementation
   */
  async sync(): Promise<IncrementalSyncResult> {
    if (this.syncInProgress) {
      return {
        success: false,
        pulled: 0,
        pushed: 0,
        conflicts: 0,
        errors: ['Sync already in progress'],
        timestamp: Date.now(),
      };
    }

    if (!this.isOnline()) {
      return {
        success: false,
        pulled: 0,
        pushed: 0,
        conflicts: 0,
        errors: ['Offline'],
        timestamp: Date.now(),
      };
    }

    this.syncInProgress = true;
    this.emitState();

    const result: IncrementalSyncResult = {
      success: true,
      pulled: 0,
      pushed: 0,
      conflicts: 0,
      errors: [],
      timestamp: Date.now(),
    };

    try {
      // Process pending operations from queue
      const queueResult = await this.syncQueue.processQueue(async (op: SyncOperation) => {
        // This is a placeholder - actual push logic would be in an adapter
        // For now, just mark as succeeded after a simulated delay
        await new Promise(resolve => setTimeout(resolve, 10));
        return { success: true };
      });

      result.pushed = queueResult.succeeded;
      result.errors.push(...queueResult.failed > 0 ? [`${queueResult.failed} operations failed`] : []);

      // Update sync timestamp
      await this.setLastSyncTimestamp(Date.now());
    } catch (error) {
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown sync error');
    } finally {
      this.syncInProgress = false;
      this.emitState();
    }

    return result;
  }

  /**
   * Get current sync status
   */
  async getStatus(): Promise<{ isSyncing: boolean; lastSync: number | null; pendingOps: number }> {
    const lastSync = await this.getLastSyncTimestamp();
    const pendingOps = await this.syncQueue.getPendingCount();

    return {
      isSyncing: this.syncInProgress,
      lastSync,
      pendingOps,
    };
  }

  /**
   * Queue a local change for sync
   */
  async queueChange(
    entityType: SyncOperation['entityType'],
    entityId: string,
    operation: SyncOperation['operation'],
    payload: Record<string, unknown>
  ): Promise<string> {
    return this.syncQueue.queueOperation(entityType, entityId, operation, payload);
  }

  /**
   * Clear all pending operations
   */
  async clearPending(): Promise<void> {
    await this.syncQueue.clearQueue();
  }
}

// Singleton instance
let incrementalSyncInstance: IncrementalSync | null = null;

export function getIncrementalSync(): IncrementalSync {
  if (!incrementalSyncInstance) {
    incrementalSyncInstance = new IncrementalSync();
  }
  return incrementalSyncInstance;
}