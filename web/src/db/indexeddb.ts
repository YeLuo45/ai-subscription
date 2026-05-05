/**
 * IndexedDB Database Layer for Tags
 * Tables: tags, article_tags, feed_tags
 */

import type { Tag, ArticleTag, FeedTag } from '../types/tag';

const DB_NAME = 'ai-subscription';
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

      // tags table
      if (!db.objectStoreNames.contains('tags')) {
        const tagStore = db.createObjectStore('tags', { keyPath: 'id' });
        tagStore.createIndex('name', 'name', { unique: false });
        tagStore.createIndex('type', 'type', { unique: false });
        tagStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // article_tags table
      if (!db.objectStoreNames.contains('article_tags')) {
        const atStore = db.createObjectStore('article_tags', { keyPath: 'id' });
        atStore.createIndex('articleId', 'articleId', { unique: false });
        atStore.createIndex('tagId', 'tagId', { unique: false });
        atStore.createIndex('articleId_tagId', ['articleId', 'tagId'], { unique: true });
      }

      // feed_tags table
      if (!db.objectStoreNames.contains('feed_tags')) {
        const ftStore = db.createObjectStore('feed_tags', { keyPath: 'id' });
        ftStore.createIndex('feedId', 'feedId', { unique: false });
        ftStore.createIndex('tagId', 'tagId', { unique: false });
        ftStore.createIndex('feedId_tagId', ['feedId', 'tagId'], { unique: true });
      }

      // filter_state for persistence
      if (!db.objectStoreNames.contains('filter_state')) {
        db.createObjectStore('filter_state', { keyPath: 'key' });
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
// Tags Operations
// ============================================================

export async function getAllTags(): Promise<Tag[]> {
  const { store } = await tx('tags');
  return promisifyRequest(store.getAll());
}

export async function getTagById(id: string): Promise<Tag | undefined> {
  const { store } = await tx('tags');
  return promisifyRequest(store.get(id));
}

export async function saveTag(tag: Tag): Promise<void> {
  const { store } = await tx('tags', 'readwrite');
  await promisifyRequest(store.put(tag));
}

export async function deleteTag(tagId: string): Promise<void> {
  const { store } = await tx('tags', 'readwrite');
  await promisifyRequest(store.delete(tagId));
}

export async function bulkSaveTags(tags: Tag[]): Promise<void> {
  const { store } = await tx('tags', 'readwrite');
  for (const tag of tags) {
    store.put(tag);
  }
  await new Promise<void>((resolve, reject) => {
    store.transaction.oncomplete = () => resolve();
    store.transaction.onerror = () => reject(store.transaction.error);
  });
}

// ============================================================
// Article Tags Operations
// ============================================================

export async function getArticleTags(articleId: string): Promise<ArticleTag[]> {
  const { store } = await tx('article_tags');
  const index = store.index('articleId');
  return promisifyRequest(index.getAll(articleId));
}

export async function getArticlesByTagId(tagId: string): Promise<ArticleTag[]> {
  const { store } = await tx('article_tags');
  const index = store.index('tagId');
  return promisifyRequest(index.getAll(tagId));
}

export async function saveArticleTag(articleTag: ArticleTag): Promise<void> {
  const { store } = await tx('article_tags', 'readwrite');
  await promisifyRequest(store.put(articleTag));
}

export async function deleteArticleTag(id: string): Promise<void> {
  const { store } = await tx('article_tags', 'readwrite');
  await promisifyRequest(store.delete(id));
}

export async function deleteArticleTagsByArticleId(articleId: string): Promise<void> {
  const tags = await getArticleTags(articleId);
  const { store } = await tx('article_tags', 'readwrite');
  for (const tag of tags) {
    store.delete(tag.id);
  }
  await new Promise<void>((resolve, reject) => {
    store.transaction.oncomplete = () => resolve();
    store.transaction.onerror = () => reject(store.transaction.error);
  });
}

// ============================================================
// Feed Tags Operations
// ============================================================

export async function getFeedTags(feedId: string): Promise<FeedTag[]> {
  const { store } = await tx('feed_tags');
  const index = store.index('feedId');
  return promisifyRequest(index.getAll(feedId));
}

export async function getFeedsByTagId(tagId: string): Promise<FeedTag[]> {
  const { store } = await tx('feed_tags');
  const index = store.index('tagId');
  return promisifyRequest(index.getAll(tagId));
}

export async function saveFeedTag(feedTag: FeedTag): Promise<void> {
  const { store } = await tx('feed_tags', 'readwrite');
  await promisifyRequest(store.put(feedTag));
}

export async function deleteFeedTag(id: string): Promise<void> {
  const { store } = await tx('feed_tags', 'readwrite');
  await promisifyRequest(store.delete(id));
}

export async function deleteFeedTagsByFeedId(feedId: string): Promise<void> {
  const tags = await getFeedTags(feedId);
  const { store } = await tx('feed_tags', 'readwrite');
  for (const tag of tags) {
    store.delete(tag.id);
  }
  await new Promise<void>((resolve, reject) => {
    store.transaction.oncomplete = () => resolve();
    store.transaction.onerror = () => reject(store.transaction.error);
  });
}

// ============================================================
// Filter State Persistence
// ============================================================

export async function saveFilterState(key: string, value: string[]): Promise<void> {
  const { store } = await tx('filter_state', 'readwrite');
  await promisifyRequest(store.put({ key, value }));
}

export async function getFilterState(key: string): Promise<string[]> {
  const { store } = await tx('filter_state');
  const result = await promisifyRequest(store.get(key));
  return result?.value ?? [];
}

// ============================================================
// Merge Tags (for tag management)
// ============================================================

export async function mergeTags(sourceTagId: string, targetTagId: string): Promise<void> {
  // Update all article_tags
  const { store: atStore } = await tx('article_tags', 'readwrite');
  const atIndex = atStore.index('tagId');
  const articleTags = await promisifyRequest<ArticleTag[]>(atIndex.getAll(sourceTagId));
  
  for (const at of articleTags) {
    // Delete old
    atStore.delete(at.id);
    // Check if target already has this article tagged
    const existingIndex = atStore.index('articleId_tagId');
    const existing = await promisifyRequest<ArticleTag | undefined>(
      existingIndex.get([at.articleId, targetTagId])
    );
    if (!existing) {
      // Create new with target tag
      await promisifyRequest(atStore.put({
        ...at,
        id: `at_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        tagId: targetTagId,
      }));
    }
  }

  // Update all feed_tags
  const { store: ftStore } = await tx('feed_tags', 'readwrite');
  const ftIndex = ftStore.index('tagId');
  const feedTags = await promisifyRequest<FeedTag[]>(ftIndex.getAll(sourceTagId));
  
  for (const ft of feedTags) {
    ftStore.delete(ft.id);
    const existingIndex = ftStore.index('feedId_tagId');
    const existing = await promisifyRequest<FeedTag | undefined>(
      existingIndex.get([ft.feedId, targetTagId])
    );
    if (!existing) {
      await promisifyRequest(ftStore.put({
        ...ft,
        id: `ft_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        tagId: targetTagId,
      }));
    }
  }

  // Delete source tag
  await deleteTag(sourceTagId);
}
