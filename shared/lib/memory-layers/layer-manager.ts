/**
 * Layer Manager - Core 5-layer CRUD operations
 * 
 * Manages L0-L4 memory layers with IndexedDB persistence
 */

import { randomUUID } from 'crypto';
import type {
  MemoryEntry,
  MemoryLayer,
  MemorySource,
  MemoryConfig,
  LayerStats,
  QueryOptions,
} from './types';
import { getAttentionScore, scoreFromCostRecord } from './attention';

const DEFAULT_CONFIG: Required<MemoryConfig> = {
  dbName: 'ai-subscription-memory-layers',
  storeName: 'entries',
  version: 1,
  highCostThreshold: 0.05,
  l0ExpirationMs: 24 * 60 * 60 * 1000,  // 24 hours
  l1ExpirationMs: 7 * 24 * 60 * 60 * 1000, // 7 days
};

let db: IDBDatabase | null = null;
let config = DEFAULT_CONFIG;

function getConfig(): Required<MemoryConfig> {
  return config as Required<MemoryConfig>;
}

async function ensureDB(): Promise<IDBDatabase> {
  if (!db) {
    await initStorage();
  }
  return db!;
}

/**
 * Initialize IndexedDB storage
 */
export async function initStorage(cfg?: MemoryConfig): Promise<void> {
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
        store.createIndex('layer', 'layer', { unique: false });
        store.createIndex('timestamp', 'createdAt', { unique: false });
        store.createIndex('expiresAt', 'expiresAt', { unique: false });
        store.createIndex('score', 'score', { unique: false });
        store.createIndex('source', 'source', { unique: false });
      }
    };
  });
}

/**
 * Generate a new memory entry ID
 */
export function generateId(): string {
  return randomUUID();
}

/**
 * Create a new memory entry
 */
export async function store(entry: Omit<MemoryEntry, 'id'>): Promise<string> {
  const database = await ensureDB();
  const { storeName } = getConfig();
  const id = generateId();

  const fullEntry: MemoryEntry = {
    ...entry,
    id,
    accessCount: entry.accessCount ?? 0,
    lastAccessedAt: entry.lastAccessedAt ?? entry.createdAt,
  };

  return new Promise((resolve, reject) => {
    const tx = database.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.add(fullEntry);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(id);
  });
}

/**
 * Get a single entry by ID
 */
export async function get(id: string): Promise<MemoryEntry | undefined> {
  const database = await ensureDB();
  const { storeName } = getConfig();

  return new Promise((resolve, reject) => {
    const tx = database.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.get(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const entry = request.result as MemoryEntry | undefined;
      if (entry && entry.expiresAt && entry.expiresAt < Date.now()) {
        resolve(undefined);
      } else {
        resolve(entry);
      }
    };
  });
}

/**
 * Query entries by layer with optional filters
 */
export async function query(
  layer: MemoryLayer,
  options: QueryOptions = {}
): Promise<MemoryEntry[]> {
  const database = await ensureDB();
  const { storeName } = getConfig();
  const { limit = 50, includeExpired = false, minScore } = options;

  return new Promise((resolve, reject) => {
    const tx = database.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const index = store.index('layer');
    const request = index.getAll(layer);

    const now = Date.now();
    const results: MemoryEntry[] = [];

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const entries = request.result as MemoryEntry[];
      
      for (const entry of entries) {
        // Filter out expired entries unless included
        if (!includeExpired && entry.expiresAt && entry.expiresAt < now) {
          continue;
        }
        
        // Filter by minimum score if specified
        if (minScore !== undefined && entry.score < minScore) {
          continue;
        }
        
        results.push(entry);
      }

      // Sort by score descending, then by createdAt descending
      results.sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        return b.createdAt - a.createdAt;
      });

      resolve(results.slice(0, limit));
    };
  });
}

/**
 * Update an existing entry (increment access count, update score)
 */
