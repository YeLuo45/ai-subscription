/**
 * Cache Manager for offline article and feed caching using IndexedDB
 */

import type { CachedArticle, CachedFeed } from './types';

const DB_NAME = 'ai-subscription-offline';
const DB_VERSION = 1;

let dbInstance: IDBDatabase | null = null;

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

      // Cached articles store
      if (!db.objectStoreNames.contains('cached_articles')) {
        const articleStore = db.createObjectStore('cached_articles', { keyPath: 'id' });
        articleStore.createIndex('feedId', 'feedId', { unique: false });
        articleStore.createIndex('cachedAt', 'cachedAt', { unique: false });
        articleStore.createIndex('publishedAt', 'publishedAt', { unique: false });
      }

      // Cached feeds store
      if (!db.objectStoreNames.contains('cached_feeds')) {
        const feedStore = db.createObjectStore('cached_feeds', { keyPath: 'id' });
        feedStore.createIndex('url', 'url', { unique: false });
        feedStore.createIndex('cachedAt', 'cachedAt', { unique: false });
      }

      // Sync metadata store
      if (!db.objectStoreNames.contains('sync_metadata')) {
        db.createObjectStore('sync_metadata', { keyPath: 'key' });
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

export class CacheManager {
  // Article caching
  async cacheArticle(article: CachedArticle): Promise<void> {
    const { store } = await tx('cached_articles', 'readwrite');
    const articleWithCache = {
      ...article,
      cachedAt: Date.now(),
    };
    await promisifyRequest(store.put(articleWithCache));
  }

  async getCachedArticle(id: string): Promise<CachedArticle | null> {
    const { store } = await tx('cached_articles');
    const result = await promisifyRequest<CachedArticle | undefined>(store.get(id));
    return result || null;
  }

  async getCachedArticles(feedId?: string): Promise<CachedArticle[]> {
    const { store } = await tx('cached_articles');
    
    if (feedId) {
      const index = store.index('feedId');
      return promisifyRequest(index.getAll(feedId));
    }
    
    return promisifyRequest(store.getAll());
  }

  // Feed caching
  async cacheFeed(feed: CachedFeed): Promise<void> {
    const { store } = await tx('cached_feeds', 'readwrite');
    const feedWithCache = {
      ...feed,
      cachedAt: Date.now(),
    };
    await promisifyRequest(store.put(feedWithCache));
  }

  async getCachedFeed(id: string): Promise<CachedFeed | null> {
    const { store } = await tx('cached_feeds');
    const result = await promisifyRequest<CachedFeed | undefined>(store.get(id));
    return result || null;
  }

  async getCachedFeeds(): Promise<CachedFeed[]> {
    const { store } = await tx('cached_feeds');
    return promisifyRequest(store.getAll());
  }

  // Clear old cache entries
  async clearOldCache(maxAge: number): Promise<void> {
    const now = Date.now();
    const threshold = now - maxAge;

    // Clear old articles
    const { store: articleStore } = await tx('cached_articles', 'readwrite');
    const articles = await promisifyRequest<CachedArticle[]>(articleStore.getAll());
    
    for (const article of articles) {
      if (article.cachedAt < threshold) {
        articleStore.delete(article.id);
      }
    }

    // Clear old feeds
    const { store: feedStore } = await tx('cached_feeds', 'readwrite');
    const feeds = await promisifyRequest<CachedFeed[]>(feedStore.getAll());
    
    for (const feed of feeds) {
      if (feed.cachedAt < threshold) {
        feedStore.delete(feed.id);
      }
    }
  }

  // Get sync metadata
  async getLastSyncTime(): Promise<number> {
    const { store } = await tx('sync_metadata');
    const result = await promisifyRequest<{ key: string; value: number } | undefined>(
      store.get('lastSyncAt')
    );
    return result?.value || 0;
  }

  async setLastSyncTime(timestamp: number): Promise<void> {
    const { store } = await tx('sync_metadata', 'readwrite');
    await promisifyRequest(store.put({ key: 'lastSyncAt', value: timestamp }));
  }
}

// Singleton instance
export const cacheManager = new CacheManager();
