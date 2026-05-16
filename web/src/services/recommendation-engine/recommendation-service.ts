// Recommendation Service - Main service for getting recommendations
import type { 
  RecommendationType, 
  SubscriptionRecommendation, 
  ArticleRecommendation,
  InterestProfile 
} from './types';
import { analyzeInterests } from './interest-analyzer';
import { buildIDF, scoreCandidateAgainstProfile } from './content-similarity';
import { getTrendingSubscriptions } from './trend-analyzer';
import { getSubscriptions, getSummaries, getArticles } from '../storage';
import type { Subscription } from '../../types';

// Hardcoded candidate subscriptions pool (in production, would come from external API)
const CANDIDATE_SUBSCRIPTIONS: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>[] = [
  { name: 'Hacker News Daily', url: 'https://hnrss.org/frontpage', type: 'rss', category: 'Tech', enabled: true, aiSummaryEnabled: true, fetchIntervalMinutes: 60 },
  { name: 'MIT Technology Review', url: 'https://www.technologyreview.com/feed/', type: 'rss', category: 'Tech', enabled: true, aiSummaryEnabled: true, fetchIntervalMinutes: 120 },
  { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', type: 'rss', category: 'Tech', enabled: true, aiSummaryEnabled: true, fetchIntervalMinutes: 60 },
  { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index', type: 'rss', category: 'Tech', enabled: true, aiSummaryEnabled: true, fetchIntervalMinutes: 60 },
  { name: 'Wired', url: 'https://www.wired.com/feed/rss', type: 'rss', category: 'Tech', enabled: true, aiSummaryEnabled: true, fetchIntervalMinutes: 60 },
  { name: 'Nature News', url: 'https://www.nature.com/nature.rss', type: 'rss', category: 'Science', enabled: true, aiSummaryEnabled: true, fetchIntervalMinutes: 120 },
  { name: 'Science Daily', url: 'https://www.sciencedaily.com/rss/all.xml', type: 'rss', category: 'Science', enabled: true, aiSummaryEnabled: true, fetchIntervalMinutes: 120 },
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/', type: 'rss', category: 'Startup', enabled: true, aiSummaryEnabled: true, fetchIntervalMinutes: 30 },
  { name: 'Product Hunt', url: 'https://www.producthunt.com/feed', type: 'rss', category: 'Startup', enabled: true, aiSummaryEnabled: true, fetchIntervalMinutes: 60 },
  { name: 'Smashing Magazine', url: 'https://www.smashingmagazine.com/feed/', type: 'rss', category: 'Design', enabled: true, aiSummaryEnabled: true, fetchIntervalMinutes: 120 },
  { name: 'CSS-Tricks', url: 'https://css-tricks.com/feed/', type: 'rss', category: 'Design', enabled: true, aiSummaryEnabled: true, fetchIntervalMinutes: 60 },
  { name: 'Awwwards', url: 'https://www.awwwards.com/blog/feed/', type: 'rss', category: 'Design', enabled: true, aiSummaryEnabled: true, fetchIntervalMinutes: 120 },
  { name: 'DeepMind Blog', url: 'https://deepmind.com/blog/feed/basic/', type: 'rss', category: 'AI', enabled: true, aiSummaryEnabled: true, fetchIntervalMinutes: 120 },
  { name: 'OpenAI Blog', url: 'https://openai.com/blog/rss/', type: 'rss', category: 'AI', enabled: true, aiSummaryEnabled: true, fetchIntervalMinutes: 60 },
  { name: 'Anthropic Blog', url: 'https://www.anthropic.com/news/rss', type: 'rss', category: 'AI', enabled: true, aiSummaryEnabled: true, fetchIntervalMinutes: 120 },
  { name: 'AI News', url: 'https://ainews.ai/feed', type: 'rss', category: 'AI', enabled: true, aiSummaryEnabled: true, fetchIntervalMinutes: 60 },
  { name: 'VentureBeat AI', url: 'https://venturebeat.com/category/ai/feed/', type: 'rss', category: 'AI', enabled: true, aiSummaryEnabled: true, fetchIntervalMinutes: 60 },
  { name: 'Bloomberg Tech', url: 'https://feeds.bloomberg.com/technology/news.rss', type: 'rss', category: 'Finance', enabled: true, aiSummaryEnabled: true, fetchIntervalMinutes: 60 },
  { name: 'Financial Times Tech', url: 'https://www.ft.com/technology?format=rss', type: 'rss', category: 'Finance', enabled: true, aiSummaryEnabled: true, fetchIntervalMinutes: 60 },
  { name: 'Reuters Tech', url: 'https://feeds.reuters.com/reuters/technologyNews', type: 'rss', category: 'News', enabled: true, aiSummaryEnabled: true, fetchIntervalMinutes: 30 },
];

// Get recommendations by type
export async function getRecommendations(
  type: RecommendationType,
  limit = 10
): Promise<SubscriptionRecommendation[]> {
  const [existingSubs, profile] = await Promise.all([
    getSubscriptions(),
    analyzeInterests(),
  ]);

  const existingUrls = new Set(existingSubs.map(s => s.url));
  const candidates = CANDIDATE_SUBSCRIPTIONS.filter(c => !existingUrls.has(c.url));

  switch (type) {
    case 'similar':
      return getSimilarRecommendations(candidates, profile, limit);
    case 'category':
      return getCategoryRecommendations(candidates, profile, limit);
    case 'trending':
      return getTrendingRecommendations(candidates, limit);
    case 'similar-users':
      return getSimilarUserRecommendations(candidates, profile, limit);
    default:
      return getSimilarRecommendations(candidates, profile, limit);
  }
}

// Similar content recommendations based on TF-IDF similarity
function getSimilarRecommendations(
  candidates: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>[],
  profile: InterestProfile,
  limit: number
): SubscriptionRecommendation[] {
  if (candidates.length === 0) return [];

  // Build IDF from user content
  const corpus = candidates.map(c => `${c.name} ${c.category || ''}`);
  const idf = buildIDF(corpus);

  const recommendations = candidates.map(candidate => {
    const { score, matchedKeywords } = scoreCandidateAgainstProfile(
      candidate,
      profile.topKeywords,
      profile.topCategories
    );

    const reason = matchedKeywords.length > 0
      ? `与你关注的 ${matchedKeywords.slice(0, 3).join('、')} 相关`
      : `${candidate.category}类优质内容`;

    return {
      subscription: candidate as Subscription,
      score,
      matchedKeywords,
      reason,
      type: 'similar' as RecommendationType,
    };
  });

  return recommendations
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// Category-based recommendations
function getCategoryRecommendations(
  candidates: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>[],
  profile: InterestProfile,
  limit: number
): SubscriptionRecommendation[] {
  if (profile.topCategories.length === 0) {
    return getSimilarRecommendations(candidates, profile, limit);
  }

  // Group candidates by category
  const byCategory = new Map<string, typeof candidates>();
  for (const candidate of candidates) {
    const cat = candidate.category || '未分类';
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(candidate);
  }

  const recommendations: SubscriptionRecommendation[] = [];

  // For each top category the user is interested in
  for (const cat of profile.topCategories) {
    const catCandidates = byCategory.get(cat) || [];
    for (const candidate of catCandidates) {
      if (recommendations.length >= limit) break;
      
      recommendations.push({
        subscription: candidate as Subscription,
        score: 5, // Category match score
        matchedKeywords: [cat],
        reason: `热门${cat}订阅源`,
        type: 'category' as RecommendationType,
      });
    }
    if (recommendations.length >= limit) break;
  }

  return recommendations.slice(0, limit);
}

// Trending recommendations
function getTrendingRecommendations(
  candidates: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>[],
  limit: number
): SubscriptionRecommendation[] {
  const trending = getTrendingSubscriptions(candidates as Subscription[], limit);
  
  return trending.map(t => ({
    subscription: t.subscription,
    score: t.trendScore * 10,
    matchedKeywords: [],
    reason: t.reason,
    type: 'trending' as RecommendationType,
  }));
}

// Similar users recommendations (simplified - uses category overlap)
function getSimilarUserRecommendations(
  candidates: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>[],
  profile: InterestProfile,
  limit: number
): SubscriptionRecommendation[] {
  // Simplified: recommend subscriptions similar users (same categories) would also like
  // In production, this would use actual user behavior data
  
  if (profile.topFeeds.length === 0 || profile.topCategories.length === 0) {
    return getSimilarRecommendations(candidates, profile, limit);
  }

  // Score by how many of user's top categories match the candidate
  const recommendations = candidates.map(candidate => {
    const cat = candidate.category || '';
    const isTopCategory = profile.topCategories.includes(cat);
    
    return {
      subscription: candidate as Subscription,
      score: isTopCategory ? 5 : 1,
      matchedKeywords: isTopCategory ? [cat] : [],
      reason: isTopCategory ? `同类用户也在订阅` : `${cat}相关内容`,
      type: 'similar-users' as RecommendationType,
    };
  });

  return recommendations
    .filter(r => r.score > 1)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// Get article recommendations
export async function getArticleRecommendations(
  type: RecommendationType,
  limit = 20
): Promise<ArticleRecommendation[]> {
  const [articles, profile] = await Promise.all([
    getArticles(),
    analyzeInterests(),
  ]);

  const recommendations = articles.map(article => {
    const matched: string[] = [];
    let score = 0;
    const text = `${article.title} ${article.description || ''}`.toLowerCase();

    for (const { keyword, weight } of profile.topKeywords.slice(0, 10)) {
      if (text.includes(keyword.toLowerCase())) {
        matched.push(keyword);
        score += weight;
      }
    }

    return {
      article,
      score,
      matchedKeywords: matched.slice(0, 5),
      type: type || 'similar',
    };
  });

  return recommendations
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// Get current interest profile
export async function getInterestProfile(): Promise<InterestProfile> {
  return analyzeInterests();
}
