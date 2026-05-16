/**
 * Sync Types - Offline-first sync type definitions
 */

export type SyncStatus = 'synced' | 'pending' | 'conflict';
export type SyncDirection = 'push' | 'pull' | 'merge';

export interface SyncableEntity {
  id: string;
  localUpdatedAt: number;   // ms timestamp
  serverUpdatedAt?: number;
  syncStatus: SyncStatus;
  deviceId: string;
}

export interface Subscription extends SyncableEntity {
  name: string;
  url: string;
  type: 'rss' | 'atom' | 'api';
  category: string;
  enabled: boolean;
  aiSummaryEnabled: boolean;
  fetchIntervalMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export interface Article extends SyncableEntity {
  title: string;
  content: string;
  url: string;
  feedId: string;
  tags: string[];
  notes: string;
  readingProgress: number;  // 0-100
  isRead: boolean;
  isBookmarked: boolean;
  pubDate?: string;
  description?: string;
}

export interface Tag extends SyncableEntity {
  name: string;
  color?: string;
}

export interface Note extends SyncableEntity {
  articleId: string;
  content: string;
}

export interface ReadingProgress extends SyncableEntity {
  articleId: string;
  progress: number;  // 0-100
  lastPosition?: string;
}

export interface SyncRecord {
  id: string;
  entityType: 'subscription' | 'article' | 'tag' | 'note' | 'readingProgress';
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  data: unknown;
  localUpdatedAt: number;
  syncedAt?: number;
  status: SyncStatus;
}

export interface ConflictRecord {
  id: string;
  entityType: 'subscription' | 'article' | 'tag' | 'note' | 'readingProgress';
  entityId: string;
  localData: unknown;
  remoteData: unknown;
  localUpdatedAt: number;
  remoteUpdatedAt: number;
  detectedAt: number;
}

export type ConflictResolution = 'local' | 'remote' | 'merge' | 'manual';

export interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: number | null;
  pendingCount: number;
  conflictCount: number;
  currentOperation?: string;
}

export interface SyncConfig {
  adapter: 'gist' | 'api' | 'icloud';
  deviceId: string;
  lastSyncTime: number | null;
  adapterConfig: GistAdapterConfig | ApiAdapterConfig;
}

export interface GistAdapterConfig {
  githubToken: string;
  gistId?: string;
}

export interface ApiAdapterConfig {
  apiUrl: string;
  apiKey?: string;
}

export interface SyncResult {
  success: boolean;
  pushed: number;
  pulled: number;
  conflicts: number;
  errors: string[];
}

export interface SyncAdapter {
  push(records: SyncRecord[]): Promise<{ success: boolean; error?: string }>;
  pull(since: number): Promise<{ records: SyncRecord[]; error?: string }>;
  getLastSyncTime(): Promise<number | null>;
  setLastSyncTime(time: number): Promise<void>;
}
