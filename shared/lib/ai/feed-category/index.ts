/**
 * Feed Category Module
 * Unified exports for feed categorization and tag recommendation
 */

// Types
export * from './types';

// Storage
export * from './storage';

// Analyzers
export * from './feed-analyzer';
export * from './tag-recommender';

// Service
export { FeedCategoryService, getFeedCategoryService } from './feed-category-service';
