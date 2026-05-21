/**
 * IndexedDB Storage for Routing History
 * Stores routing decisions and竞价历史
 */

import type { RoutingDecision } from './types';

const DB_NAME = 'ai-subscription';
const STORE_NAME = 'routing-history';
const DB_VERSION = 1;

let db: IDBDatabase | null = null;

/**
 * Initialize the database
 */
async function initDB(): Promise<IDBDatabase> {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Create routing-history store
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('taskType', 'taskType', { unique: false });
      }
    };
  });
}

/**
 * Ensure database is initialized
 */
async function ensureDB(): Promise<IDBDatabase> {
  if (!db) await initDB();
  return db!;
}

/**
 * Save a routing decision to history
 */
export async function saveRoutingDecision(decision: RoutingDecision): Promise<void> {
  const database = await ensureDB();

  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(decision);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Get routing history with optional limit
 */
export async function getRoutingHistory(limit: number = 100): Promise<RoutingDecision[]> {
  const database = await ensureDB();

  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('timestamp');
    const request = index.openCursor(null, 'prev');

    const results: RoutingDecision[] = [];

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

/**
 * Clear all routing history
 */
export async function clearRoutingHistory(): Promise<void> {
  const database = await ensureDB();

  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.clear();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}
