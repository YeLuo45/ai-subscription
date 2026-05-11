// IndexedDB storage for cost records

import type { CostRecord } from './types';

const DB_NAME = 'ai-subscription-costs';
const STORE_NAME = 'records';
const DB_VERSION = 1;

let db: IDBDatabase | null = null;

export async function initStorage(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve();
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('taskType', 'taskType', { unique: false });
        store.createIndex('modelId', 'modelId', { unique: false });
      }
    };
  });
}

export async function addRecord(record: CostRecord): Promise<void> {
  if (!db) await initStorage();

  return new Promise((resolve, reject) => {
    const tx = db!.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.add(record);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function getRecordsByTimeRange(
  startTime: number,
  endTime: number
): Promise<CostRecord[]> {
  if (!db) await initStorage();

  return new Promise((resolve, reject) => {
    const tx = db!.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('timestamp');
    const range = IDBKeyRange.bound(startTime, endTime);
    const request = index.getAll(range);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

export async function getAllRecords(): Promise<CostRecord[]> {
  if (!db) await initStorage();

  return new Promise((resolve, reject) => {
    const tx = db!.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

export async function clearAllRecords(): Promise<void> {
  if (!db) await initStorage();

  return new Promise((resolve, reject) => {
    const tx = db!.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.clear();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function deleteOldRecords(beforeTimestamp: number): Promise<void> {
  if (!db) await initStorage();

  return new Promise((resolve, reject) => {
    const tx = db!.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
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
