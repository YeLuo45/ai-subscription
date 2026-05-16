/**
 * Sync Engine - Core sync logic with push/pull/merge and conflict detection
 */

import * as storage from './storage';
import type { 
  SyncRecord, 
  SyncResult, 
  SyncState, 
  SyncAdapter,
  ConflictRecord,
  SyncStatus,
  Article,
  Subscription,
  Tag,
  Note,
  ReadingProgress,
  SyncableEntity
} from './types';

const ENTITY_STORES = ['subscriptions', 'articles', 'tags', 'notes', 'reading_progress'] as const;

export class SyncEngine {
  private adapter: SyncAdapter | null = null;
  private deviceId: string;
  private isOnline: boolean = navigator.onLine;
  private syncInProgress: boolean = false;
  private listeners: Set<(state: SyncState) => void> = new Set();

  constructor(deviceId: string) {
    this.deviceId = deviceId;
    this.setupNetworkListeners();
  }

  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.emitState();
      this.sync();
    });
    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.emitState();
    });
  }

  setAdapter(adapter: SyncAdapter): void {
    this.adapter = adapter;
  }

  // ============================================================
  // State Management
  // ============================================================

  async getState(): Promise<SyncState> {
    const pending = await storage.getPendingSyncRecords();
    const conflicts = await storage.getUnresolvedConflicts();
    const config = await storage.getSyncConfig();
    
    return {
      isOnline: this.isOnline,
      isSyncing: this.syncInProgress,
      lastSyncTime: config?.lastSyncTime ?? null,
      pendingCount: pending.length,
      conflictCount: conflicts.length,
    };
  }

  subscribe(listener: (state: SyncState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private async emitState(): Promise<void> {
    const state = await this.getState();
    this.listeners.forEach(l => l(state));
  }

  // ============================================================
  // Core Sync Operations
  // ============================================================

  async sync(): Promise<SyncResult> {
    if (!this.adapter) {
      return { success: false, pushed: 0, pulled: 0, conflicts: 0, errors: ['No sync adapter configured'] };
    }

    if (this.syncInProgress) {
      return { success: false, pushed: 0, pulled: 0, conflicts: 0, errors: ['Sync already in progress'] };
    }

    if (!this.isOnline) {
      return { success: false, pushed: 0, pulled: 0, conflicts: 0, errors: ['Offline'] };
    }

    this.syncInProgress = true;
    await this.emitState();

    const result: SyncResult = { success: true, pushed: 0, pulled: 0, conflicts: 0, errors: [] };

    try {
      // 1. Push local pending changes
      const pushResult = await this.push();
      result.pushed = pushResult.pushed;
      if (pushResult.errors.length > 0) {
        result.errors.push(...pushResult.errors);
      }

      // 2. Pull remote changes
      const pullResult = await this.pull();
      result.pulled = pullResult.pulled;
      result.conflicts = pullResult.conflicts;
      if (pullResult.errors.length > 0) {
        result.errors.push(...pullResult.errors);
      }

      result.success = result.errors.length === 0;
    } catch (error) {
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown sync error');
    } finally {
      this.syncInProgress = false;
      await this.emitState();
    }

    // Record sync history
    await storage.addSyncHistory('full_sync', {
      pushed: result.pushed,
      pulled: result.pulled,
      conflicts: result.conflicts,
      errors: result.errors,
    });

    return result;
  }

  async push(): Promise<SyncResult> {
    if (!this.adapter) {
      return { success: false, pushed: 0, pulled: 0, conflicts: 0, errors: ['No adapter'] };
    }

    const pending = await storage.getPendingSyncRecords();
    if (pending.length === 0) {
      return { success: true, pushed: 0, pulled: 0, conflicts: 0, errors: [] };
    }

    const result = await this.adapter.push(pending);
    if (!result.success) {
      return { success: false, pushed: 0, pulled: 0, conflicts: 0, errors: [result.error || 'Push failed'] };
    }

    // Mark records as synced
    for (const record of pending) {
      await storage.removeSyncRecord(record.id);
      await this.markAsSynced(record.entityType, record.entityId);
    }

    return { success: true, pushed: pending.length, pulled: 0, conflicts: 0, errors: [] };
  }

  async pull(): Promise<SyncResult> {
    if (!this.adapter) {
      return { success: false, pushed: 0, pulled: 0, conflicts: 0, errors: ['No adapter'] };
    }

    const config = await storage.getSyncConfig();
    const since = config?.lastSyncTime ?? 0;

    const { records, error } = await this.adapter.pull(since);
    if (error) {
      return { success: false, pushed: 0, pulled: 0, conflicts: 0, errors: [error] };
    }

    let conflicts = 0;
    for (const record of records) {
      const conflictResult = await this.mergeRecord(record);
      if (conflictResult.hasConflict) conflicts++;
    }

    await this.adapter.setLastSyncTime(Date.now());

    return { success: true, pushed: 0, pulled: records.length, conflicts, errors: [] };
  }

  // ============================================================
  // Merge and Conflict Detection
  // ============================================================

  private async mergeRecord(remoteRecord: SyncRecord): Promise<{ hasConflict: boolean }> {
    const storeName = this.getStoreName(remoteRecord.entityType);
    if (!storeName) return { hasConflict: false };

    const local = await storage.getEntityById<SyncableEntity>(storeName, remoteRecord.entityId);

    if (!local) {
      // No local record, just save remote
      await storage.putEntity(storeName, remoteRecord.data as { id: string });
      return { hasConflict: false };
    }

    // Conflict detection: both modified since last sync
    if (local.localUpdatedAt > (local.serverUpdatedAt ?? 0) && 
        remoteRecord.localUpdatedAt > (local.serverUpdatedAt ?? 0)) {
      // Conflict detected - use Last-Write-Wins (LWW)
      await this.handleConflict(remoteRecord, local);
      return { hasConflict: true };
    }

    // No conflict - remote is newer or local hasn't changed since last sync
    if (remoteRecord.localUpdatedAt > (local.serverUpdatedAt ?? 0)) {
      await storage.putEntity(storeName, remoteRecord.data as { id: string });
    }

    return { hasConflict: false };
  }

  private async handleConflict(remoteRecord: SyncRecord, local: SyncableEntity): Promise<void> {
    const storeName = this.getStoreName(remoteRecord.entityType);
    if (!storeName) return;

    const localData = await storage.getEntityById<Record<string, unknown>>(storeName, remoteRecord.entityId);
    const remoteData = remoteRecord.data;

    const conflict: ConflictRecord = {
      id: `conflict_${remoteRecord.entityId}_${Date.now()}`,
      entityType: remoteRecord.entityType,
      entityId: remoteRecord.entityId,
      localData,
      remoteData,
      localUpdatedAt: local.localUpdatedAt,
      remoteUpdatedAt: remoteRecord.localUpdatedAt,
      detectedAt: Date.now(),
    };

    await storage.addConflict(conflict);

    // Mark entity as conflicted
    if (localData) {
      await storage.putEntity(storeName, { ...localData, syncStatus: 'conflict' } as { id: string; syncStatus: SyncStatus });
    }
  }

  async resolveConflict(
    conflictId: string, 
    resolution: 'local' | 'remote'
  ): Promise<void> {
    const conflicts = await storage.getUnresolvedConflicts();
    const conflict = conflicts.find(c => c.id === conflictId);
    if (!conflict) return;

    const storeName = this.getStoreName(conflict.entityType);
    if (!storeName) return;

    const data = resolution === 'local' ? conflict.localData : conflict.remoteData;
    await storage.putEntity(storeName, { 
      ...data as SyncableEntity, 
      syncStatus: 'synced' as SyncStatus 
    });

    await storage.resolveConflict(conflictId);
    await this.emitState();
  }

  // ============================================================
  // Entity Operations (with sync metadata)
  // ============================================================

  async createEntity<T extends SyncableEntity>(
    entityType: SyncRecord['entityType'],
    data: Omit<T, 'localUpdatedAt' | 'serverUpdatedAt' | 'syncStatus' | 'deviceId'>,
    storeName: 'subscriptions' | 'articles' | 'tags' | 'notes' | 'reading_progress'
  ): Promise<T> {
    const now = Date.now();
    const entity = {
      ...data,
      id: (data as any).id || `local_${now}_${Math.random().toString(36).slice(2, 9)}`,
      localUpdatedAt: now,
      syncStatus: 'pending' as SyncStatus,
      deviceId: this.deviceId,
    } as T;

    await storage.putEntity(storeName, entity);
    await this.queueSyncRecord(entityType, entity.id, 'create', entity as unknown as Record<string, unknown>);
    await this.emitState();

    return entity;
  }

  async updateEntity<T extends SyncableEntity>(
    entityType: SyncRecord['entityType'],
    entityId: string,
    updates: Partial<T>,
    storeName: 'subscriptions' | 'articles' | 'tags' | 'notes' | 'reading_progress'
  ): Promise<T | null> {
    const existing = await storage.getEntityById<T>(storeName, entityId);
    if (!existing) return null;

    const updated: T = {
      ...existing,
      ...updates,
      id: entityId,
      localUpdatedAt: Date.now(),
      syncStatus: 'pending' as SyncStatus,
      deviceId: this.deviceId,
    };

    await storage.putEntity(storeName, updated);
    await this.queueSyncRecord(entityType, entityId, 'update', updated as unknown as Record<string, unknown>);
    await this.emitState();

    return updated;
  }

  async deleteEntity(
    entityType: SyncRecord['entityType'],
    entityId: string,
    storeName: 'subscriptions' | 'articles' | 'tags' | 'notes' | 'reading_progress'
  ): Promise<void> {
    await storage.deleteEntity(storeName, entityId);
    await this.queueSyncRecord(entityType, entityId, 'delete', { id: entityId });
    await this.emitState();
  }

  // ============================================================
  // Offline Queue Helpers
  // ============================================================

  private async queueSyncRecord(
    entityType: SyncRecord['entityType'],
    entityId: string,
    operation: SyncRecord['operation'],
    data: Record<string, unknown>
  ): Promise<void> {
    const record: SyncRecord = {
      id: `record_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      entityType,
      entityId,
      operation,
      data,
      localUpdatedAt: Date.now(),
      status: 'pending',
    };

    await storage.addToSyncQueue(record);
  }

  private async markAsSynced(entityType: SyncRecord['entityType'], entityId: string): Promise<void> {
    const storeName = this.getStoreName(entityType);
    if (!storeName) return;

    const entity = await storage.getEntityById<SyncableEntity>(storeName, entityId);
    if (entity) {
      entity.syncStatus = 'synced';
      entity.serverUpdatedAt = Date.now();
      await storage.putEntity(storeName, entity);
    }
  }

  private getStoreName(entityType: SyncRecord['entityType']): 'subscriptions' | 'articles' | 'tags' | 'notes' | 'reading_progress' | null {
    const map: Record<SyncRecord['entityType'], 'subscriptions' | 'articles' | 'tags' | 'notes' | 'reading_progress'> = {
      subscription: 'subscriptions',
      article: 'articles',
      tag: 'tags',
      note: 'notes',
      readingProgress: 'reading_progress',
    };
    return map[entityType] ?? null;
  }
}

// Singleton instance
let engineInstance: SyncEngine | null = null;

export function getSyncEngine(deviceId?: string): SyncEngine {
  if (!engineInstance) {
    const id = deviceId || localStorage.getItem('sync_device_id') || generateDeviceId();
    engineInstance = new SyncEngine(id);
    localStorage.setItem('sync_device_id', id);
  }
  return engineInstance;
}

function generateDeviceId(): string {
  return `device_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}