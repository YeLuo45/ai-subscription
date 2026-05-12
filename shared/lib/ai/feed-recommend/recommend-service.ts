/**
 * Feed Recommend Service
 * Main service for feed recommendation based on user reading history
 */

import { analyzeUserInterest } from './interest-analyzer';
import { computeRecommendations } from './similarity-engine';
import * as storage from './storage';
import type { 
  UserInterestProfile, 
  FeedRecommendation, 
  ReadHistoryEntry,
  CandidateFeed 
} from './types';
import type { FeedCategory } from '../feed-category/types';

// Re-export FeedCategory from feed-category module
export type { FeedCategory } from '../feed-category/types';

const DEFAULT_USER_ID = 'default-user';
const MAX_RECOMMENDATIONS = 20;

class FeedRecommendService {
  private userId: string;

  constructor(userId: string = DEFAULT_USER_ID) {
    this.userId = userId;
  }

  /**
   * Update user interest profile based on reading history
   */
  async updateInterestProfile(): Promise<UserInterestProfile> {
    // Get all read history
    const readHistory = await storage.getAllReadHistory();

    // Convert to articles for analysis
    const articles = readHistory.map(entry => ({
      title: entry.articleTitle,
      content: entry.articleContent,
      categories: entry.categories,
    }));

    // Analyze user interest
    const analysis = await analyzeUserInterest(articles);

    // Create profile
    const profile: UserInterestProfile = {
      id: `profile_${this.userId}`,
      userId: this.userId,
      interestVector: analysis.interestVector,
      topCategories: analysis.topCategories,
      topKeywords: analysis.topKeywords,
      updatedAt: Date.now(),
    };

    // Save profile
    await storage.saveInterestProfile(profile);

    return profile;
  }

  /**
   * Get current user interest profile
   */
  async getInterestProfile(): Promise<UserInterestProfile | null> {
    return storage.getInterestProfile(this.userId);
  }

  /**
   * Get feed recommendations
   */
  async getRecommendations(limit: number = MAX_RECOMMENDATIONS): Promise<FeedRecommendation[]> {
    const recommendations = await storage.getRecommendations();
    return recommendations.slice(0, limit);
  }

  /**
   * Refresh recommendations based on current interest profile
   */
  async refreshRecommendations(): Promise<FeedRecommendation[]> {
    // Get or update interest profile
    let profile = await this.getInterestProfile();
    if (!profile) {
      profile = await this.updateInterestProfile();
    }

    // Get candidate feeds from feed-category module
    const candidateFeeds = await this.getCandidateFeeds();

    if (candidateFeeds.length === 0) {
      return [];
    }

    // Compute recommendations
    const recommendations = computeRecommendations(profile, candidateFeeds);

    // Limit results
    const limitedRecs = recommendations.slice(0, MAX_RECOMMENDATIONS);

    // Save recommendations
    await storage.saveRecommendations(limitedRecs);

    return limitedRecs;
  }

  /**
   * Subscribe to a recommended feed
   */
  async subscribeToFeed(feedUrl: string): Promise<void> {
    // This method would integrate with the subscription system
    // For now, we just mark the recommendation as accepted
    console.log(`[FeedRecommend] User subscribed to: ${feedUrl}`);

    // In a real implementation, this would:
    // 1. Add feed to user's subscription list
    // 2. Start fetching articles from the feed
    // 3. Track subscription in analytics

    return Promise.resolve();
  }

  /**
   * Add an article to read history
   */
  async addToReadHistory(
    feedId: string,
    feedUrl: string,
    feedTitle: string,
    articleId: string,
    articleTitle: string,
    articleContent: string,
    categories: string[]
  ): Promise<void> {
    const entry: ReadHistoryEntry = {
      id: `history_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      feedId,
      feedUrl,
      feedTitle,
      articleId,
      articleTitle,
      articleContent,
      categories,
      readAt: Date.now(),
    };

    await storage.saveReadHistory(entry);
  }

  /**
   * Get read history
   */
  async getReadHistory(limit: number = 100): Promise<ReadHistoryEntry[]> {
    return storage.getReadHistory(this.userId, limit);
  }

  /**
   * Clear read history
   */
  async clearReadHistory(): Promise<void> {
    await storage.clearReadHistory();
  }

  /**
   * Get candidate feeds from feed-category module
   */
  private async getCandidateFeeds(): Promise<CandidateFeed[]> {
    try {
      // Dynamically import to avoid circular dependency
      const { getAllFeedCategories } = await import('../feed-category/storage');
      const feedCategories = await getAllFeedCategories();

      return feedCategories.map((fc: FeedCategory) => ({
        feedId: fc.feedId,
        feedUrl: fc.feedUrl,
        feedTitle: fc.feedTitle,
        categories: fc.categories,
        confidence: fc.confidence,
      }));
    } catch (error) {
      console.error('[FeedRecommend] Failed to get candidate feeds:', error);
      return [];
    }
  }
}

// Singleton instance
let serviceInstance: FeedRecommendService | null = null;

export function getFeedRecommendService(userId?: string): FeedRecommendService {
  if (!serviceInstance) {
    serviceInstance = new FeedRecommendService(userId);
  }
  return serviceInstance;
}

export { FeedRecommendService };
