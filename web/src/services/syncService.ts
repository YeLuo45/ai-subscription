/**
 * Sync Service
 * Business logic for Readwise and Instapaper sync
 */

import { message } from 'antd';
import * as syncDB from '../db/syncIndexedDB';
import type { SyncConfig, SyncHistory } from '../db/syncIndexedDB';

// Article interface
export interface Article {
  id: string;
  title: string;
  description?: string;
  link: string;
  pubDate?: string;
  feedId?: string;
  readTime?: number; // in seconds
}

// ============================================================
// Readwise API
// ============================================================

const READWISE_API_BASE = 'https://readwise.io/api/v2';

interface ReadwiseHighlight {
  text: string;
  note?: string;
  location_type?: string;
  location_value?: string;
}

interface ReadwiseArticleInput {
  url: string;
  title: string;
  saved_using?: string;
  highlight?: ReadwiseHighlight;
  read_info?: {
    reading_progress?: number;
    percent_progress?: number;
  };
}

async function readwiseFetch(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${READWISE_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Token ${options.headers?.['token'] || ''}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Readwise API error: ${response.status} - ${errorText}`);
  }
  
  return response.json();
}

export async function saveToReadwise(
  article: Article,
  token: string,
  readingTime?: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const payload: ReadwiseArticleInput = {
      url: article.link,
      title: article.title,
      saved_using: 'ai-subscription',
    };

    if (readingTime) {
      payload.read_info = {
        reading_progress: readingTime,
        percent_progress: 100,
      };
    }

    const result = await readwiseFetch('/saved_articles', {
      method: 'POST',
      headers: { 'token': token },
      body: JSON.stringify({ articles: [payload] }),
    });

    // Record success
    await syncDB.addSyncHistory({
      id: `history_rw_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      service: 'readwise',
      action: 'save',
      articleId: article.id,
      articleTitle: article.title,
      status: 'success',
      syncedAt: Date.now(),
    });

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    await syncDB.addSyncHistory({
      id: `history_rw_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      service: 'readwise',
      action: 'save',
      articleId: article.id,
      articleTitle: article.title,
      status: 'failed',
      error: errorMessage,
      syncedAt: Date.now(),
    });

    return { success: false, error: errorMessage };
  }
}

export async function syncAllToReadwise(
  articles: Article[],
  token: string,
  onProgress?: (current: number, total: number) => void
): Promise<{ success: number; failed: number; errors: string[] }> {
  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    onProgress?.(i + 1, articles.length);

    const result = await saveToReadwise(article, token, article.readTime);
    if (result.success) {
      success++;
    } else {
      failed++;
      if (result.error) {
        errors.push(`${article.title}: ${result.error}`);
      }
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Save sync history
  await syncDB.addSyncHistory({
    id: `history_rw_sync_${Date.now()}`,
    service: 'readwise',
    action: 'sync',
    status: failed === 0 ? 'success' : 'failed',
    error: failed > 0 ? `Synced ${success}, failed ${failed}` : undefined,
    syncedAt: Date.now(),
  });

  return { success, failed, errors };
}

// ============================================================
// Instapaper API
// ============================================================

const INSTAPAPER_API_BASE = 'https://www.instapaper.com/api';

async function instapaperFetch(
  endpoint: string,
  options: RequestInit = {},
  auth?: { username: string; password: string }
) {
  const credentials = auth 
    ? btoa(`${auth.username}:${auth.password}`)
    : undefined;

  const response = await fetch(`${INSTAPAPER_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': credentials ? `Basic ${credentials}` : '',
      'Content-Type': 'application/x-www-form-urlencoded',
      ...options.headers,
    },
  });

  const text = await response.text();
  
  if (response.status === 201 || response.status === 200) {
    try {
      return { success: true, data: JSON.parse(text) };
    } catch {
      return { success: true, data: text };
    }
  }

  return { 
    success: false, 
    error: `Instapaper API error: ${response.status} - ${text}` 
  };
}

export async function saveToInstapaper(
  article: Article,
  auth: { username: string; password: string } | { token: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    let result;

    if ('token' in auth) {
      // OAuth token
      result = await instapaperFetch('/bookmarks', {
        method: 'POST',
        body: new URLSearchParams({
          url: article.link,
          title: article.title,
          selection: article.description || '',
        }),
      });
    } else {
      // Basic auth with username/password
      result = await instapaperFetch('/bookmarks', {
        method: 'POST',
        body: new URLSearchParams({
          url: article.link,
          title: article.title,
          selection: article.description || '',
        }),
      }, auth);
    }

    if (result.success) {
      await syncDB.addSyncHistory({
        id: `history_ip_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        service: 'instapaper',
        action: 'save',
        articleId: article.id,
        articleTitle: article.title,
        status: 'success',
        syncedAt: Date.now(),
      });
      return { success: true };
    } else {
      await syncDB.addSyncHistory({
        id: `history_ip_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        service: 'instapaper',
        action: 'save',
        articleId: article.id,
        articleTitle: article.title,
        status: 'failed',
        error: result.error,
        syncedAt: Date.now(),
      });
      return { success: false, error: result.error };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

// ============================================================
// Config Management
// ============================================================

export async function saveReadwiseConfig(token: string): Promise<void> {
  await syncDB.saveSyncConfig({
    id: 'readwise_config',
    service: 'readwise',
    config: { token },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
}

export async function saveInstapaperConfig(
  auth: { username: string; password: string } | { token: string }
): Promise<void> {
  await syncDB.saveSyncConfig({
    id: 'instapaper_config',
    service: 'instapaper',
    config: auth,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
}

export async function getReadwiseConfig(): Promise<string | null> {
  const config = await syncDB.getSyncConfig('readwise');
  return config?.config?.token || null;
}

export async function getInstapaperConfig(): Promise<{ username?: string; password?: string; token?: string } | null> {
  const config = await syncDB.getSyncConfig('instapaper');
  return config?.config || null;
}

export async function disconnectService(service: 'readwise' | 'instapaper'): Promise<void> {
  await syncDB.deleteSyncConfig(service);
  await syncDB.clearSyncHistory(service);
}

export async function getLastSyncTime(service: 'readwise' | 'instapaper'): Promise<Date | null> {
  const timestamp = await syncDB.getLastSyncTime(service);
  return timestamp ? new Date(timestamp) : null;
}

export async function getSyncStatus(): Promise<{
  readwise: { connected: boolean; lastSync: Date | null };
  instapaper: { connected: boolean; lastSync: Date | null };
}> {
  const [rwConfig, ipConfig, rwLastSync, ipLastSync] = await Promise.all([
    getReadwiseConfig(),
    getInstapaperConfig(),
    getLastSyncTime('readwise'),
    getLastSyncTime('instapaper'),
  ]);

  return {
    readwise: { 
      connected: !!rwConfig, 
      lastSync: rwLastSync 
    },
    instapaper: { 
      connected: !!ipConfig, 
      lastSync: ipLastSync 
    },
  };
}
