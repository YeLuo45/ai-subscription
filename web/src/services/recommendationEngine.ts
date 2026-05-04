import { getSubscriptions, getSummaries, getArticles } from './storage';
import type { Subscription, Summary, Article } from '../types';

export interface UserProfile {
  topKeywords: string[];
  topCategories: string[];
  topSubscriptionIds: string[];
  lastActive: string;
}

export interface SubscriptionRecommendation {
  subscription: Subscription;
  score: number;
  matchedKeywords: string[];
  reason: string;
}

export interface ArticleRecommendation {
  article: Article;
  score: number;
  matchedKeywords: string[];
}

// Build user profile from existing data
export async function buildUserProfile(): Promise<UserProfile> {
  const [subscriptions, summaries, articles] = await Promise.all([
    getSubscriptions(),
    getSummaries(),
    getArticles(),
  ]);

  // Extract top keywords from summaries (tags + keywords fields)
  const keywordCount: Record<string, number> = {};
  summaries.forEach(s => {
    if (s.isStarred) {
      // Starred summaries get higher weight
      s.keywords.forEach(k => { keywordCount[k] = (keywordCount[k] || 0) + 3; });
      s.tags?.forEach(t => { keywordCount[t] = (keywordCount[t] || 0) + 3; });
    }
    s.keywords.forEach(k => { keywordCount[k] = (keywordCount[k] || 0) + 1; });
    s.tags?.forEach(t => { keywordCount[t] = (keywordCount[t] || 0) + 1; });
  });

  const sortedKeywords = Object.entries(keywordCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([k]) => k);
  
  // Top categories from subscriptions
  const categoryCount: Record<string, number> = {};
  subscriptions.filter(s => s.enabled).forEach(s => {
    const cat = s.category || '未分类';
    categoryCount[cat] = (categoryCount[cat] || 0) + 1;
  });
  const sortedCategories = Object.entries(categoryCount)
    .sort((a, b) => b[1] - a[1])
    .map(([c]) => c);

  // Top subscriptions by article count
  const articleCount: Record<string, number> = {};
  articles.forEach(a => {
    articleCount[a.subscriptionId] = (articleCount[a.subscriptionId] || 0) + 1;
  });
  const sortedSubIds = Object.entries(articleCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id]) => id);

  return {
    topKeywords: sortedKeywords,
    topCategories: sortedCategories,
    topSubscriptionIds: sortedSubIds,
    lastActive: summaries.length > 0 ? summaries[0].createdAt : new Date().toISOString(),
  };
}

// Score a subscription against user profile
function scoreSubscription(sub: Subscription, profile: UserProfile): { score: number; matchedKeywords: string[] } {
  const matched: string[] = [];
  let score = 0;
  
  const cat = sub.category || '';
  if (profile.topCategories.includes(cat)) score += 5;
  if (profile.topSubscriptionIds.includes(sub.id)) score += 3;
  
  const lowerCat = cat.toLowerCase();
  profile.topKeywords.forEach(kw => {
    if (lowerCat.includes(kw.toLowerCase())) {
      matched.push(kw);
      score += 2;
    }
  });
  
  return { score, matchedKeywords: matched.slice(0, 5) };
}

// Recommend subscriptions
export async function recommendSubscriptions(limit = 10): Promise<SubscriptionRecommendation[]> {
  const [subs, profile] = await Promise.all([getSubscriptions(), buildUserProfile()]);
  
  const existingUrls = new Set(subs.map(s => s.url));
  
  // Hardcoded candidate pool (in real app, this would be from an external API)
  const candidates = getCandidateSubscriptions();
  
  const recommendations = candidates
    .filter(c => !existingUrls.has(c.url))  // Not already subscribed
    .map(candidate => {
      const { score, matchedKeywords } = scoreSubscription(candidate, profile);
      const reason = matchedKeywords.length > 0 
        ? `因为你关注 ${matchedKeywords.slice(0, 3).join('、')} 等话题`
        : `热门${candidate.category}订阅源`;
      return { subscription: candidate, score, matchedKeywords, reason };
    })
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  
  return recommendations;
}

// Recommend articles
export async function recommendArticles(limit = 20): Promise<ArticleRecommendation[]> {
  const [articles, profile] = await Promise.all([getArticles(), buildUserProfile()]);
  
  const scored = articles.map(article => {
    const matched: string[] = [];
    let score = 0;
    const text = `${article.title} ${article.description}`.toLowerCase();
    profile.topKeywords.forEach(kw => {
      if (text.includes(kw.toLowerCase())) {
        matched.push(kw);
        score += 1;
      }
    });
    return { article, score, matchedKeywords: matched.slice(0, 5) };
  });
  
  return scored
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// Hardcoded candidate subscriptions (in production, would come from an external API)
function getCandidateSubscriptions(): Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>[] {
  return [
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
}
