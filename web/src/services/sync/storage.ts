/**
 * IndexedDB Storage Layer for Sync Features
 * Extended table structure: subscriptions, articles, tags, notes, reading_progress
 */

const DB_NAME = 'ai-subscription-sync';
const DB_VERSION = 1;

let dbInstance: IDBDatabase | null = null;

export function getDB(): Promise<IDBDatabase> {
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

      // sync_queue - pending operations
      if (!db.objectStoreNames.contains('sync_queue')) {
        const queueStore = db.createObjectStore('sync_queue', { keyPath: 'id' });
        queueStore.createIndex('entityType', 'entityType', { unique: false });
        queueStore.createIndex('entityId', 'entityId', { unique: false });
        queueStore.createIndex('localUpdatedAt', 'localUpdatedAt', { unique: false });
      }

      // sync_config - device and adapter configuration
      if (!db.objectStoreNames.contains('sync_config')) {
        const configStore = db.createObjectStore('sync_config', { keyPath: 'id' });
        configStore.createIndex('adapter', 'adapter', { unique: false });
      }

      // sync_conflicts - unresolved conflicts
      if (!db.objectStoreNames.contains('sync_conflicts')) {
        const conflictStore = db.createObjectStore('sync_conflicts', { keyPath: 'id' });
        conflictStore.createIndex('entityType', 'entityType', { unique: false });
        conflictStore.createIndex('detectedAt', 'detectedAt', { unique: false });
      }

      // sync_history - sync operation history
      if (!db.objectStoreNames.contains('sync_history')) {
        const historyStore = db.createObjectStore('sync_history', { keyPath: 'id' });
        historyStore.createIndex('syncedAt', 'syncedAt', { unique: false });
      }

      // subscriptions - feed subscriptions with sync metadata
      if (!db.objectStoreNames.contains('subscriptions')) {
        const subStore = db.createObjectStore('subscriptions', { keyPath: 'id' });
        subStore.createIndex('syncStatus', 'syncStatus', { unique: false });
        subStore.createIndex('localUpdatedAt', 'localUpdatedAt', { unique: false });
        subStore.createIndex('deviceId', 'deviceId', { unique: false });
      }

      // articles - content items with sync metadata
      if (!db.objectStoreNames.contains('articles')) {
        const articleStore = db.createObjectStore('articles', { keyPath: 'id' });
        articleStore.createIndex('feedId', 'feedId', { unique: false });
        articleStore.createIndex('syncStatus', 'syncStatus', { unique: false });
        articleStore.createIndex('localUpdatedAt', 'localUpdatedAt', { unique: false });
        articleStore.createIndex('isRead', 'isRead', { unique: false });
        articleStore.createIndex('isBookmarked', 'isBookmarked', { unique: false });
      }

      // tags - content tags with sync metadata
      if (!db.objectStoreNames.contains('tags')) {
        const tagStore = db.createObjectStore('tags', { keyPath: 'id' });
        tagStore.createIndex('syncStatus', 'syncStatus', { unique: false });
        tagStore.createIndex('localUpdatedAt', 'localUpdatedAt', { unique: false });
      }

      // notes - article notes with sync metadata
      if (!db.objectStoreNames.contains('notes')) {
        const noteStore = db.createObjectStore('notes', { keyPath: 'id' });
        noteStore.createIndex('articleId', 'articleId', { unique: false });
        noteStore.createIndex('syncStatus', 'syncStatus', { unique: false });
        noteStore.createIndex('localUpdatedAt', 'localUpdatedAt', { unique: false });
      }

      // reading_progress - reading progress per article with sync metadata
      if (!db.objectStoreNames.contains('reading_progress')) {
        const progressStore = db.createObjectStore('reading_progress', { keyPath: 'id' });
        progressStore.createIndex('articleId', 'articleId', { unique: false });
        progressStore.createIndex('syncStatus', 'syncStatus', { unique: false });
        progressStore.createIndex('localUpdatedAt', 'localUpdatedAt', { unique: false });
      }
    };
  });
}

