/**
 * IndexedDB Database Layer for Sync Features
 * Tables: sync_config, sync_history
 */

const DB_NAME = 'ai-subscription';
const DB_VERSION = 2;

let dbInstance: IDBDatabase | null = null;

export interface SyncConfig {
  id: string;
  service: 'readwise' | 'instapaper';
  config: Record<string, string>;
  createdAt: number;
  updatedAt: number;
}

export interface SyncHistory {
  id: string;
  service: 'readwise' | 'instapaper';
  action: 'sync' | 'save';
  articleId?: string;
  articleTitle?: string;
  status: 'success' | 'failed';
  error?: string;
  syncedAt: number;
}

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

      // sync_config table
      if (!db.objectStoreNames.contains('sync_config')) {
        const configStore = db.createObjectStore('sync_config', { keyPath: 'id' });
        configStore.createIndex('service', 'service', { unique: true });
      }

      // sync_history table
      if (!db.objectStoreNames.contains('sync_history')) {
        const historyStore = db.createObjectStore('sync_history', { keyPath: 'id' });
        historyStore.createIndex('service', 'service', { unique: false });
        historyStore.createIndex('syncedAt', 'syncedAt', { unique: false });
      }
    };
  });
}

function tx(storeName: string, mode: IDBTransactionMode = 'readonly') {
  return openDB().then(db => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    return { transaction, store };
  });
}

function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ============================================================
// Sync Config Operations
// ============================================================

export async function getSyncConfig(service: SyncConfig['service']): Promise<SyncConfig | undefined> {
  const { store } = await tx('sync_config');
  const index = store.index('service');
  return promisifyRequest(index.get(service));
}

export async function saveSyncConfig(config: SyncConfig): Promise<void> {
  const { store } = await tx('sync_config', 'readwrite');
  await promisifyRequest(store.put(config));
}

export async function deleteSyncConfig(service: SyncConfig['service']): Promise<void> {
  const { store } = await tx('sync_config', 'readwrite');
  const index = store.index('service');
  const config = await promisifyRequest<SyncConfig | undefined>(index.get(service));
  if (config) {
    await promisifyRequest(store.delete(config.id));
  }
}

export async function getAllSyncConfigs(): Promise<SyncConfig[]> {
  const { store } = await tx('sync_config');
  return promisifyRequest(store.getAll());
}

// ============================================================
// Sync History Operations
// ============================================================

export async function addSyncHistory(history: SyncHistory): Promise<void> {
  const { store } = await tx('sync_history', 'readwrite');
  await promisifyRequest(store.put(history));
}

export async function getSyncHistory(service?: SyncHistory['service'], limit = 50): Promise<SyncHistory[]> {
  const { store } = await tx('sync_history');
  const index = store.index('syncedAt');
  const all = await promisifyRequest<SyncHistory[]>(index.getAll());
  
  let filtered = service ? all.filter(h => h.service === service) : all;
  filtered.sort((a, b) => b.syncedAt - a.syncedAt);
  return filtered.slice(0, limit);
}

export async function getLastSyncTime(service: SyncHistory['service']): Promise<number | null> {
  const history = await getSyncHistory(service, 1);
  return history.length > 0 ? history[0].syncedAt : null;
}

export async function clearSyncHistory(service?: SyncHistory['service']): Promise<void> {
  const { store } = await tx('sync_history', 'readwrite');
  if (service) {
    const all = await promisifyRequest<SyncHistory[]>(store.getAll());
    for (const h of all.filter(item => item.service === service)) {
      store.delete(h.id);
    }
  } else {
    const all = await promisifyRequest<SyncHistory[]>(store.getAll());
    for (const h of all) {
      store.delete(h.id);
    }
  }
}
