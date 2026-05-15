// Recommendation engine types - interest profiles, recommendations, collaborative filtering

export interface InterestVector {
  categories: Record<string, number>; // category -> weight
  topics: Record<string, number>;    // topic keyword -> weight
  sentiment: number;                  // -1 to 1
  complexity: number;                 // 0 to 1 (simple to advanced)
}

export interface UserBehavior {
  articleId: string;
  type: 'view' | 'read' | 'complete' | 'share' | 'bookmark' | 'skip';
  timestamp: number;
  scrollDepth?: number; // 0-100
  timeSpentMs?: number;
}

export interface UserInterestProfile {
  userId: string;
  interestVector: InterestVector;
  recentBehaviors: UserBehavior[];
  bookmarkedArticles: string[];
  lastUpdated: number;
}

export interface RecommendationItem {
  articleId: string;
  articleTitle: string;
  score: number;
  reasons: string[];  // e.g. ['Similar users read this', 'Matches your AI interest']
  source: 'content' | 'collaborative' | 'popularity' | 'cold-start';
  matchedInterests: string[];
}

export interface CollaborativeFilterResult {
  userId: string;
  similarUsers: Array<{ userId: string; similarity: number }>;
  recommendedArticleIds: string[];
}

export interface HybridScoreWeights {
  content: number;
  collaborative: number;
  popularity: number;
  recency: number;
}

export const DEFAULT_WEIGHTS: HybridScoreWeights = {
  content: 0.3,
  collaborative: 0.4,
  popularity: 0.15,
  recency: 0.15,
};