function tx(storeName: string, mode: IDBTransactionMode = 'readonly') {
  return getDB().then(db => {
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

export async function getSyncConfig(): Promise<import('./types').SyncConfig | null> {
  const { store } = await tx('sync_config', 'readonly');
  const result = await promisifyRequest(store.get('default'));
  return result || null;
}

export async function saveSyncConfig(config: import('./types').SyncConfig): Promise<void> {
  const { store } = await tx('sync_config', 'readwrite');
  await promisifyRequest(store.put({ ...config, id: 'default' }));
}

// ============================================================
// Sync Queue Operations (Offline Queue)
// ============================================================

export async function addToSyncQueue(record: import('./types').SyncRecord): Promise<void> {
  const { store } = await tx('sync_queue', 'readwrite');
  await promisifyRequest(store.put(record));
}

export async function getPendingSyncRecords(): Promise<import('./types').SyncRecord[]> {
  const { store } = await tx('sync_queue', 'readonly');
  const all = await promisifyRequest<import('./types').SyncRecord[]>(store.getAll());
  return all.sort((a, b) => a.localUpdatedAt - b.localUpdatedAt);
}

export async function removeSyncRecord(id: string): Promise<void> {
  const { store } = await tx('sync_queue', 'readwrite');
  await promisifyRequest(store.delete(id));
}

export async function clearSyncQueue(): Promise<void> {
  const { store } = await tx('sync_queue', 'readwrite');
  await promisifyRequest(store.clear());
}

// ============================================================
// Sync Conflicts Operations
// ============================================================

export async function addConflict(conflict: import('./types').ConflictRecord): Promise<void> {
  const { store } = await tx('sync_conflicts', 'readwrite');
  await promisifyRequest(store.put(conflict));
}

export async function getUnresolvedConflicts(): Promise<import('./types').ConflictRecord[]> {
  const { store } = await tx('sync_conflicts', 'readonly');
  return promisifyRequest<import('./types').ConflictRecord[]>(store.getAll());
}

export async function resolveConflict(id: string): Promise<void> {
  const { store } = await tx('sync_conflicts', 'readwrite');
  await promisifyRequest(store.delete(id));
}

// ============================================================
// Sync History Operations
// ============================================================

export async function addSyncHistory(
  operation: string,
  result: { pushed: number; pulled: number; conflicts: number; errors: string[] }
): Promise<void> {
  const { store } = await tx('sync_history', 'readwrite');
  await promisifyRequest(store.put({
    id: `history_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    operation,
    ...result,
    syncedAt: Date.now(),
  }));
}

export async function getSyncHistory(limit = 50): Promise<Array<{
  id: string;
  operation: string;
  pushed: number;
  pulled: number;
  conflicts: number;
  errors: string[];
  syncedAt: number;
}>> {
  const { store } = await tx('sync_history', 'readonly');
  const all = await promisifyRequest(store.getAll());
  return all
    .sort((a: any, b: any) => b.syncedAt - a.syncedAt)
    .slice(0, limit);
}

// ============================================================
// Generic Entity Operations (for sync metadata)
// ============================================================

type EntityType = 'subscriptions' | 'articles' | 'tags' | 'notes' | 'reading_progress';

export async function getEntityById<T>(storeName: EntityType, id: string): Promise<T | undefined> {
  const { store } = await tx(storeName, 'readonly');
  return promisifyRequest(store.get(id));
}

export async function getAllEntities<T>(storeName: EntityType): Promise<T[]> {
  const { store } = await tx(storeName, 'readonly');
  return promisifyRequest<T[]>(store.getAll());
}

export async function putEntity<T extends { id: string }>(storeName: EntityType, entity: T): Promise<void> {
  const { store } = await tx(storeName, 'readwrite');
  await promisifyRequest(store.put(entity));
}

export async function deleteEntity(storeName: EntityType, id: string): Promise<void> {
  const { store } = await tx(storeName, 'readwrite');
  await promisifyRequest(store.delete(id));
}

export async function getEntitiesByStatus<T>(storeName: EntityType, status: import('./types').SyncStatus): Promise<T[]> {
  const { store } = await tx(storeName, 'readonly');
  const index = store.index('syncStatus');
  return promisifyRequest<T[]>(index.getAll(status));
}

export async function getEntitiesUpdatedSince<T>(storeName: EntityType, since: number): Promise<T[]> {
  const { store } = await tx(storeName, 'readonly');
  const all = await promisifyRequest<T[]>(store.getAll());
  const withMeta = all as Array<T & { localUpdatedAt: number }>;
  return withMeta.filter(e => e.localUpdatedAt > since);
}