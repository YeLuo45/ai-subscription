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
  payload: ArticleReadPayload | ArticleBookmarkedPayload | SubscriptionUpdatedPayload | TagAssignedPayload | Record<string, unknown>;
  timestamp: number;
  source: SourcePlatform;
}

export interface ArticleReadPayload {
  articleId: string;
  title?: string;
  url?: string;
  feedId?: string;
  progress?: number;
  readingTime?: number;
}

export interface ArticleBookmarkedPayload {
  articleId: string;
  feedId?: string;
  isReadLater?: boolean;
  bookmarked?: boolean;
}

export interface SubscriptionUpdatedPayload {
  action: 'add' | 'delete' | 'update';
  subscriptionId: string;
  subscription?: Record<string, unknown>;
  changes?: Partial<{
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
  /** Platform identifier */
  platform: SourcePlatform;
  /** Publish event to channel */
  publish(event: BusEvent): Promise<void>;
  /** Get current state from channel */
  getState(): Promise<Record<string, unknown>>;
  /** Subscribe to remote events */
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