export async function update(id: string, updates: Partial<MemoryEntry>): Promise<void> {
  const database = await ensureDB();
  const { storeName } = getConfig();

  const entry = await get(id);
  if (!entry) {
    throw new Error(`Entry not found: ${id}`);
  }

  const updated: MemoryEntry = {
    ...entry,
    ...updates,
    id, // Ensure ID is not changed
  };

  return new Promise((resolve, reject) => {
    const tx = database.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.put(updated);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Record an access to an entry, increment access count
 */
export async function recordAccess(id: string): Promise<void> {
  const entry = await get(id);
  if (entry) {
    const now = Date.now();
    // Recalculate score with new access count
    const newScore = getAttentionScore(
      (entry.metadata.costUSD as number) || 0,
      entry.accessCount + 1,
      entry.createdAt,
      now
    );
    
    await update(id, {
      accessCount: entry.accessCount + 1,
      lastAccessedAt: now,
      score: newScore,
    });
  }
}

/**
 * Delete an entry by ID
 */
export async function remove(id: string): Promise<void> {
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

/**
 * Store a high-cost record as L0 entry (bridge from cost-tracker)
 */
export async function promoteFromCost(
  record: import('../ai/cost-tracker/types').CostRecord
): Promise<string> {
  const { l0ExpirationMs } = getConfig();
  const expiresAt = Date.now() + l0ExpirationMs;
  const score = scoreFromCostRecord(record);

  return store({
    layer: 'L0',
    content: `High-cost operation: ${record.taskType} on ${record.modelId}`,
    source: 'cost-high',
    score,
    createdAt: record.timestamp,
    expiresAt,
    accessCount: 1,
    lastAccessedAt: record.timestamp,
    metadata: {
      costUSD: record.costUSD,
      taskType: record.taskType,
      modelId: record.modelId,
      provider: record.provider,
      inputTokens: record.inputTokens,
      outputTokens: record.outputTokens,
      latencyMs: record.latencyMs,
      success: record.success,
      originalRecordId: record.id,
    },
  });
}

/**
 * Promote an entry from one layer to another
 */
export async function promote(
  entryId: string,
  toLayer: MemoryLayer
): Promise<void> {
  const entry = await get(entryId);
  if (!entry) {
    throw new Error(`Entry not found: ${entryId}`);
  }

  const { l1ExpirationMs } = getConfig();
  const now = Date.now();
  
  let expiresAt: number | undefined;
  if (toLayer === 'L1') {
    expiresAt = now + l1ExpirationMs;
  }

  await update(entryId, {
    layer: toLayer,
    expiresAt,
    metadata: {
      ...entry.metadata,
      promotedFrom: entry.layer,
      promotedAt: now,
    },
  });
}

/**
 * Store a reflection in L4 (metacognitive memory)
 */
export async function reflect(
  evaluation: string,
  metadata: Record<string, unknown> = {}
): Promise<string> {
  return store({
    layer: 'L4',
    content: evaluation,
    source: 'agent-reflection',
    score: 50, // Default score for reflections
    createdAt: Date.now(),
    accessCount: 0,
    metadata: {
      ...metadata,
      type: 'reflection',
    },
  });
}

/**
 * Store a user action in L2 (semantic memory)
 */
export async function storeUserAction(
  content: string,
  metadata: Record<string, unknown> = {}
): Promise<string> {
  return store({
    layer: 'L2',
    content,
    source: 'user-action',
    score: 50,
    createdAt: Date.now(),
    accessCount: 0,
    metadata,
  });
}

/**
 * Get statistics for each layer
 */
export async function getStats(): Promise<LayerStats[]> {
  const layers: MemoryLayer[] = ['L0', 'L1', 'L2', 'L3', 'L4'];
  const stats: LayerStats[] = [];
  const now = Date.now();

  for (const layer of layers) {
    const entries = await query(layer, { includeExpired: false });
    
    let oldestEntry: number | undefined;
    let newestEntry: number | undefined;

    if (entries.length > 0) {
      oldestEntry = Math.min(...entries.map(e => e.createdAt));
      newestEntry = Math.max(...entries.map(e => e.createdAt));
    }

    stats.push({
      layer,
      count: entries.length,
      oldestEntry,
      newestEntry,
    });
  }

  return stats;
}

/**
 * Delete all expired entries
 */
export async function deleteExpired(): Promise<number> {
  const database = await ensureDB();
  const { storeName } = getConfig();
  const now = Date.now();

  return new Promise((resolve, reject) => {
    const tx = database.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const index = store.index('expiresAt');
    const range = IDBKeyRange.upperBound(now);
    const request = index.openCursor(range);

    let deletedCount = 0;

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        cursor.delete();
        deletedCount++;
        cursor.continue();
      } else {
        resolve(deletedCount);
      }
    };
  });
}

/**
 * Clear all entries in a specific layer
 */
export async function clearLayer(layer: MemoryLayer): Promise<void> {
  const database = await ensureDB();
  const { storeName } = getConfig();

  const entries = await query(layer, { includeExpired: true });

  return new Promise((resolve, reject) => {
    const tx = database.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);

    let remaining = entries.length;

    if (remaining === 0) {
      resolve();
      return;
    }

    tx.oncomplete = () => resolve();

    for (const entry of entries) {
      const deleteRequest = store.delete(entry.id);
      deleteRequest.onsuccess = () => {
        remaining--;
      };
    }
  });
}

/**
 * Clear all entries from all layers
 */
export async function clearAll(): Promise<void> {
  const database = await ensureDB();
  const { storeName } = getConfig();

  return new Promise((resolve, reject) => {
    const tx = database.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.clear();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Get total entry count across all layers
 */
export async function getTotalCount(): Promise<number> {
  const database = await ensureDB();
  const { storeName } = getConfig();

  return new Promise((resolve, reject) => {
    const tx = database.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.count();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

// Export the LayerManager-like object for convenience
export const layerManager = {
  initStorage,
  store,
  get,
  query,
  update,
  remove,
  recordAccess,
  promote,
  promoteFromCost,
  reflect,
  storeUserAction,
  getStats,
  deleteExpired,
  clearLayer,
  clearAll,
  getTotalCount,
  generateId,
};

export default layerManager;