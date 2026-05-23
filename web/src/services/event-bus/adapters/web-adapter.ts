/**
 * WebChannelAdapter - IndexedDB storage + localStorage cross-tab sync
 * Implements ChannelAdapter interface for web platform
 */

import type { BusEvent, ChannelAdapter } from '../types';

const DB_NAME = 'ai_subscription_event_bus';
const DB_VERSION = 1;
const STATE_STORE = 'state';
const EVENTS_STORE = 'events';

const LOCAL_STORAGE_KEY = 'ai_subscription_event_bus_channel';
const CHANNEL_EVENT_TYPE = 'bus-event';

export class WebChannelAdapter implements ChannelAdapter {
  private db: IDBDatabase | null = null;
  private storageListener: ((event: StorageEvent) => void) | null = null;
  private remoteCallbacks: Set<(event: BusEvent) => void> = new Set();

  constructor() {
    this.initDB();
  }

  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(STATE_STORE)) {
          db.createObjectStore(STATE_STORE, { keyPath: 'key' });
        }
        
        if (!db.objectStoreNames.contains(EVENTS_STORE)) {
          const eventsStore = db.createObjectStore(EVENTS_STORE, { keyPath: 'id' });
          eventsStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  private ensureDB(): IDBDatabase {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  async publish(event: BusEvent): Promise<void> {
    const db = this.ensureDB();

    // Store event in IndexedDB
    await this.storeEvent(event);

    // Update current state with latest event
    await this.updateState(event.type, event);

    // Notify other tabs via localStorage
    this.broadcastEvent(event);
  }

  async getState(): Promise<Record<string, unknown>> {
    const db = this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STATE_STORE, 'readonly');
      const store = tx.objectStore(STATE_STORE);
      const request = store.getAll();
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const state: Record<string, unknown> = {};
        const results = request.result as Array<{ key: string; value: unknown }>;
        for (const item of results) {
          state[item.key] = item.value;
        }
        resolve(state);
      };
    });
  }

  onRemoteEvent(callback: (event: BusEvent) => void): () => void {
    this.remoteCallbacks.add(callback);

    if (!this.storageListener) {
      this.storageListener = (event: StorageEvent) => {
        if (event.key === LOCAL_STORAGE_KEY && event.newValue) {
          try {
            const data = JSON.parse(event.newValue);
            if (data.type === CHANNEL_EVENT_TYPE) {
              const remoteEvent = data.event as BusEvent;
              this.remoteCallbacks.forEach(cb => {
                try {
                  cb(remoteEvent);
                } catch (e) {
                  console.error('[WebChannelAdapter] Callback error:', e);
                }
              });
            }
          } catch (e) {
            console.error('[WebChannelAdapter] Failed to parse storage event:', e);
          }
        }
      };

      window.addEventListener('storage', this.storageListener);
    }

    return () => {
      this.remoteCallbacks.delete(callback);
      
      if (this.remoteCallbacks.size === 0 && this.storageListener) {
        window.removeEventListener('storage', this.storageListener);
        this.storageListener = null;
      }
    };
  }

  private async storeEvent(event: BusEvent): Promise<void> {
    const db = this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction(EVENTS_STORE, 'readwrite');
      const store = tx.objectStore(EVENTS_STORE);
      const request = store.put(event);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  private async updateState(eventType: string, event: BusEvent): Promise<void> {
    const db = this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STATE_STORE, 'readwrite');
      const store = tx.objectStore(STATE_STORE);
      const request = store.put({ key: eventType, value: event });
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  private broadcastEvent(event: BusEvent): void {
    try {
      const message = JSON.stringify({
        type: CHANNEL_EVENT_TYPE,
        event,
        timestamp: Date.now(),
      });
      localStorage.setItem(LOCAL_STORAGE_KEY, message);
      
      // Clear after a short delay to allow same-tab detection
      setTimeout(() => {
        if (localStorage.getItem(LOCAL_STORAGE_KEY) === message) {
          localStorage.removeItem(LOCAL_STORAGE_KEY);
        }
      }, 100);
    } catch (e) {
      console.error('[WebChannelAdapter] Failed to broadcast event:', e);
    }
  }

  async getRecentEvents(limit: number = 100): Promise<BusEvent[]> {
    const db = this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction(EVENTS_STORE, 'readonly');
      const store = tx.objectStore(EVENTS_STORE);
      const index = store.index('timestamp');
      const events: BusEvent[] = [];
      const cursorRequest = index.openCursor(null, 'prev');
      
      cursorRequest.onerror = () => reject(cursorRequest.error);
      cursorRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor && events.length < limit) {
          events.push(cursor.value);
          cursor.continue();
        } else {
          resolve(events);
        }
      };
    });
  }

  async getEventsByType(eventType: string): Promise<BusEvent[]> {
    const allEvents = await this.getRecentEvents(1000);
    return allEvents.filter(e => e.type === eventType);
  }

  destroy(): void {
    if (this.storageListener) {
      window.removeEventListener('storage', this.storageListener);
      this.storageListener = null;
    }
    this.remoteCallbacks.clear();
    
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}