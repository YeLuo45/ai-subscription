/**
 * Version History Management
 * Stores and retrieves version chains for entities
 */

import { VersionEntry, DiffResult } from './types';

const DB_NAME = 'ai-subscription-versions';
const DB_VERSION = 1;
const STORE_NAME = 'versions';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('entityId', 'entityId', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });

  return dbPromise;
}

function generateId(): string {
  return crypto.randomUUID();
}

export async function saveVersion(version: VersionEntry): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(version);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function getVersion(id: string): Promise<VersionEntry | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

export async function getVersionChain(entityId: string): Promise<VersionEntry[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('entityId');
    const request = index.getAll(entityId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const versions = request.result as VersionEntry[];
      // Sort by timestamp ascending
      versions.sort((a, b) => a.timestamp - b.timestamp);
      resolve(versions);
    };
  });
}

export async function getLatestVersion(entityId: string): Promise<VersionEntry | null> {
  const chain = await getVersionChain(entityId);
  if (chain.length === 0) return null;
  return chain[chain.length - 1];
}

export async function createVersion(
  entityId: string,
  changes: Record<string, unknown>,
  user: string,
  parent: string | null,
  vectorClock: Record<string, number>
): Promise<VersionEntry> {
  const version: VersionEntry = {
    id: generateId(),
    entityId,
    timestamp: Date.now(),
    user,
    changes,
    parent,
    vectorClock
  };

  await saveVersion(version);
  return version;
}

export async function deleteVersion(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function clearVersionsForEntity(entityId: string): Promise<void> {
  const chain = await getVersionChain(entityId);
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    let pending = chain.length;
    if (pending === 0) {
      resolve();
      return;
    }

    for (const version of chain) {
      const request = store.delete(version.id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        pending--;
        if (pending === 0) resolve();
      };
    }
  });
}

export function diff(v1: VersionEntry, v2: VersionEntry): DiffResult {
  const added: Record<string, unknown> = {};
  const removed: Record<string, unknown> = {};
  const modified: Record<string, { old: unknown; new: unknown }> = {};

  const keys1 = Object.keys(v1.changes);
  const keys2 = Object.keys(v2.changes);

  // Find added and modified keys
  for (let i = 0; i < keys2.length; i++) {
    const key = keys2[i];
    if (!keys1.includes(key)) {
      added[key] = v2.changes[key];
    } else {
      const oldVal = v1.changes[key];
      const newVal = v2.changes[key];
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        modified[key] = { old: oldVal, new: newVal };
      }
    }
  }

  // Find removed keys
  for (let i = 0; i < keys1.length; i++) {
    const key = keys1[i];
    if (!keys2.includes(key)) {
      removed[key] = v1.changes[key];
    }
  }

  const hasChanges = Object.keys(added).length > 0 ||
    Object.keys(removed).length > 0 ||
    Object.keys(modified).length > 0;

  return { hasChanges, added, removed, modified };
}

export function formatVersionChain(chain: VersionEntry[]): string[] {
  return chain.map((v, idx) => {
    const parent = v.parent ? `← ${v.parent.substring(0, 8)}` : '';
    return `[${idx + 1}] ${v.id.substring(0, 8)}${parent} (${v.user}, ${new Date(v.timestamp).toLocaleString()})`;
  });
}