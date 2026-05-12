/**
 * Feed Recommendation Types
 * Data models for AI-powered feed recommendations based on reading history
 */

/**
 * User interest profile derived from reading history
 */
export interface UserInterestProfile {
  id: string;
  userId: string;
  interestVector: { [category: string]: number };
  topCategories: string[];
  topKeywords: string[];
  updatedAt: number;
}

/**
 * A single feed recommendation with similarity score and reason
 */
export interface FeedRecommendation {
  id: string;
  feedUrl: string;
  feedTitle: string;
  categories: string[];
  similarityScore: number;
  reason: string;
  source: 'content' | 'collab' | 'trending';
  fetchedAt: number;
}

/**
 * Article read history entry
 */
export interface ReadHistoryEntry {
  id: string;
  feedId: string;
  feedUrl: string;
  feedTitle: string;
  articleId: string;
  articleTitle: string;
  articleContent: string;
  categories: string[];
  readAt: number;
}

/**
 * Candidate feed for recommendation computation
 */
export interface CandidateFeed {
  feedId: string;
  feedUrl: string;
  feedTitle: string;
  categories: string[];
  confidence: number;
}
