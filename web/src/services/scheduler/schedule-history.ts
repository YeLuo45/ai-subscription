// Schedule history - IndexedDB storage for execution records
import type { ScheduleRecord } from './types';

const DB_NAME = 'ai-subscription-scheduler';
const STORE_NAME = 'schedule-history';
const MAX_RECORDS = 100;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('jobId', 'jobId', { unique: false });
        store.createIndex('executedAt', 'executedAt', { unique: false });
        store.createIndex('status', 'status', { unique: false });
      }
    };
  });
}

export async function saveScheduleRecord(record: ScheduleRecord): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getScheduleHistory(
  limit = 50,
  status?: ScheduleRecord['status']
): Promise<ScheduleRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => {
      let records = request.result as ScheduleRecord[];
      
      // Filter by status if specified
      if (status) {
        records = records.filter(r => r.status === status);
      }
      
      // Sort by executedAt descending and limit
      records.sort((a, b) => b.executedAt - a.executedAt);
      records = records.slice(0, limit);
      
      resolve(records);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getScheduleHistoryByJob(
  jobId: string,
  limit = 20
): Promise<ScheduleRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('jobId');
    const request = index.getAll(jobId);
    request.onsuccess = () => {
      const records = (request.result as ScheduleRecord[])
        .sort((a, b) => b.executedAt - a.executedAt)
        .slice(0, limit);
      resolve(records);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function deleteOldRecords(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => {
      const records = request.result as ScheduleRecord[];
      records.sort((a, b) => b.executedAt - a.executedAt);
      
      // Delete records beyond MAX_RECORDS
      const toDelete = records.slice(MAX_RECORDS);
      for (const record of toDelete) {
        store.delete(record.id);
      }
      
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
    request.onerror = () => reject(request.error);
  });
}
