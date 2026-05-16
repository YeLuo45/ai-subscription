/**
 * Offline Queue - Manages pending operations when offline
 */

import * as storage from './storage';
import type { SyncRecord, SyncResult } from './types';

type SyncCallback = (result: SyncResult) => void;

export class OfflineQueue {
  private isOnline: boolean = navigator.onLine;
  private syncCallback: SyncCallback | null = null;
  private processing: boolean = false;

  constructor() {
    this.setupNetworkListeners();
  }

  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processQueue();
    });
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  setSyncCallback(callback: SyncCallback): void {
    this.syncCallback = callback;
  }

  // ============================================================
  // Queue Operations
  // ============================================================

  async enqueue(record: Omit<SyncRecord, 'id' | 'localUpdatedAt' | 'status'>): Promise<SyncRecord> {
    const fullRecord: SyncRecord = {
      ...record,
      id: `queue_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      localUpdatedAt: Date.now(),
      status: 'pending',
    };

    await storage.addToSyncQueue(fullRecord);
    return fullRecord;
  }

  async getPendingCount(): Promise<number> {
    const pending = await storage.getPendingSyncRecords();
    return pending.length;
  }

  async isEmpty(): Promise<boolean> {
    const count = await this.getPendingCount();
    return count === 0;
  }

  // ============================================================
  // Queue Processing
  // ============================================================

  async processQueue(): Promise<SyncResult> {
    if (this.processing) {
      return { success: false, pushed: 0, pulled: 0, conflicts: 0, errors: ['Already processing'] };
    }

    if (!this.isOnline) {
      return { success: false, pushed: 0, pulled: 0, conflicts: 0, errors: ['Offline'] };
    }

    const pending = await storage.getPendingSyncRecords();
    if (pending.length === 0) {
      return { success: true, pushed: 0, pulled: 0, conflicts: 0, errors: [] };
    }

    this.processing = true;
    const result: SyncResult = { success: true, pushed: 0, pulled: 0, conflicts: 0, errors: [] };

    try {
      for (const record of pending) {
        try {
          // In a real implementation, this would call the sync adapter
          // For now, we just mark as processed
          await storage.removeSyncRecord(record.id);
          result.pushed++;
        } catch (error) {
          result.errors.push(error instanceof Error ? error.message : 'Unknown error');
        }
      }

      result.success = result.errors.length === 0;
    } finally {
      this.processing = false;
    }

    this.syncCallback?.(result);
    return result;
  }

  async clear(): Promise<void> {
    await storage.clearSyncQueue();
  }
}

// Singleton instance
let queueInstance: OfflineQueue | null = null;

export function getOfflineQueue(): OfflineQueue {
  if (!queueInstance) {
    queueInstance = new OfflineQueue();
  }
  return queueInstance;
}