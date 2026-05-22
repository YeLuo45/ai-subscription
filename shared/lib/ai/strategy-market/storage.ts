/**
 * Strategy Storage
 * IndexedDB-based storage for user-defined strategies
 */

import type { UserStrategy } from './types';

const DB_NAME = 'ai-subscription-strategies';
const STORE_NAME = 'user-strategies';
const DB_VERSION = 1;

let dbInstance: IDBDatabase | null = null;

/**
 * Initialize the strategies database
 */
async function initDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('name', 'name', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('isPublic', 'isPublic', { unique: false });
      }
    };
  });
}

/**
 * Get database instance
 */
async function getDB(): Promise<IDBDatabase> {
  if (!dbInstance) await initDB();
  return dbInstance!;
}

/**
 * Generate a unique ID for a new strategy
 */
function generateId(): string {
  return `user-strategy-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Save a user strategy (create or update)
 */
export async function saveUserStrategy(strategy: UserStrategy): Promise<void> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(strategy);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Create a new user strategy with generated ID and timestamps
 */
export async function createUserStrategy(
  name: string,
  strategy: UserStrategy['strategy'],
  isPublic: boolean = false
): Promise<UserStrategy> {
  const now = Date.now();
  const userStrategy: UserStrategy = {
    id: generateId(),
    name,
    strategy: {
      ...strategy,
      id: generateId(),
    },
    isPublic,
    createdAt: now,
    updatedAt: now,
  };

  await saveUserStrategy(userStrategy);
  return userStrategy;
}

/**
 * Get all user strategies
 */
export async function getUserStrategies(): Promise<UserStrategy[]> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
}

/**
 * Get a user strategy by ID
 */
export async function getUserStrategy(id: string): Promise<UserStrategy | null> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

/**
 * Delete a user strategy by ID
 */
export async function deleteUserStrategy(id: string): Promise<void> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Update an existing user strategy
 */
export async function updateUserStrategy(
  id: string,
  updates: Partial<Pick<UserStrategy, 'name' | 'strategy' | 'isPublic'>>
): Promise<UserStrategy | null> {
  const existing = await getUserStrategy(id);
  if (!existing) return null;

  const updated: UserStrategy = {
    ...existing,
    ...updates,
    updatedAt: Date.now(),
  };

  await saveUserStrategy(updated);
  return updated;
}
