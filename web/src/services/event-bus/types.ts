/**
 * Event Bus Types - Cross-platform unified event bus type definitions
 * Following nanobot MessageBus architecture
 */

export type EventType = 
  | 'article_read' 
  | 'article_bookmarked' 
  | 'subscription_updated' 
  | 'tag_assigned';

export type SourcePlatform = 'web' | 'miniapp' | 'pc' | 'android';

export interface BusEvent {
  id: string;
  type: EventType;
  payload: ArticleReadPayload | ArticleBookmarkedPayload | SubscriptionUpdatedPayload | TagAssignedPayload;
  timestamp: number;
  source: SourcePlatform;
}

export interface ArticleReadPayload {
  articleId: string;
  feedId: string;
  progress: number;
  readingTime?: number;
}

export interface ArticleBookmarkedPayload {
  articleId: string;
  feedId: string;
  bookmarked: boolean;
}

export interface SubscriptionUpdatedPayload {
  subscriptionId: string;
  changes: Partial<{
    name: string;
    url: string;
    enabled: boolean;
    fetchIntervalMinutes: number;
    aiSummaryEnabled: boolean;
  }>;
}

export interface TagAssignedPayload {
  articleId: string;
  tags: string[];
}

export interface ChannelAdapter {
  publish(event: BusEvent): Promise<void>;
  getState(): Promise<Record<string, unknown>>;
  onRemoteEvent(callback: (event: BusEvent) => void): () => void;
}

export interface MessageBusConfig {
  deviceId: string;
  source?: SourcePlatform;
  persistenceAdapter?: ChannelAdapter;
}

export interface SubscriptionCallback {
  (event: BusEvent): void;
}

export interface SyncEngineConfig {
  deltaSync: boolean;
  conflictResolution: 'last-write-wins' | 'manual';
}