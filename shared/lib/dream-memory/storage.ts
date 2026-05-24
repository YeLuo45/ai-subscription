/**
 * Dream Memory Storage - IndexedDB persistence for DreamEntry
 */

import type { DreamEntry, DreamStorageConfig } from './types';

const DEFAULT_CONFIG: DreamStorageConfig = {
  dbName: 'ai-subscription-dreams',
  storeName: 'dreams',
  version: 1,
};

let db: IDBDatabase | null = null;
let config = DEFAULT_CONFIG;

function getConfig(): Required<DreamStorageConfig> {
  return {
    dbName: config.dbName || DEFAULT_CONFIG.dbName,
    storeName: config.storeName || DEFAULT_CONFIG.storeName,
    version: config.version || DEFAULT_CONFIG.version,
  };
}

export async function initStorage(cfg?: DreamStorageConfig): Promise<void> {
  if (cfg) {
    config = { ...DEFAULT_CONFIG, ...cfg };
  }
  const { dbName, storeName, version } = getConfig();

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, version);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve();
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains(storeName)) {
        const store = database.createObjectStore(storeName, { keyPath: 'id' });
        store.createIndex('sessionId', 'sessionId', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('articleUrl', 'articleUrl', { unique: false });
      }
    };
  });
}

async function ensureDB(): Promise<IDBDatabase> {
  if (!db) {
    await initStorage();
  }
  return db!;
}

export async function createDream(entry: DreamEntry): Promise<void> {
  const database = await ensureDB();
  const { storeName } = getConfig();

  return new Promise((resolve, reject) => {
    const tx = database.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.add(entry);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function getDream(id: string): Promise<DreamEntry | undefined> {
  const database = await ensureDB();
  const { storeName } = getConfig();

  return new Promise((resolve, reject) => {
    const tx = database.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.get(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

export async function getRecentDreams(limit: number = 10): Promise<DreamEntry[]> {
  const database = await ensureDB();
  const { storeName } = getConfig();

  return new Promise((resolve, reject) => {
    const tx = database.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const index = store.index('timestamp');
    const request = index.openCursor(null, 'prev');

    const results: DreamEntry[] = [];

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor && results.length < limit) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(results);
      }
    };
  });
}

export async function getDreamsBySession(sessionId: string): Promise<DreamEntry[]> {
  const database = await ensureDB();
  const { storeName } = getConfig();

  return new Promise((resolve, reject) => {
    const tx = database.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const index = store.index('sessionId');
    const request = index.getAll(sessionId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

export async function deleteDream(id: string): Promise<void> {
  const database = await ensureDB();
  const { storeName } = getConfig();

  return new Promise((resolve, reject) => {
    const tx = database.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function clearOldDreams(beforeTimestamp: number): Promise<void> {
  const database = await ensureDB();
  const { storeName } = getConfig();

  return new Promise((resolve, reject) => {
    const tx = database.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const index = store.index('timestamp');
    const range = IDBKeyRange.upperBound(beforeTimestamp);
    const request = index.openCursor(range);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      } else {
        resolve();
      }
    };
  });
}

export async function getAllDreams(): Promise<DreamEntry[]> {
  const database = await ensureDB();
  const { storeName } = getConfig();

  return new Promise((resolve, reject) => {
    const tx = database.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

export async function updateDream(entry: DreamEntry): Promise<void> {
  const database = await ensureDB();
  const { storeName } = getConfig();

  return new Promise((resolve, reject) => {
    const tx = database.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.put(entry);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}