/**
 * IndexedDB Database Layer for Public Lists
 * Tables: public_lists, public_items
 */

import type { PublicList, PublicListItem } from '../types/publicList';

const DB_NAME = 'ai-subscription';
const DB_VERSION = 2; // Incremented for new tables

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

      // public_lists table
      if (!db.objectStoreNames.contains('public_lists')) {
        const store = db.createObjectStore('public_lists', { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // public_items table
      if (!db.objectStoreNames.contains('public_items')) {
        const store = db.createObjectStore('public_items', { keyPath: 'id' });
        store.createIndex('listId', 'listId', { unique: false });
        store.createIndex('articleId', 'articleId', { unique: false });
        store.createIndex('listId_articleId', ['listId', 'articleId'], { unique: true });
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
// Public Lists Operations
// ============================================================

export async function getAllPublicLists(): Promise<PublicList[]> {
  const { store } = await tx('public_lists');
  return promisifyRequest(store.getAll());
}

export async function getPublicListById(id: string): Promise<PublicList | undefined> {
  const { store } = await tx('public_lists');
  return promisifyRequest(store.get(id));
}

export async function savePublicList(list: PublicList): Promise<void> {
  const { store } = await tx('public_lists', 'readwrite');
  await promisifyRequest(store.put(list));
}

export async function deletePublicList(id: string): Promise<void> {
  const { store } = await tx('public_lists', 'readwrite');
  await promisifyRequest(store.delete(id));
  
  // Also delete all items in this list
  const items = await getPublicListItems(id);
  const { store: itemStore } = await tx('public_items', 'readwrite');
  for (const item of items) {
    itemStore.delete(item.id);
  }
}

export async function updatePublicList(id: string, updates: Partial<PublicList>): Promise<void> {
  const list = await getPublicListById(id);
  if (list) {
    const updated = {
      ...list,
      ...updates,
      updatedAt: Date.now(),
    };
    await savePublicList(updated);
  }
}

// ============================================================
// Public List Items Operations
// ============================================================

export async function getPublicListItems(listId: string): Promise<PublicListItem[]> {
  const { store } = await tx('public_items');
  const index = store.index('listId');
  return promisifyRequest(index.getAll(listId));
}

export async function addArticleToPublicList(listId: string, articleId: string): Promise<void> {
  const { store } = await tx('public_items', 'readwrite');
  const item: PublicListItem = {
    id: `pli_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    listId,
    articleId,
    addedAt: Date.now(),
  };
  await promisifyRequest(store.put(item));
}

export async function removeArticleFromPublicList(listId: string, articleId: string): Promise<void> {
  const { store } = await tx('public_items', 'readwrite');
  const index = store.index('listId_articleId');
  const result = await promisifyRequest<PublicListItem | undefined>(index.get([listId, articleId]));
  if (result) {
    store.delete(result.id);
  }
}

export async function clearPublicListItems(listId: string): Promise<void> {
  const items = await getPublicListItems(listId);
  const { store } = await tx('public_items', 'readwrite');
  for (const item of items) {
    store.delete(item.id);
  }
}

export async function getArticleIdsInPublicList(listId: string): Promise<string[]> {
  const items = await getPublicListItems(listId);
  return items.map(item => item.articleId);
}
