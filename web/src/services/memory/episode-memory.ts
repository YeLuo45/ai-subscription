/**
 * L2 Episode Memory - Article Reading Episodes
 * Uses IndexedDB with 30-day retention
 */

import type { EpisodeMemoryItem } from './types';

const DB_NAME = 'AISubscriptionDB';
const DB_VERSION = 3;
const STORE_NAME = 'episodes';
const EXPIRY_DAYS = 30;

let dbInstance: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (dbInstance) { resolve(dbInstance); return; }
    
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(request.result);
    };
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('articleId', 'articleId', { unique: false });
        store.createIndex('feedId', 'feedId', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('expiresAt', 'expiresAt', { unique: false });
      }
    };
  });
}

function generateId(): string {
  return `episode_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function calculateExpiry(): number {
  return Date.now() + (EXPIRY_DAYS * 24 * 60 * 60 * 1000);
}

/**
 * Get all episodes from IndexedDB
 */
export async function getEpisodes(limit: number = 100): Promise<EpisodeMemoryItem[]> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('createdAt');
    const request = index.openCursor(null, 'prev');
    
    const results: EpisodeMemoryItem[] = [];
    
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor && results.length < limit) {
        const episode = cursor.value as EpisodeMemoryItem;
        // Filter out expired episodes
        if (episode.expiresAt > Date.now()) {
          results.push(episode);
        }
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    
    request.onerror = () => reject(request.error);
  });
}

/**
 * Create a new episode
 */
export async function createEpisode(
  episode: Omit<EpisodeMemoryItem, 'id' | 'createdAt' | 'updatedAt' | 'expiresAt'>
): Promise<EpisodeMemoryItem> {
  const db = await openDB();
  const now = Date.now();
  
  const newEpisode: EpisodeMemoryItem = {
    ...episode,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
    expiresAt: calculateExpiry(),
  };
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(newEpisode);
    
    request.onsuccess = () => resolve(newEpisode);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Update an existing episode
 */
export async function updateEpisode(
  id: string,
  updates: Partial<EpisodeMemoryItem>
): Promise<void> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const getRequest = store.get(id);
    
    getRequest.onsuccess = () => {
      const existing = getRequest.result as EpisodeMemoryItem;
      if (!existing) {
        reject(new Error(`Episode ${id} not found`));
        return;
      }
      
      const updated: EpisodeMemoryItem = {
        ...existing,
        ...updates,
        id: existing.id,
        createdAt: existing.createdAt,
        updatedAt: Date.now(),
        expiresAt: calculateExpiry(), // Reset expiry on update
      };
      
      const putRequest = store.put(updated);
      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(putRequest.error);
    };
    
    getRequest.onerror = () => reject(getRequest.error);
  });
}

/**
 * Delete an episode
 */
export async function deleteEpisode(id: string): Promise<void> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get episode by article ID
 */
export async function getEpisodeByArticle(articleId: string): Promise<EpisodeMemoryItem | null> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('articleId');
    const request = index.get(articleId);
    
    request.onsuccess = () => {
      const result = request.result as EpisodeMemoryItem;
      if (result && result.expiresAt > Date.now()) {
        resolve(result);
      } else {
        resolve(null);
      }
    };
    
    request.onerror = () => reject(request.error);
  });
}

/**
 * Clean up expired episodes
 */
export async function cleanExpiredEpisodes(): Promise<number> {
  const db = await openDB();
  const now = Date.now();
  let deletedCount = 0;
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.openCursor();
    
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        const episode = cursor.value as EpisodeMemoryItem;
        if (episode.expiresAt <= now) {
          store.delete(cursor.primaryKey);
          deletedCount++;
        }
        cursor.continue();
      } else {
        resolve(deletedCount);
      }
    };
    
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get episodes by feed
 */
export async function getEpisodesByFeed(feedId: string): Promise<EpisodeMemoryItem[]> {
  const db = await openDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('feedId');
    const request = index.getAll(feedId);
    
    request.onsuccess = () => {
      const results = (request.result as EpisodeMemoryItem[])
        .filter(ep => ep.expiresAt > Date.now());
      resolve(results);
    };
    
    request.onerror = () => reject(request.error);
  });
}