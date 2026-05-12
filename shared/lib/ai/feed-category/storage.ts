/**
 * IndexedDB Storage for Feed Category and Tag Recommendations
 */

import type { FeedCategory, ArticleTagRecommendation, TagLibrary } from './types';

const DB_NAME = 'ai-subscription-feed-category';
const DB_VERSION = 1;

const STORES = {
  FEED_CATEGORIES: 'feed_categories',
  TAG_RECOMMENDATIONS: 'tag_recommendations',
  TAG_LIBRARY: 'tag_library',
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

      // Feed categories store
      if (!database.objectStoreNames.contains(STORES.FEED_CATEGORIES)) {
        const store = database.createObjectStore(STORES.FEED_CATEGORIES, { keyPath: 'id' });
        store.createIndex('feedId', 'feedId', { unique: true });
        store.createIndex('feedUrl', 'feedUrl', { unique: false });
      }

      // Tag recommendations store
      if (!database.objectStoreNames.contains(STORES.TAG_RECOMMENDATIONS)) {
        const store = database.createObjectStore(STORES.TAG_RECOMMENDATIONS, { keyPath: 'articleId' });
        store.createIndex('feedId', 'feedId', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // Tag library store
      if (!database.objectStoreNames.contains(STORES.TAG_LIBRARY)) {
        const store = database.createObjectStore(STORES.TAG_LIBRARY, { keyPath: 'id' });
        store.createIndex('name', 'name', { unique: true });
        store.createIndex('category', 'category', { unique: false });
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
// Feed Category Operations
// ============================================================

/**
 * Save or update a feed category
 */
export async function saveFeedCategory(category: FeedCategory): Promise<void> {
  const database = await ensureDB();

  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORES.FEED_CATEGORIES, 'readwrite');
    const store = tx.objectStore(STORES.FEED_CATEGORIES);
    const request = store.put(category);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Get feed category by feed ID
 */
export async function getFeedCategory(feedId: string): Promise<FeedCategory | null> {
  const database = await ensureDB();

  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORES.FEED_CATEGORIES, 'readonly');
    const store = tx.objectStore(STORES.FEED_CATEGORIES);
    const index = store.index('feedId');
    const request = index.get(feedId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

/**
 * Get all feed categories
 */
export async function getAllFeedCategories(): Promise<FeedCategory[]> {
  const database = await ensureDB();

  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORES.FEED_CATEGORIES, 'readonly');
    const store = tx.objectStore(STORES.FEED_CATEGORIES);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Delete a feed category
 */
export async function deleteFeedCategory(id: string): Promise<void> {
  const database = await ensureDB();

  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORES.FEED_CATEGORIES, 'readwrite');
    const store = tx.objectStore(STORES.FEED_CATEGORIES);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// ============================================================
// Tag Recommendation Operations
// ============================================================

/**
 * Save tag recommendations for an article
 */
export async function saveTagRecommendation(recommendation: ArticleTagRecommendation): Promise<void> {
  const database = await ensureDB();

  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORES.TAG_RECOMMENDATIONS, 'readwrite');
    const store = tx.objectStore(STORES.TAG_RECOMMENDATIONS);
    const request = store.put(recommendation);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Get tag recommendations for an article
 */
export async function getTagRecommendations(articleId: string): Promise<ArticleTagRecommendation | null> {
  const database = await ensureDB();

  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORES.TAG_RECOMMENDATIONS, 'readonly');
    const store = tx.objectStore(STORES.TAG_RECOMMENDATIONS);
    const request = store.get(articleId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

/**
 * Get tag recommendations for all articles in a feed
 */
export async function getTagRecommendationsByFeed(feedId: string): Promise<ArticleTagRecommendation[]> {
  const database = await ensureDB();

  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORES.TAG_RECOMMENDATIONS, 'readonly');
    const store = tx.objectStore(STORES.TAG_RECOMMENDATIONS);
    const index = store.index('feedId');
    const request = index.getAll(feedId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Delete tag recommendations for an article
 */
export async function deleteTagRecommendations(articleId: string): Promise<void> {
  const database = await ensureDB();

  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORES.TAG_RECOMMENDATIONS, 'readwrite');
    const store = tx.objectStore(STORES.TAG_RECOMMENDATIONS);
    const request = store.delete(articleId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// ============================================================
// Tag Library Operations
// ============================================================

/**
 * Save a tag library entry
 */
export async function saveTagLibrary(tagLibrary: TagLibrary): Promise<void> {
  const database = await ensureDB();

  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORES.TAG_LIBRARY, 'readwrite');
    const store = tx.objectStore(STORES.TAG_LIBRARY);
    const request = store.put(tagLibrary);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Get all tag library entries
 */
export async function getTagLibrary(): Promise<TagLibrary[]> {
  const database = await ensureDB();

  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORES.TAG_LIBRARY, 'readonly');
    const store = tx.objectStore(STORES.TAG_LIBRARY);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Get a tag library entry by ID
 */
export async function getTagLibraryById(id: string): Promise<TagLibrary | null> {
  const database = await ensureDB();

  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORES.TAG_LIBRARY, 'readonly');
    const store = tx.objectStore(STORES.TAG_LIBRARY);
    const request = store.get(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

/**
 * Update a tag library entry
 */
export async function updateTagLibrary(id: string, updates: Partial<TagLibrary>): Promise<void> {
  const database = await ensureDB();
  const existing = await getTagLibraryById(id);

  if (!existing) {
    throw new Error(`Tag library entry ${id} not found`);
  }

  const updated: TagLibrary = { ...existing, ...updates, id };

  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORES.TAG_LIBRARY, 'readwrite');
    const store = tx.objectStore(STORES.TAG_LIBRARY);
    const request = store.put(updated);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Delete a tag library entry
 */
export async function deleteTagLibrary(id: string): Promise<void> {
  const database = await ensureDB();

  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORES.TAG_LIBRARY, 'readwrite');
    const store = tx.objectStore(STORES.TAG_LIBRARY);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Find tag library entry by name
 */
export async function findTagLibraryByName(name: string): Promise<TagLibrary | null> {
  const database = await ensureDB();

  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORES.TAG_LIBRARY, 'readonly');
    const store = tx.objectStore(STORES.TAG_LIBRARY);
    const index = store.index('name');
    const request = index.get(name);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

/**
 * Increment article count for a tag
 */
export async function incrementTagArticleCount(tagId: string, delta: number = 1): Promise<void> {
  const tag = await getTagLibraryById(tagId);
  if (tag) {
    await updateTagLibrary(tagId, { articleCount: tag.articleCount + delta });
  }
}
