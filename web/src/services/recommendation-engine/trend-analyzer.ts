// Trend Analyzer - Analyzes trending subscriptions based on download/growth metrics
import type { Subscription } from '../../types';

// Simulated trending data (in production, this would come from an external API)
// Maps subscription URL patterns to growth scores
const GROWTH_METRICS: Record<string, { growth: number; velocity: number }> = {
  'hnrss.org': { growth: 0.9, velocity: 0.85 },
  'technologyreview.com': { growth: 0.75, velocity: 0.7 },
  'theverge.com': { growth: 0.7, velocity: 0.65 },
  'techcrunch.com': { growth: 0.85, velocity: 0.8 },
  'openai.com': { growth: 0.95, velocity: 0.9 },
  'deepmind.com': { growth: 0.8, velocity: 0.75 },
  'nature.com': { growth: 0.7, velocity: 0.6 },
  'arxiv.org': { growth: 0.85, velocity: 0.8 },
  'github.com': { growth: 0.9, velocity: 0.85 },
  'producthunt.com': { growth: 0.75, velocity: 0.7 },
};

export interface TrendingSubscription {
  subscription: Subscription;
  trendScore: number;
  growthRate: number;
  reason: string;
}

// Calculate trend score for a subscription
function calculateTrendScore(subscription: Subscription): number {
  const url = subscription.url.toLowerCase();
  
  // Check if we have metrics for this subscription
  for (const [pattern, metrics] of Object.entries(GROWTH_METRICS)) {
    if (url.includes(pattern)) {
      // Combine growth and velocity into trend score
      return metrics.growth * 0.6 + metrics.velocity * 0.4;
    }
  }
  
  // Default trend score for unknown subscriptions
  return 0.3;
}

// Get trend reason based on subscription category/content
function getTrendReason(subscription: Subscription): string {
  const url = subscription.url.toLowerCase();
  const category = subscription.category?.toLowerCase() || '';
  const name = subscription.name.toLowerCase();
  
  if (url.includes('openai') || url.includes('deepmind') || url.includes('anthropic')) {
    return 'AI领域增长最快';
  }
  if (url.includes('techcrunch') || url.includes('producthunt')) {
    return '创业科技热门源';
  }
  if (url.includes('hnrss') || url.includes('hacker')) {
    return '开发者社区热议';
  }
  if (url.includes('nature') || url.includes('science')) {
    return '科研热度上升';
  }
  if (category.includes('ai') || category.includes('技术')) {
    return '技术领域热门';
  }
  
  return '近期热度上升';
}

// Get top trending subscriptions
export function getTrendingSubscriptions(
  subscriptions: Subscription[],
  limit = 10
): TrendingSubscription[] {
  const scored = subscriptions.map(sub => ({
    subscription: sub,
    trendScore: calculateTrendScore(sub),
    growthRate: calculateTrendScore(sub) * 100,
    reason: getTrendReason(sub),
  }));
  
  return scored
    .sort((a, b) => b.trendScore - a.trendScore)
    .slice(0, limit);
}

// Check if a candidate subscription is trending
export function isTrendingCandidate(candidate: { url: string; category?: string }): boolean {
  const trendScore = calculateTrendScore(candidate as Subscription);
  return trendScore > 0.6;
}

// Get trend data for dashboard display
export function getTrendStats(): { topCategories: string[]; overallTrend: number } {
  return {
    topCategories: ['AI', 'Tech', 'Science', 'Startup', 'Design'],
    overallTrend: 0.72,
  };
}
