/**
 * Strategy Market Types
 * Type definitions for strategy marketplace and user strategies
 */

import type { TaskType, RoutingStrategy } from '../routing-strategy/types';

/**
 * Strategy listing in the marketplace
 */
export interface StrategyListing {
  id: string;
  name: string;
  description: string;
  author: string;
  taskTypes: TaskType[];
  avgCostSaving: number;
  rating: number;
  usageCount: number;
  tags: string[];
  createdAt: number;
}

/**
 * User-defined routing strategy
 */
export interface UserStrategy {
  id: string;
  name: string;
  strategy: RoutingStrategy;
  isPublic: boolean;
  createdAt: number;
  updatedAt: number;
}

/**
 * Import/Export format for sharing strategies
 */
export interface ExportedStrategy {
  version: string;
  exportedAt: number;
  strategy: UserStrategy;
}
