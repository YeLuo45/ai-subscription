/**
 * Feed Recommend Module
 * Unified exports for AI-powered feed recommendations based on reading history
 */

// Types
export * from './types';

// Storage
export * from './storage';

// Analyzers
export { analyzeUserInterest, calculateCategoryDistribution } from './interest-analyzer';

// Similarity Engine
export { cosineSimilarity, computeRecommendations, computeRecommendationsWithCollab } from './similarity-engine';

// Service
export { FeedRecommendService, getFeedRecommendService } from './recommend-service';
