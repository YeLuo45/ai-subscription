/**
 * SyncEngine - Delta sync + conflict resolution for cross-platform event sync
 * Coordinates state synchronization between local MessageBus and remote channels
 */

import type { BusEvent, SyncEngineConfig } from './types';
import { MessageBus, getMessageBus } from './message-bus';
import { WebChannelAdapter } from './adapters/web-adapter';

const DEFAULT_CONFIG: SyncEngineConfig = {
  deltaSync: true,
  conflictResolution: 'last-write-wins',
};

export interface SyncState {
  isOnline: boolean;
  lastSyncTime: number | null;
  pendingEvents: number;
  isSyncing: boolean;
}

export interface SyncEvent {
  id: string;
  event: BusEvent;
  synced: boolean;
  syncTime?: number;
}

export class SyncEngine {
  private bus: MessageBus;
  private adapter: WebChannelAdapter;
  private config: SyncEngineConfig;
  private syncState: SyncState;
  private listeners: Set<(state: SyncState) => void> = new Set();
  private pendingQueue: SyncEvent[] = [];
  private lastSyncTimestamp: number = 0;

  constructor(bus: MessageBus, adapter: WebChannelAdapter, config: SyncEngineConfig = DEFAULT_CONFIG) {
    this.bus = bus;
    this.adapter = adapter;
    this.config = config;
    this.syncState = {
      isOnline: navigator.onLine,
      lastSyncTime: null,
      pendingEvents: 0,
      isSyncing: false,
    };

    this.setupNetworkListeners();
    this.setupRemoteEventListener();
  }

  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.syncState.isOnline = true;
      this.emitState();
      this.sync();
    });

    window.addEventListener('offline', () => {
      this.syncState.isOnline = false;
      this.emitState();
    });
  }

  private setupRemoteEventListener(): void {
    this.bus.subscribe('*', (event: BusEvent) => {
      this.handleLocalEvent(event);
    });
  }

  private handleLocalEvent(event: BusEvent): void {
    const syncEvent: SyncEvent = {
      id: event.id,
      event,
      synced: false,
    };

    this.pendingQueue.push(syncEvent);
    this.updatePendingCount();

    if (this.syncState.isOnline) {
      this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    if (this.syncState.isSyncing || this.pendingQueue.length === 0) {
      return;
    }

    this.syncState.isSyncing = true;
    this.emitState();

    const eventsToSync = [...this.pendingQueue];
    
    for (const syncEvent of eventsToSync) {
      try {
        if (this.config.deltaSync) {
          // Delta sync: only sync events newer than last sync timestamp
          if (syncEvent.event.timestamp > this.lastSyncTimestamp) {
            await this.adapter.publish(syncEvent.event);
            syncEvent.synced = true;
            syncEvent.syncTime = Date.now();
          }
        } else {
          await this.adapter.publish(syncEvent.event);
          syncEvent.synced = true;
          syncEvent.syncTime = Date.now();
        }
      } catch (error) {
        console.error('[SyncEngine] Failed to sync event:', error);
      }
    }

    // Remove synced events from queue
    this.pendingQueue = this.pendingQueue.filter(e => !e.synced);
    
    this.lastSyncTimestamp = Date.now();
    this.syncState.lastSyncTime = this.lastSyncTimestamp;
    this.syncState.isSyncing = false;
    this.updatePendingCount();
    this.emitState();
  }

  private updatePendingCount(): void {
    this.syncState.pendingEvents = this.pendingQueue.filter(e => !e.synced).length;
  }

  async sync(): Promise<void> {
    if (!this.syncState.isOnline) {
      console.log('[SyncEngine] Offline, skipping sync');
      return;
    }

    await this.processQueue();

    // Pull remote events since last sync
    await this.pullRemoteEvents();
  }

  private async pullRemoteEvents(): Promise<void> {
    try {
      const remoteEvents = await this.adapter.getRecentEvents(100);
      const newEvents = remoteEvents.filter(
        e => e.timestamp > this.lastSyncTimestamp
      );

      for (const event of newEvents) {
        // Skip events that originated from this device
        if (this.isLocalEvent(event)) {
          continue;
        }

        // Check for conflicts
        const conflict = await this.detectConflict(event);
        
        if (conflict && this.config.conflictResolution === 'last-write-wins') {
          // Last-write-wins: accept remote event
          await this.bus.publish(event);
        } else if (conflict) {
          // Manual resolution: queue for user confirmation
          console.warn('[SyncEngine] Conflict detected:', conflict);
        } else {
          await this.bus.publish(event);
        }
      }

      this.lastSyncTimestamp = Date.now();
      this.syncState.lastSyncTime = this.lastSyncTimestamp;
    } catch (error) {
      console.error('[SyncEngine] Failed to pull remote events:', error);
    }
  }

  private async detectConflict(event: BusEvent): Promise<boolean> {
    const existingEvents = await this.adapter.getEventsByType(event.type);
    
    for (const existing of existingEvents) {
      // If same entity was modified more recently locally, it's a conflict
      if (this.hasEntityOverlap(event, existing)) {
        const localTime = existing.timestamp;
        const remoteTime = event.timestamp;
        
        // Conflict if times are close (within 5 seconds) and different sources
        if (Math.abs(localTime - remoteTime) < 5000 && existing.source !== event.source) {
          return true;
        }
      }
    }
    
    return false;
  }

  private hasEntityOverlap(event1: BusEvent, event2: BusEvent): boolean {
    const payload1 = event1.payload as unknown as Record<string, unknown>;
    const payload2 = event2.payload as unknown as Record<string, unknown>;
    
    // Check if events affect same entity
    if (payload1.articleId && payload1.articleId === payload2.articleId) {
      return true;
    }
    if (payload1.subscriptionId && payload1.subscriptionId === payload2.subscriptionId) {
      return true;
    }
    
    return false;
  }

  private isLocalEvent(event: BusEvent): boolean {
    // Check if event ID matches local device pattern
    return event.id.startsWith(this.getDeviceId());
  }

  private getDeviceId(): string {
    // This would be better stored during initialization
    // For now, generate a consistent device ID from localStorage
    let deviceId = localStorage.getItem('ai_subscription_device_id');
    if (!deviceId) {
      deviceId = `web-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('ai_subscription_device_id', deviceId);
    }
    return deviceId;
  }

  subscribe(callback: (state: SyncState) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private emitState(): void {
    this.listeners.forEach(callback => {
      try {
        callback(this.syncState);
      } catch (e) {
        console.error('[SyncEngine] Listener error:', e);
      }
    });
  }

  getState(): SyncState {
    return { ...this.syncState };
  }

  async forceSync(): Promise<void> {
    this.lastSyncTimestamp = 0;
    await this.sync();
  }

  destroy(): void {
    this.listeners.clear();
    this.pendingQueue = [];
  }
}

export function createSyncEngine(config?: SyncEngineConfig): SyncEngine {
  const bus = getMessageBus();
  if (!bus) {
    throw new Error('MessageBus not initialized. Create it first with createMessageBus().');
  }
  
  const adapter = new WebChannelAdapter();
  return new SyncEngine(bus, adapter, config);
}