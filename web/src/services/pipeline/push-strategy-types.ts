/**
 * Push Strategy Types
 * Defines types for push notification strategy generation
 */

/**
 * Push content analysis result
 */
export interface PushContentAnalysis {
  /** Suggested push title (attention-grabbing, within 50 chars) */
  pushTitle: string;
  /** Brief preview text (within 100 chars) */
  previewText: string;
  /** Content category/classification */
  category: string;
  /** Content urgency level */
  urgencyLevel: 'low' | 'medium' | 'high';
  /** Suggested notification sound type */
  soundType: 'default' | 'urgent' | 'gentle' | 'none';
}

/**
 * Aggregated content for push
 */
export interface AggregatedPushContent {
  /** Primary push title */
  title: string;
  /** Push body/description */
  body: string;
  /** Source/feed name */
  source: string;
  /** Item count if aggregated */
  itemCount?: number;
  /** Key highlights (3-5 points) */
  highlights: string[];
  /** Generated tags for categorization */
  tags: string[];
  /** Content analysis metadata */
  analysis: PushContentAnalysis;
}

/**
 * Push strategy result
 */
export interface PushStrategyResult {
  /** Whether to send push or not */
  shouldPush: boolean;
  /** Push content to send */
  content: AggregatedPushContent;
  /** Recommended push timing */
  recommendedTime?: string;
  /** Reason for decision */
  reasoning: string;
}

/**
 * Article item for push strategy generation
 */
export interface PushStrategyItem {
  title: string;
  content?: string;
  description?: string;
  link?: string;
  pubDate?: string;
  source?: string;
}

/**
 * Batch push strategy request
 */
export interface BatchPushStrategyRequest {
  items: PushStrategyItem[];
  userPreferences?: {
    preferredCategories?: string[];
    quietHoursStart?: string;
    quietHoursEnd?: string;
    maxDailyPush?: number;
  };
}
