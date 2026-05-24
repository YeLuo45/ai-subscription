/**
 * L1 Recent Memory - Last 20 Reading Records
 * Uses sessionStorage for recent reads
 */

import type { RecentMemoryItem } from './types';

const RECENT_KEY = 'ai_subscription_recent';
const RECENT_LIMIT = 20;

function generateId(): string {
  return `recent_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get recent reading records
 */
export function getRecentReads(limit?: number): RecentMemoryItem[] {
  try {
    const data = sessionStorage.getItem(RECENT_KEY);
    if (!data) return [];
    const items = JSON.parse(data) as RecentMemoryItem[];
    const max = limit ?? RECENT_LIMIT;
    return items.slice(0, max);
  } catch {
    return [];
  }
}

/**
 * Save recent reads to sessionStorage
 */
function saveRecentReads(items: RecentMemoryItem[]): void {
  sessionStorage.setItem(RECENT_KEY, JSON.stringify(items));
}

/**
 * Record an article read
 */
export function recordArticleRead(
  read: Omit<RecentMemoryItem, 'id' | 'readAt'>
): RecentMemoryItem {
  const recentItem: RecentMemoryItem = {
    ...read,
    id: generateId(),
    readAt: Date.now(),
  };
  
  // Get existing reads
  const existing = getRecentReads(RECENT_LIMIT);
  
  // Add new read at the beginning
  existing.unshift(recentItem);
  
  // Keep only the last N items
  const trimmed = existing.slice(0, RECENT_LIMIT);
  
  saveRecentReads(trimmed);
  return recentItem;
}

/**
 * Update read progress for an article
 */
export function updateReadProgress(
  articleId: string,
  progress: number,
  duration: number
): void {
  const existing = getRecentReads(RECENT_LIMIT);
  
  // Find and update the article
  const index = existing.findIndex(item => item.articleId === articleId);
  if (index !== -1) {
    existing[index].progress = Math.max(existing[index].progress, progress);
    existing[index].readDuration = Math.max(existing[index].readDuration, duration);
    saveRecentReads(existing);
  }
}

/**
 * Get read history for a specific article
 */
export function getReadHistoryForArticle(articleId: string): RecentMemoryItem | null {
  const existing = getRecentReads(RECENT_LIMIT);
  return existing.find(item => item.articleId === articleId) ?? null;
}

/**
 * Clear recent reads
 */
export function clearRecentReads(): void {
  sessionStorage.removeItem(RECENT_KEY);
}

/**
 * Get reads by feed
 */
export function getRecentReadsByFeed(feedId: string): RecentMemoryItem[] {
  const existing = getRecentReads(RECENT_LIMIT);
  return existing.filter(item => item.feedId === feedId);
}

/**
 * Get reads by tag
 */
export function getRecentReadsByTag(tag: string): RecentMemoryItem[] {
  const existing = getRecentReads(RECENT_LIMIT);
  return existing.filter(item => item.tags.includes(tag));
}

/**
 * Export recent reads for debugging
 */
export function exportRecentReads(): string {
  const items = getRecentReads(RECENT_LIMIT);
  return JSON.stringify(items, null, 2);
}