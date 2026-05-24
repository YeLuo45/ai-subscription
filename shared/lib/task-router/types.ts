/**
 * Task Router Types
 * Priority queue system for task decomposition and scheduling
 */

export enum TaskPriority {
  CRITICAL = 0,
  HIGH = 1,
  NORMAL = 2,
  LOW = 3,
  BACKGROUND = 4,
}

export type TaskOperation =
  | 'sync_favorites'
  | 'sync_notes'
  | 'sync_subscriptions'
  | 'update_tags'
  | 'log_activity'
  | 'report_stats';

export interface QueuedTask {
  id: string;
  priority: TaskPriority;
  operation: TaskOperation;
  payload: unknown;
  createdAt: number;
  retryCount: number;
  maxRetries: number;
}

export interface QueueMetrics {
  priority: TaskPriority;
  name: string;
  length: number;
  totalProcessed: number;
  totalFailed: number;
  avgWaitTime: number;
}

export const PRIORITY_NAMES: Record<TaskPriority, string> = {
  [TaskPriority.CRITICAL]: 'CRITICAL',
  [TaskPriority.HIGH]: 'HIGH',
  [TaskPriority.NORMAL]: 'NORMAL',
  [TaskPriority.LOW]: 'LOW',
  [TaskPriority.BACKGROUND]: 'BACKGROUND',
};

// Starvation prevention threshold in ms (30 seconds)
export const STARVATION_THRESHOLD_MS = 30_000;

// Default weights for weighted round-robin scheduling
export const DEFAULT_WEIGHTS: Record<TaskPriority, number> = {
  [TaskPriority.CRITICAL]: 8,
  [TaskPriority.HIGH]: 4,
  [TaskPriority.NORMAL]: 2,
  [TaskPriority.LOW]: 1,
  [TaskPriority.BACKGROUND]: 0.5,
};