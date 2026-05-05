/**
 * IndexedDB Database Layer for Translation Cache
 * Table: translations
 */

import type { Language } from '../lib/languageDetect';

const DB_NAME = 'ai-subscription';
const DB_VERSION = 3; // Incremented for new table

let dbInstance: IDBDatabase | null = null;

export interface TranslationCache {
  id: string; // hash of sourceText + sourceLang + targetLang + service
  sourceText: string;
  sourceLang: Language;
  targetLang: Language;
  translatedTitle: string;
  translatedDescription: string;
  service: 'gemini' | 'deepl';
  createdAt: number;
  expiresAt: number; // createdAt + 7 days
}

// Translation settings stored in filter_state
export interface TranslationSettings {
  targetLanguage: Language;
  translationService: 'gemini' | 'deepl';
}

const TRANSLATION_CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

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

      // translations table
      if (!db.objectStoreNames.contains('translations')) {
        const transStore = db.createObjectStore('translations', { keyPath: 'id' });
        transStore.createIndex('sourceLang', 'sourceLang', { unique: false });
        transStore.createIndex('targetLang', 'targetLang', { unique: false });
        transStore.createIndex('expiresAt', 'expiresAt', { unique: false });
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
// Translation Cache Operations
// ============================================================

/**
 * Generate a cache key for the translation
 */
function generateCacheId(sourceText: string, sourceLang: Language, targetLang: Language, service: string): string {
  const text = sourceText.slice(0, 200); // Limit text length for key
  const key = `${text}|${sourceLang}|${targetLang}|${service}`;
  // Simple hash
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `trans_${Math.abs(hash).toString(36)}_${Date.now().toString(36)}`;
}

/**
 * Get cached translation if not expired
 */
export async function getCachedTranslation(
  sourceText: string,
  sourceLang: Language,
  targetLang: Language,
  service: 'gemini' | 'deepl'
): Promise<TranslationCache | null> {
  const { store } = await tx('translations');
  const all = await promisifyRequest<TranslationCache[]>(store.getAll());
  
  const text = sourceText.slice(0, 200);
  
  // Find matching cached translation that hasn't expired
  const now = Date.now();
  const found = all.find(t => 
    t.sourceText.slice(0, 200) === text &&
    t.sourceLang === sourceLang &&
    t.targetLang === targetLang &&
    t.service === service &&
    t.expiresAt > now
  );
  
  return found || null;
}

/**
 * Save translation to cache
 */
export async function saveTranslation(
  sourceText: string,
  sourceLang: Language,
  targetLang: Language,
  translatedTitle: string,
  translatedDescription: string,
  service: 'gemini' | 'deepl'
): Promise<TranslationCache> {
  const now = Date.now();
  const cache: TranslationCache = {
    id: generateCacheId(sourceText, sourceLang, targetLang, service),
    sourceText,
    sourceLang,
    targetLang,
    translatedTitle,
    translatedDescription,
    service,
    createdAt: now,
    expiresAt: now + TRANSLATION_CACHE_DURATION,
  };

  const { store } = await tx('translations', 'readwrite');
  await promisifyRequest(store.put(cache));
  return cache;
}

/**
 * Clear all expired translations
 */
export async function clearExpiredTranslations(): Promise<number> {
  const { store } = await tx('translations', 'readwrite');
  const all = await promisifyRequest<TranslationCache[]>(store.getAll());
  const now = Date.now();
  
  let deleted = 0;
  for (const trans of all) {
    if (trans.expiresAt <= now) {
      await promisifyRequest(store.delete(trans.id));
      deleted++;
    }
  }
  return deleted;
}

/**
 * Clear all translations (for cache management)
 */
export async function clearAllTranslations(): Promise<void> {
  const { store } = await tx('translations', 'readwrite');
  const all = await promisifyRequest<TranslationCache[]>(store.getAll());
  for (const trans of all) {
    await promisifyRequest(store.delete(trans.id));
  }
}

/**
 * Get translation cache statistics
 */
export async function getTranslationCacheStats(): Promise<{ total: number; expired: number; active: number }> {
  const { store } = await tx('translations');
  const all = await promisifyRequest<TranslationCache[]>(store.getAll());
  const now = Date.now();
  
  const expired = all.filter(t => t.expiresAt <= now).length;
  return {
    total: all.length,
    expired,
    active: all.length - expired,
  };
}
