import { getSubscriptions, getArticles, getSummaries } from './storage';
import type { Subscription, Article, Summary } from '../types';

export interface FeedStats {
  subscriptionId: string;
  subscriptionName: string;
  totalArticles: number;
  unreadArticles: number;
  lastFetched: string | null;
  avgArticlesPerDay: number;
}

export interface UserStats {
  totalSubscriptions: number;
  totalArticles: number;
  totalSummaries: number;
  activeDays: number;
  topKeywords: string[];
  topSubscriptions: string[];
  dailyArticleTrend: Array<{ date: string; count: number }>;
  feedStats: FeedStats[];
}

function getDaysBetween(start: string, end: string): number {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export async function getUserStats(): Promise<UserStats> {
  const [subscriptions, articles, summaries] = await Promise.all([
    getSubscriptions(),
    getArticles(),
    getSummaries(),
  ]);

  // Feed stats
  const feedStats: FeedStats[] = subscriptions.map(sub => {
    const subArticles = articles.filter(a => a.subscriptionId === sub.id);
    const unreadCount = subArticles.filter(a => !a.isRead).length;
    const days = sub.createdAt 
      ? getDaysBetween(sub.createdAt, new Date().toISOString())
      : 1;
    
    return {
      subscriptionId: sub.id,
      subscriptionName: sub.name,
      totalArticles: subArticles.length,
      unreadArticles: unreadCount,
      lastFetched: sub.updatedAt,
      avgArticlesPerDay: Math.round(subArticles.length / days * 10) / 10,
    };
  });

  // Top subscriptions by article count
  const topSubscriptions = [...feedStats]
    .sort((a, b) => b.totalArticles - a.totalArticles)
    .slice(0, 10)
    .map(s => s.subscriptionName);

  // Top keywords from summaries
  const keywordCount: Record<string, number> = {};
  summaries.forEach(s => {
    s.keywords.forEach(k => { keywordCount[k] = (keywordCount[k] || 0) + 1; });
    s.tags?.forEach(t => { keywordCount[t] = (keywordCount[t] || 0) + 1; });
  });
  const topKeywords = Object.entries(keywordCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([k]) => k);

  // Daily article trend (last 30 days)
  const now = new Date();
  const dailyTrend: Array<{ date: string; count: number }> = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const count = articles.filter(a => a.publishedAt?.startsWith(dateStr)).length;
    dailyTrend.push({ date: dateStr, count });
  }

  // Active days
  const articleDates = new Set(articles.map(a => a.publishedAt?.slice(0, 10)).filter(Boolean));
  const activeDays = articleDates.size;

  return {
    totalSubscriptions: subscriptions.length,
    totalArticles: articles.length,
    totalSummaries: summaries.length,
    activeDays,
    topKeywords,
    topSubscriptions,
    dailyArticleTrend: dailyTrend,
    feedStats,
  };
}
