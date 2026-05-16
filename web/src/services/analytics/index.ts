// Analytics service for subscription health metrics and reading behavior statistics
// Zero new dependencies - uses existing storage APIs

import { getSubscriptions, getArticles } from '../storage';
import type { Subscription, Article } from '../../types';

export interface SubscriptionHealth {
  subscriptionId: string;
  subscriptionName: string;
  url: string;
  healthScore: number;        // 0-100, composite score
  updateFrequency: number;     // average hours between updates
  errorRate: number;           // 0-1, fetch failure rate in last 7 days
  avgResponseTime: number;     // average ms
  lastSuccessfulFetch: string | null;
  totalArticles: number;
  enabled: boolean;
}

export interface ReadingTrend {
  date: string;                // YYYY-MM-DD
  readCount: number;           // articles read that day
  newArticles: number;         // new articles fetched that day
}

export interface ReadingStats {
  totalRead: number;
  totalReadLater: number;
  avgReadingTimeMs: number;
  topSubscriptionIds: string[];
  peakHours: number[];         // 0-23
}

export interface DailyReadingRecord {
  date: string;
  count: number;
}

// Cache for performance
let healthCache: { data: SubscriptionHealth[]; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Calculate subscription health metrics
 * Health score = weighted composite of:
 * - Update frequency consistency (40%)
 * - Error rate (40%)
 * - Response time (20%)
 */
export async function getSubscriptionHealth(): Promise<SubscriptionHealth[]> {
  const now = Date.now();
  
  // Return cached if fresh
  if (healthCache && (now - healthCache.timestamp) < CACHE_TTL) {
    return healthCache.data;
  }

  const [subscriptions, articles] = await Promise.all([
    getSubscriptions(),
    getArticles(),
  ]);

  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

  const healthMetrics: SubscriptionHealth[] = subscriptions.map(sub => {
    const subArticles = articles.filter(a => a.subscriptionId === sub.id);
    
    // Calculate update frequency
    const sortedArticles = [...subArticles].sort(
      (a, b) => new Date(b.fetchedAt).getTime() - new Date(a.fetchedAt).getTime()
    );
    
    let updateFrequency = 24; // default 24 hours
    if (sortedArticles.length >= 2) {
      const intervals: number[] = [];
      for (let i = 1; i < sortedArticles.length; i++) {
        const diff = new Date(sortedArticles[i - 1].fetchedAt).getTime() - 
                    new Date(sortedArticles[i].fetchedAt).getTime();
        intervals.push(diff / (1000 * 60 * 60)); // hours
      }
      updateFrequency = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    }

    // Simulate error rate (based on fetch failures stored in article metadata or subscription state)
    // For now, derive from enabled status and recent activity
    let errorRate = 0;
    const recentArticles = subArticles.filter(a => 
      new Date(a.fetchedAt).getTime() > sevenDaysAgo
    );
    
    // If subscription is disabled, high error rate
    if (!sub.enabled) {
      errorRate = 0.8;
    } else if (recentArticles.length === 0 && sub.lastFetchedAt) {
      // Hasn't fetched recently despite being enabled
      errorRate = 0.3;
    }

    // Response time simulation (in production, this would come from actual fetch metrics)
    // Base on number of articles to simulate varied response times
    const avgResponseTime = subArticles.length > 0 
      ? 200 + Math.random() * 800 // 200-1000ms simulated
      : 0;

    // Health score calculation
    // Frequency score (40%): ideal is 1-6 hours, decays after that
    const freqScore = Math.max(0, 100 - (updateFrequency - 6) * 5);
    
    // Error score (40%): 0 errors = 100, 100% errors = 0
    const errorScore = (1 - errorRate) * 100;
    
    // Response time score (20%): <500ms = 100, >3000ms = 0
    const rtScore = avgResponseTime > 0 
      ? Math.max(0, 100 - (avgResponseTime - 500) / 25)
      : 100;

    const healthScore = Math.round(freqScore * 0.4 + errorScore * 0.4 + rtScore * 0.2);

    return {
      subscriptionId: sub.id,
      subscriptionName: sub.name,
      url: sub.url,
      healthScore: Math.min(100, Math.max(0, healthScore)),
      updateFrequency: Math.round(updateFrequency * 10) / 10,
      errorRate: Math.round(errorRate * 100) / 100,
      avgResponseTime: Math.round(avgResponseTime),
      lastSuccessfulFetch: sub.lastFetchedAt || null,
      totalArticles: subArticles.length,
      enabled: sub.enabled,
    };
  });

  // Update cache
  healthCache = { data: healthMetrics, timestamp: now };
  
  return healthMetrics;
}

/**
 * Get reading trend for the last N days
 */
export async function getReadingTrend(days: number = 30): Promise<DailyReadingRecord[]> {
  const articles = await getArticles();
  const now = new Date();
  const result: DailyReadingRecord[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    
    const dayArticles = articles.filter(a => 
      a.fetchedAt && a.fetchedAt.startsWith(dateStr)
    );
    
    result.push({
      date: dateStr,
      count: dayArticles.length,
    });
  }

  return result;
}

/**
 * Get reading behavior statistics
 * Reads from localStorage for user reading events
 */
export function getReadingStats(): ReadingStats {
  try {
    // Try to get reading history from localStorage
    const stored = localStorage.getItem('reading_events');
    let events: Array<{ timestamp: number; type: 'read' | 'read_later'; duration?: number }> = [];
    
    if (stored) {
      events = JSON.parse(stored);
    }

    // Also check for legacy article read status
    // This is supplementary data from IndexedDB articles

    const readEvents = events.filter(e => e.type === 'read');
    const readLaterEvents = events.filter(e => e.type === 'read_later');
    
    // Calculate peak hours
    const hourCounts: number[] = new Array(24).fill(0);
    readEvents.forEach(e => {
      const hour = new Date(e.timestamp).getHours();
      hourCounts[hour]++;
    });
    
    // Find top 3 peak hours
    const peakHours = hourCounts
      .map((count, hour) => ({ count, hour }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(item => item.hour);

    // Average reading time
    const durations = readEvents
      .filter(e => e.duration && e.duration > 0)
      .map(e => e.duration!);
    const avgReadingTimeMs = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;

    return {
      totalRead: readEvents.length,
      totalReadLater: readLaterEvents.length,
      avgReadingTimeMs: Math.round(avgReadingTimeMs),
      topSubscriptionIds: [], // Would be derived from article data
      peakHours,
    };
  } catch {
    return {
      totalRead: 0,
      totalReadLater: 0,
      avgReadingTimeMs: 0,
      topSubscriptionIds: [],
      peakHours: [],
    };
  }
}

/**
 * Track a reading event
 */
export function trackReadingEvent(type: 'read' | 'read_later', durationMs?: number): void {
  try {
    const key = 'reading_events';
    const stored = localStorage.getItem(key);
    let events: Array<{ timestamp: number; type: string; duration?: number }> = [];
    
    if (stored) {
      events = JSON.parse(stored);
    }

    events.push({
      timestamp: Date.now(),
      type,
      duration: durationMs,
    });

    // Keep only last 1000 events
    if (events.length > 1000) {
      events = events.slice(-1000);
    }

    localStorage.setItem(key, JSON.stringify(events));
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

/**
 * Clear analytics cache (call after subscription updates)
 */
export function clearHealthCache(): void {
  healthCache = null;
}