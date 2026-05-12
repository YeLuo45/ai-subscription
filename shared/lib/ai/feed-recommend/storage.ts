/**
 * IndexedDB Storage for Feed Recommendation
 * Stores user interest profiles, recommendations, and read history
 */

import type { UserInterestProfile, FeedRecommendation, ReadHistoryEntry } from './types';

const DB_NAME = 'ai-subscription-feed-recommend';
const DB_VERSION = 1;

const STORES = {
  INTEREST_PROFILES: 'interest_profiles',
  RECOMMENDATIONS: 'recommendations',
  READ_HISTORY: 'read_history',
} as const;

let db: IDBDatabase | null = null;

/**
 * Initialize the database
 */
export async function initStorage(): Promise<void> {
  if (db) return;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve();
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Interest profiles store (one per user)
      if (!database.objectStoreNames.contains(STORES.INTEREST_PROFILES)) {
        const store = database.createObjectStore(STORES.INTEREST_PROFILES, { keyPath: 'id' });
        store.createIndex('userId', 'userId', { unique: true });
      }

      // Recommendations store
      if (!database.objectStoreNames.contains(STORES.RECOMMENDATIONS)) {
        const store = database.createObjectStore(STORES.RECOMMENDATIONS, { keyPath: 'id' });
        store.createIndex('feedUrl', 'feedUrl', { unique: false });
        store.createIndex('fetchedAt', 'fetchedAt', { unique: false });
      }

      // Read history store
      if (!database.objectStoreNames.contains(STORES.READ_HISTORY)) {
        const store = database.createObjectStore(STORES.READ_HISTORY, { keyPath: 'id' });
        store.createIndex('feedId', 'feedId', { unique: false });
        store.createIndex('articleId', 'articleId', { unique: false });
        store.createIndex('readAt', 'readAt', { unique: false });
      }
    };
  });
}

/**
 * Ensure database is initialized
 */
async function ensureDB(): Promise<IDBDatabase> {
  if (!db) await initStorage();
  return db!;
}

// ============================================================
// Interest Profile Operations
// ============================================================

/**
 * Save user interest profile
 */
export async function saveInterestProfile(profile: UserInterestProfile): Promise<void> {
  const database = await ensureDB();

  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORES.INTEREST_PROFILES, 'readwrite');
    const store = tx.objectStore(STORES.INTEREST_PROFILES);
    const request = store.put(profile);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Get interest profile by user ID
 */
export async function getInterestProfile(userId: string): Promise<UserInterestProfile | null> {
  const database = await ensureDB();

  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORES.INTEREST_PROFILES, 'readonly');
    const store = tx.objectStore(STORES.INTEREST_PROFILES);
    const index = store.index('userId');
    const request = index.get(userId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

// ============================================================
// Recommendation Operations
// ============================================================

/**
 * Save feed recommendations
 */
export async function saveRecommendations(recommendations: FeedRecommendation[]): Promise<void> {
  const database = await ensureDB();

  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORES.RECOMMENDATIONS, 'readwrite');
    const store = tx.objectStore(STORES.RECOMMENDATIONS);

    // Clear existing recommendations first
    store.clear();

    // Add new recommendations
    for (const rec of recommendations) {
      store.put(rec);
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Get all recommendations
 */
export async function getRecommendations(): Promise<FeedRecommendation[]> {
  const database = await ensureDB();

  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORES.RECOMMENDATIONS, 'readonly');
    const store = tx.objectStore(STORES.RECOMMENDATIONS);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Delete a recommendation by ID
 */
export async function deleteRecommendation(id: string): Promise<void> {
  const database = await ensureDB();

  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORES.RECOMMENDATIONS, 'readwrite');
    const store = tx.objectStore(STORES.RECOMMENDATIONS);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// ============================================================
// Read History Operations
// ============================================================

/**
 * Save a read history entry
 */
export async function saveReadHistory(entry: ReadHistoryEntry): Promise<void> {
  const database = await ensureDB();

  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORES.READ_HISTORY, 'readwrite');
    const store = tx.objectStore(STORES.READ_HISTORY);
    const request = store.put(entry);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Get read history for a user (limited to recent entries)
 */
export async function getReadHistory(userId: string, limit: number = 100): Promise<ReadHistoryEntry[]> {
  const database = await ensureDB();

  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORES.READ_HISTORY, 'readonly');
    const store = tx.objectStore(STORES.READ_HISTORY);
    const index = store.index('readAt');
    const request = index.openCursor(null, 'prev');

    const results: ReadHistoryEntry[] = [];

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor && results.length < limit) {
        // Filter by userId if needed (we store feedId/feedTitle which implies user context)
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(results);
      }
    };
  });
}

/**
 * Get all read history entries
 */
export async function getAllReadHistory(): Promise<ReadHistoryEntry[]> {
  const database = await ensureDB();

  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORES.READ_HISTORY, 'readonly');
    const store = tx.objectStore(STORES.READ_HISTORY);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Get read history by feed ID
 */
export async function getReadHistoryByFeed(feedId: string): Promise<ReadHistoryEntry[]> {
  const database = await ensureDB();

  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORES.READ_HISTORY, 'readonly');
    const store = tx.objectStore(STORES.READ_HISTORY);
    const index = store.index('feedId');
    const request = index.getAll(feedId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Clear all read history
 */
export async function clearReadHistory(): Promise<void> {
  const database = await ensureDB();

  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORES.READ_HISTORY, 'readwrite');
    const store = tx.objectStore(STORES.READ_HISTORY);
    const request = store.clear();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}
