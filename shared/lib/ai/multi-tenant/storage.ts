/**
 * Multi-Tenant Storage
 * IndexedDB-based storage for tenant strategies and shared strategies
 */

import type { TenantStrategy } from './types';

const DB_NAME = 'ai-subscription-multi-tenant';
const STORE_NAME = 'tenant-strategies';
const DB_VERSION = 1;

let dbInstance: IDBDatabase | null = null;

/**
 * Initialize the multi-tenant database
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
        store.createIndex('tenantId', 'tenantId', { unique: false });
        store.createIndex('name', 'name', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('sharedWith', 'sharedWith', { unique: false });
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
 * Generate a unique ID for a new tenant strategy
 */
function generateId(): string {
  return `tenant-strategy-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Save a tenant strategy (create or update)
 */
export async function saveTenantStrategy(strategy: TenantStrategy): Promise<void> {
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
 * Create a new tenant strategy with generated ID and timestamps
 */
export async function createTenantStrategy(
  tenantId: string,
  name: string,
  strategy: TenantStrategy['strategy'],
  createdBy: string,
  isDefault: boolean = false,
  sharedWith: string[] = []
): Promise<TenantStrategy> {
  const now = Date.now();
  const tenantStrategy: TenantStrategy = {
    id: generateId(),
    tenantId,
    name,
    strategy: {
      ...strategy,
      id: strategy.id || generateId(),
    },
    isDefault,
    createdBy,
    sharedWith,
    createdAt: now,
    updatedAt: now,
  };

  await saveTenantStrategy(tenantStrategy);
  return tenantStrategy;
}

/**
 * Get all tenant strategies for a specific tenant
 */
export async function getTenantStrategies(tenantId: string): Promise<TenantStrategy[]> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('tenantId');
    const request = index.getAll(tenantId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
}

/**
 * Get a tenant strategy by ID
 */
export async function getTenantStrategy(id: string): Promise<TenantStrategy | null> {
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
 * Get all strategies shared with a specific tenant (via sharedWith array)
 */
export async function getSharedStrategies(tenantId: string): Promise<TenantStrategy[]> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const all = request.result || [];
      const shared = all.filter(
        (s: TenantStrategy) => s.sharedWith.includes(tenantId)
      );
      resolve(shared);
    };
  });
}

/**
 * Delete a tenant strategy by ID
 */
export async function deleteTenantStrategy(id: string): Promise<void> {
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
 * Update an existing tenant strategy
 */
export async function updateTenantStrategy(
  id: string,
  updates: Partial<Pick<TenantStrategy, 'name' | 'strategy' | 'isDefault' | 'sharedWith'>>
): Promise<TenantStrategy | null> {
  const existing = await getTenantStrategy(id);
  if (!existing) return null;

  const updated: TenantStrategy = {
    ...existing,
    ...updates,
    updatedAt: Date.now(),
  };

  await saveTenantStrategy(updated);
  return updated;
}
