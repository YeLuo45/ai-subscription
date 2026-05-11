/**
 * Push Queue Types
 * Data models for aggregated push notifications with scheduling support
 */

export interface AggregatedPush {
  id: string;
  title: string;
  summary: string;
  articleIds: string[];
  scheduledAt: number;
  status: 'pending' | 'sent' | 'cancelled' | 'error';
  createdAt: number;
  updatedAt: number;
  retryCount: number;
}

export interface PushQueueConfig {
  maxRetries: number;
  defaultTTL: number; // ms
  schedulerInterval: number; // ms
}

export interface CreateAggregationParams {
  title: string;
  summary: string;
  articleIds: string[];
  scheduledAt: number;
}

// Storage adapter interface - can be implemented with IndexedDB, Redis, etc.
export interface StorageAdapter {
  create(push: AggregatedPush): Promise<AggregatedPush>;
  get(id: string): Promise<AggregatedPush | undefined>;
  getAll(): Promise<AggregatedPush[]>;
  getPending(before?: number): Promise<AggregatedPush[]>;
  delete(id: string): Promise<void>;
  update(push: AggregatedPush): Promise<AggregatedPush>;
}

// Push sender interface - handles actual push delivery
export interface PushSender {
  send(push: AggregatedPush): Promise<void>;
}
