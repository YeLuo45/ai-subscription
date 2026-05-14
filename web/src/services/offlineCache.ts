/**
 * Offline Data Cache Service
 * Provides functionality to cache articles for offline reading
 */

import { getArticleByLink, saveArticle, getArticles, updateArticle } from './storage';
import type { Article } from '../types';

const ARTICLE_CACHE_KEY = 'offline_articles';
const MAX_OFFLINE_ARTICLES = 100;

// Message types for service worker communication
interface SWMessage {
  type: string;
  url?: string;
  timestamp?: number;
}

/**
 * Request service worker to cache an article for offline reading
 */
export async function cacheArticleOffline(article: Article): Promise<void> {
  // Save to IndexedDB first
  try {
    const existing = await getArticleByLink(article.link);
    if (!existing) {
      await saveArticle(article);
    }
  } catch (e) {
    console.warn('[OfflineCache] Failed to save article to IndexedDB:', e);
  }

  // Notify service worker to cache the article page
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'CACHE_ARTICLE',
      url: article.link,
    } as SWMessage);
  }
}

/**
 * Get articles that are cached for offline reading
 */
export async function getOfflineCachedArticles(limit = 50): Promise<Article[]> {
  try {
    const articles = await getArticles(undefined, limit);
    // Filter to only return articles that have been read or marked for offline
    return articles.filter(a => a.isRead || a.isReadLater || a.isStarred);
  } catch (e) {
    console.warn('[OfflineCache] Failed to get offline articles:', e);
    return [];
  }
}

/**
 * Check if an article is available offline
 */
export async function isArticleOffline(articleLink: string): Promise<boolean> {
  try {
    const article = await getArticleByLink(articleLink);
    return !!article;
  } catch (e) {
    return false;
  }
}

/**
 * Request background sync for articles
 */
export async function requestArticleSync(): Promise<void> {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready as ServiceWorkerRegistration;
      if ('sync' in registration) {
        await (registration as unknown as { sync: { register: (tag: string) => Promise<void> } }).sync.register('sync-articles');
        console.log('[OfflineCache] Background sync requested');
      } else {
        // Fallback: trigger immediate sync via message
        triggerManualSync();
      }
    } catch (e) {
      console.warn('[OfflineCache] Background sync not supported or failed:', e);
      // Fallback: trigger immediate sync via message
      triggerManualSync();
    }
  } else {
    // Fallback: trigger immediate sync via message
    triggerManualSync();
  }
}

/**
 * Trigger manual sync via service worker message
 */
function triggerManualSync(): void {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'SYNC_ARTICLES',
      timestamp: Date.now(),
    } as SWMessage);
  }
}

/**
 * Register for periodic background sync if supported
 */
export async function registerPeriodicSync(): Promise<void> {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready as ServiceWorkerRegistration;
      const periodicSync = (registration as unknown as { periodicSync?: { register: (tag: string, options?: { minInterval?: number }) => Promise<void> } }).periodicSync;
      if (periodicSync) {
        const status = await navigator.permissions.query({
          name: 'periodic-background-sync' as PermissionName,
        });
        
        if (status.state === 'granted') {
          await periodicSync.register('sync-articles-periodic', {
            minInterval: 60 * 60 * 1000, // 1 hour
          });
          console.log('[OfflineCache] Periodic background sync registered');
        }
      }
    } catch (e) {
      console.warn('[OfflineCache] Periodic sync not supported:', e);
    }
  }
}

/**
 * Clear the offline data cache
 */
export async function clearOfflineCache(): Promise<void> {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'CLEAR_DATA_CACHE',
    } as SWMessage);
  }
}

/**
 * Get the service worker version
 */
export async function getServiceWorkerVersion(): Promise<string | null> {
  return new Promise((resolve) => {
    if (!('serviceWorker' in navigator)) {
      resolve(null);
      return;
    }

    navigator.serviceWorker.ready.then((registration) => {
      if ((registration as ServiceWorkerRegistration).active?.scriptURL) {
        const url = new URL((registration as ServiceWorkerRegistration).active?.scriptURL);
        // Extract version from script URL if embedded
        const match = url.searchParams.get('v');
        resolve(match || 'v2');
      } else {
        resolve(null);
      }
    }).catch(() => {
      resolve(null);
    });
  });
}

/**
 * Listen for service worker messages
 */
export function onServiceWorkerMessage(callback: (data: SWMessage) => void): () => void {
  if (!('serviceWorker' in navigator)) {
    return () => {};
  }

  const handler = (event: MessageEvent) => {
    callback(event.data);
  };

  navigator.serviceWorker.addEventListener('message', handler);
  return () => {
    navigator.serviceWorker.removeEventListener('message', handler);
  };
}
