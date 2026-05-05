/**
 * IndexedDB Database Layer for API Keys and Logs
 * Tables: api_keys, api_logs
 */

const DB_NAME = 'ai-subscription';
const DB_VERSION = 3;

let dbInstance: IDBDatabase | null = null;

export interface ApiKey {
  id: string;
  key: string;                    // Format: aisub_xxx
  name: string;                    // User-provided name
  createdAt: number;
  lastUsedAt: number | null;
  revoked: boolean;
}

export interface ApiLog {
  id: string;
  keyId: string;
  endpoint: string;
  method: string;
  statusCode: number;
  requestParams: Record<string, string>;
  responseData?: unknown;
  error?: string;
  timestamp: number;
  duration: number;                // ms
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

      // api_keys table
      if (!db.objectStoreNames.contains('api_keys')) {
        const keyStore = db.createObjectStore('api_keys', { keyPath: 'id' });
        keyStore.createIndex('key', 'key', { unique: true });
        keyStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // api_logs table
      if (!db.objectStoreNames.contains('api_logs')) {
        const logStore = db.createObjectStore('api_logs', { keyPath: 'id' });
        logStore.createIndex('keyId', 'keyId', { unique: false });
        logStore.createIndex('timestamp', 'timestamp', { unique: false });
        logStore.createIndex('endpoint', 'endpoint', { unique: false });
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
// API Key Operations
// ============================================================

export function generateApiKey(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'aisub_';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function createApiKey(name: string): Promise<ApiKey> {
  const id = `apikey_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const key = generateApiKey();
  const now = Date.now();
  
  const apiKey: ApiKey = {
    id,
    key,
    name,
    createdAt: now,
    lastUsedAt: null,
    revoked: false,
  };

  const { store } = await tx('api_keys', 'readwrite');
  await promisifyRequest(store.put(apiKey));
  return apiKey;
}

export async function getAllApiKeys(): Promise<ApiKey[]> {
  const { store } = await tx('api_keys');
  const all = await promisifyRequest<ApiKey[]>(store.getAll());
  return all.filter(k => !k.revoked).sort((a, b) => b.createdAt - a.createdAt);
}

export async function getApiKeyByKey(key: string): Promise<ApiKey | undefined> {
  const { store } = await tx('api_keys');
  const index = store.index('key');
  return promisifyRequest(index.get(key));
}

export async function revokeApiKey(id: string): Promise<void> {
  const { store } = await tx('api_keys', 'readwrite');
  const key = await promisifyRequest<ApiKey | undefined>(store.get(id));
  if (key) {
    key.revoked = true;
    await promisifyRequest(store.put(key));
  }
}

export async function updateApiKeyLastUsed(id: string): Promise<void> {
  const { store } = await tx('api_keys', 'readwrite');
  const key = await promisifyRequest<ApiKey | undefined>(store.get(id));
  if (key) {
    key.lastUsedAt = Date.now();
    await promisifyRequest(store.put(key));
  }
}

// ============================================================
// API Log Operations
// ============================================================

export async function addApiLog(log: Omit<ApiLog, 'id'>): Promise<void> {
  const id = `apilog_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const fullLog: ApiLog = { ...log, id };

  const { store } = await tx('api_logs', 'readwrite');
  await promisifyRequest(store.put(fullLog));
}

export async function getApiLogs(keyId?: string, limit = 100): Promise<ApiLog[]> {
  const { store } = await tx('api_logs');
  const index = store.index('timestamp');
  const all = await promisifyRequest<ApiLog[]>(index.getAll());
  
  let filtered = keyId ? all.filter(l => l.keyId === keyId) : all;
  filtered.sort((a, b) => b.timestamp - a.timestamp);
  return filtered.slice(0, limit);
}

export async function clearApiLogs(keyId?: string): Promise<void> {
  const { store } = await tx('api_logs', 'readwrite');
  const all = await promisifyRequest<ApiLog[]>(store.getAll());
  
  for (const log of all) {
    if (!keyId || log.keyId === keyId) {
      store.delete(log.id);
    }
  }
}
