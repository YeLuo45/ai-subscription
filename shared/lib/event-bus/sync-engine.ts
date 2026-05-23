/**
 * SyncEngine - Handles event synchronization and conflict resolution
 * Coordinates between MessageBus and ChannelAdapter
 */

import type { BusEvent, SyncEngineConfig } from './types';

const SYNC_INTERVAL_MS = 30000; // 30 seconds
const MAX_EVENTS_PER_SYNC = 100;

export class SyncEngine {
  private static instance: SyncEngine | null = null;
  
  private adapter: import('./types').ChannelAdapter | null = null;
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  private config: SyncEngineConfig;
  private lastSyncTime: number = 0;
  private pendingEvents: BusEvent[] = [];
  private isOnline: boolean = navigator.onLine;

  private constructor(config: SyncEngineConfig) {
    this.config = config;
    
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.scheduleSync();
    });
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  static getInstance(config?: SyncEngineConfig): SyncEngine {
    if (!SyncEngine.instance) {
      if (!config) {
        throw new Error('SyncEngine must be initialized with config on first access');
      }
      SyncEngine.instance = new SyncEngine(config);
    }
    return SyncEngine.instance;
  }

  static resetInstance(): void {
    if (SyncEngine.instance) {
      SyncEngine.instance.destroy();
      SyncEngine.instance = null;
    }
  }

  setAdapter(adapter: import('./types').ChannelAdapter): void {
    this.adapter = adapter;
    this.scheduleSync();
  }

  private scheduleSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
    
    if (this.config.deltaSync && this.isOnline) {
      this.syncTimer = setInterval(() => {
        this.performSync();
      }, SYNC_INTERVAL_MS);
    }
  }

  async performSync(): Promise<void> {
    if (!this.adapter || !this.isOnline) return;

    try {
      // Get current state from adapter
      const state = await this.adapter.getState();
      
      // Check for conflicts based on config
      if (this.config.conflictResolution === 'manual') {
        // Manual resolution would trigger UI - for now just log
        console.log('[SyncEngine] Manual conflict resolution mode, state:', state);
      }
      
      this.lastSyncTime = Date.now();
    } catch (error) {
      console.error('[SyncEngine] Sync failed:', error);
    }
  }

  queueEvent(event: BusEvent): void {
    if (this.pendingEvents.length >= MAX_EVENTS_PER_SYNC) {
      // Drop oldest event if queue is full
      this.pendingEvents.shift();
    }
    this.pendingEvents.push(event);
  }

  async flushPendingEvents(): Promise<void> {
    if (!this.adapter || this.pendingEvents.length === 0) return;

    const eventsToFlush = [...this.pendingEvents];
    this.pendingEvents = [];

    for (const event of eventsToFlush) {
      try {
        await this.adapter.publish(event);
      } catch (error) {
        console.error('[SyncEngine] Failed to flush event:', event.id, error);
        // Re-queue failed events
        this.pendingEvents.push(event);
      }
    }
  }

  getLastSyncTime(): number {
    return this.lastSyncTime;
  }

  isSyncing(): boolean {
    return this.pendingEvents.length > 0;
  }

  destroy(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    this.pendingEvents = [];
  }
}

export function createSyncEngine(config: SyncEngineConfig): SyncEngine {
  return SyncEngine.getInstance(config);
}