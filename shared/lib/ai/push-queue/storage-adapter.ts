/**
 * Storage Adapter for Push Queue
 * IndexedDB implementation with swappable interface for future Redis migration
 */

import type { AggregatedPush, StorageAdapter } from './types';

const DB_NAME = 'PushQueueDB';
const DB_VERSION = 1;
const STORE_NAME = 'aggregatedPushes';

let dbInstance: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (dbInstance) { resolve(dbInstance); return; }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => { dbInstance = request.result; resolve(request.result); };
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('scheduledAt', 'scheduledAt', { unique: false });
      }
    };
  });
}

async function getStore(mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, mode);
  return tx.objectStore(STORE_NAME);
}

function generateId(): string {
  return `push-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// IndexedDB implementation of StorageAdapter
export const indexedDBStorageAdapter: StorageAdapter = {
  async create(push: Omit<AggregatedPush, 'id'>): Promise<AggregatedPush> {
    const full: AggregatedPush = {
      ...push,
      id: push.id || generateId(),
    };
    const store = await getStore('readwrite');
    return new Promise((resolve, reject) => {
      const req = store.add(full);
      req.onsuccess = () => resolve(full);
      req.onerror = () => reject(req.error);
    });
  },

  async get(id: string): Promise<AggregatedPush | undefined> {
    const store = await getStore();
    return new Promise((resolve, reject) => {
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  async getAll(): Promise<AggregatedPush[]> {
    const store = await getStore();
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  },

  async getPending(before: number = Date.now()): Promise<AggregatedPush[]> {
    const store = await getStore();
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => {
        const pending = (req.result as AggregatedPush[])
          .filter(p => p.status === 'pending' && p.scheduledAt <= before)
          .sort((a, b) => a.scheduledAt - b.scheduledAt);
        resolve(pending);
      };
      req.onerror = () => reject(req.error);
    });
  },

  async delete(id: string): Promise<void> {
    const store = await getStore('readwrite');
    return new Promise((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },

  async update(push: AggregatedPush): Promise<AggregatedPush> {
    const store = await getStore('readwrite');
    const updated = { ...push, updatedAt: Date.now() };
    return new Promise((resolve, reject) => {
      const req = store.put(updated);
      req.onsuccess = () => resolve(updated);
      req.onerror = () => reject(req.error);
    });
  },
};

// Factory function for creating storage adapter (can be extended for Redis etc.)
export async function createStorageAdapter(): Promise<StorageAdapter> {
  // Ensure DB is initialized
  await openDB();
  return indexedDBStorageAdapter;
}

// Default adapter instance (singleton)
let defaultAdapter: StorageAdapter | null = null;

export async function getDefaultStorageAdapter(): Promise<StorageAdapter> {
  if (!defaultAdapter) {
    defaultAdapter = await createStorageAdapter();
  }
  return defaultAdapter;
}
