// Cold start handling - recommendations for new users and articles
import type { RecommendationItem, InterestVector } from './types';
import { getArticles } from '../storage';

const FEED_CATEGORIES: Record<string, string[]> = {
  technology: ['AI', 'web-dev', 'mobile', 'security', 'software'],
  science: ['space', 'biology', 'physics', 'climate', 'research'],
  business: ['startup', 'markets', 'strategy', 'leadership', 'finance'],
  entertainment: ['movies', 'gaming', 'music', 'streaming', 'celebrities'],
  sports: ['football', 'basketball', 'tennis', 'soccer', 'olympics'],
  health: ['fitness', 'nutrition', 'mental-health', 'medical', 'wellness'],
};

// Trending/popular articles (simulated - in real app would track views)
const TRENDING_ARTICLE_IDS = [
  'trending-tech-1',
  'trending-science-1', 
  'trending-business-1',
];

export async function recommendForNewUser(excludeIds: string[] = []): Promise<RecommendationItem[]> {
  // Get articles across diverse categories for new users
  try {
    const articles = await getArticles('', 50);
    
    const categorized = new Map<string, typeof articles>();
    for (const article of articles) {
      const cat = extractCategory(article);
      if (!categorized.has(cat)) categorized.set(cat, []);
      categorized.get(cat)!.push(article);
    }

    // Pick top article from each category
    const recommendations: RecommendationItem[] = [];
    for (const [category, arts] of categorized.entries()) {
      if (recommendations.length >= 5) break;
      const top = arts[0];
      if (!top || excludeIds.includes(top.id || '')) continue;

      recommendations.push({
        articleId: top.id || '',
        articleTitle: top.title || 'Untitled',
        score: 0.6,
        reasons: [`Popular in ${category}`, 'Recommended for new users'],
        source: 'cold-start',
        matchedInterests: [category],
      });
    }

    // Fill with trending if needed
    while (recommendations.length < 5 && recommendations.length < articles.length) {
      const article = articles[recommendations.length];
      if (article && !excludeIds.includes(article.id || '') && 
          !recommendations.find(r => r.articleId === article.id)) {
        recommendations.push({
          articleId: article.id || '',
          articleTitle: article.title || 'Untitled',
          score: 0.4,
          reasons: ['Trending now', 'Popular among users'],
          source: 'cold-start',
          matchedInterests: [],
        });
      } else {
        break;
      }
    }

    return recommendations;
  } catch {
    // Fallback to trending
    return TRENDING_ARTICLE_IDS
      .filter(id => !excludeIds.includes(id))
      .slice(0, 5)
      .map(id => ({
        articleId: id,
        articleTitle: `Trending: ${id}`,
        score: 0.5,
        reasons: ['Popular article', 'Recommended for new users'],
        source: 'cold-start' as const,
        matchedInterests: [],
      }));
  }
}

export async function recommendNewArticle(
  articleId: string,
  articleTitle: string,
  excludeIds: string[],
  _interestProfile?: InterestVector
): Promise<RecommendationItem[]> {
  // For new articles without history, recommend to users interested in related categories
  // Simplified: recommend to all users (real implementation would target specific segments)
  return [{
    articleId,
    articleTitle,
    score: 0.7,
    reasons: ['New article in your subscriptions', 'Based on feed topic'],
    source: 'cold-start',
    matchedInterests: [],
  }];
}

function extractCategory(article: { id?: string; title?: string }): string {
  // Simplified category extraction from title/id
  const text = (article.title || article.id || '').toLowerCase();
  if (text.includes('tech') || text.includes('ai') || text.includes('software')) return 'technology';
  if (text.includes('science') || text.includes('research')) return 'science';
  if (text.includes('business') || text.includes('market')) return 'business';
  if (text.includes('health') || text.includes('fitness')) return 'health';
  if (text.includes('sport')) return 'sports';
  return 'entertainment';
}
