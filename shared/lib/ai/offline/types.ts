/**
 * Offline support types for AI Subscription
 */

export interface CachedArticle {
  id: string;
  feedId: string;
  title: string;
  content: string;
  author?: string;
  publishedAt: number;
  cachedAt: number;
  tags: string[];
  summary?: string;
}

export interface CachedFeed {
  id: string;
  url: string;
  title: string;
  description?: string;
  lastFetchedAt: number;
  cachedAt: number;
}

export interface SyncStatus {
  lastSyncAt: number;
  pendingCount: number;
  isOnline: boolean;
}
