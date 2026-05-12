/**
 * Feed Category and Tag Recommendation Types
 * Data models for AI-powered feed categorization and article tagging
 */

/**
 * Represents the AI-analyzed category for a feed source
 */
export interface FeedCategory {
  id: string;
  feedId: string;
  feedUrl: string;
  feedTitle: string;
  categories: string[];
  confidence: number;
  analyzedAt: number;
}

/**
 * Represents tag recommendations for a specific article
 */
export interface ArticleTagRecommendation {
  articleId: string;
  feedId: string;
  tags: TagRecommendation[];
  createdAt: number;
}

/**
 * A single tag recommendation with source tracking
 */
export interface TagRecommendation {
  tag: string;
  score: number;
  source: 'ai' | 'keyword' | 'user';
}

/**
 * Library entry for tag management
 */
export interface TagLibrary {
  id: string;
  name: string;
  alias: string[];
  category?: string;
  articleCount: number;
}
