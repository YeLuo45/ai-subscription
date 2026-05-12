/**
 * Sync Service for offline/online synchronization
 */

import type { SyncStatus } from './types';
import { cacheManager } from './cache-manager';

type SyncEventType = 'online' | 'offline' | 'syncing' | 'sync-complete' | 'sync-error';
type SyncListener = (event: SyncEventType, data?: unknown) => void;

class SyncService {
  private listeners: Set<SyncListener> = new Set();
  private autoSyncInterval: number | null = null;
  private syncStatus: SyncStatus = {
    lastSyncAt: 0,
    pendingCount: 0,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  };

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.syncStatus.isOnline = true;
        this.emit('online');
        this.syncAll();
      });

      window.addEventListener('offline', () => {
        this.syncStatus.isOnline = false;
        this.emit('offline');
      });
    }
  }

  isOnline(): boolean {
    return this.syncStatus.isOnline;
  }

  // Auto sync
  startAutoSync(interval: number): void {
    if (this.autoSyncInterval) {
      this.stopAutoSync();
    }

    this.autoSyncInterval = window.setInterval(() => {
      if (this.isOnline()) {
        this.syncAll();
      }
    }, interval);
  }

  stopAutoSync(): void {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
      this.autoSyncInterval = null;
    }
  }

  // Manual sync
  async syncAll(): Promise<void> {
    if (!this.isOnline()) {
      return;
    }

    this.emit('syncing');

    try {
      await Promise.all([
        this.syncFeeds(),
        this.syncArticles(),
      ]);

      this.syncStatus.lastSyncAt = Date.now();
      this.syncStatus.pendingCount = 0;
      await cacheManager.setLastSyncTime(this.syncStatus.lastSyncAt);

      this.emit('sync-complete');
    } catch (error) {
      this.emit('sync-error', error);
      throw error;
    }
  }

  async syncFeeds(): Promise<void> {
    // Placeholder - in real implementation, this would fetch feeds from server
    // and update the cache
    try {
      const cachedFeeds = await cacheManager.getCachedFeeds();
      // In real implementation: fetch fresh feeds and update cache
      this.syncStatus.lastSyncAt = Date.now();
    } catch (error) {
      console.error('Failed to sync feeds:', error);
      throw error;
    }
  }

  async syncArticles(): Promise<void> {
    // Placeholder - in real implementation, this would fetch articles from server
    // and update the cache
    try {
      const cachedArticles = await cacheManager.getCachedArticles();
      // In real implementation: fetch fresh articles and update cache
      this.syncStatus.lastSyncAt = Date.now();
    } catch (error) {
      console.error('Failed to sync articles:', error);
      throw error;
    }
  }

  // Status
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  // Event handling
  addListener(listener: SyncListener): void {
    this.listeners.add(listener);
  }

  removeListener(listener: SyncListener): void {
    this.listeners.delete(listener);
  }

  private emit(event: SyncEventType, data?: unknown): void {
    this.listeners.forEach(listener => listener(event, data));
  }
}

// Singleton instance
export const syncService = new SyncService();

// Network status update helper for offline indicator
export function updateIndicator(isOnline: boolean): void {
  const event = new CustomEvent('network-status-change', {
    detail: { isOnline }
  });
  window.dispatchEvent(event);
}
