/**
 * Preset Strategy Definitions
 * Pre-configured routing strategies for common use cases
 */

import type { StrategyListing, RoutingStrategy } from './types';
import type { TaskType } from '../providers-ai-subscription';

/**
 * Preset strategy with listing metadata
 */
export interface PresetStrategy {
  listing: StrategyListing;
  strategy: RoutingStrategy;
}

/**
 * Cost-sensitive strategy - minimize cost while maintaining acceptable quality
 */
const COST_SENSITIVE_STRATEGY: RoutingStrategy = {
  id: 'preset-cost-sensitive',
  name: 'Cost-Sensitive',
  taskType: 'quick-summary' as TaskType,
  preferredModel: 'gpt-4o-mini',
  preferredProvider: 'openai',
  fallbackModel: 'gemini-2.0-flash',
  fallbackProvider: 'google',
  minSuccessRate: 85,
  maxLatencyMs: 3000,
  enabled: true,
};

/**
 * High-quality strategy - maximize output quality regardless of cost
 */
const HIGH_QUALITY_STRATEGY: RoutingStrategy = {
  id: 'preset-high-quality',
  name: 'High-Quality',
  taskType: 'structured-summary' as TaskType,
  preferredModel: 'gpt-4o',
  preferredProvider: 'openai',
  fallbackModel: 'claude-sonnet-4-20250514',
  fallbackProvider: 'anthropic',
  minSuccessRate: 95,
  maxLatencyMs: 10000,
  enabled: true,
};

/**
 * Balanced strategy - balance between cost and quality
 */
const BALANCED_STRATEGY: RoutingStrategy = {
  id: 'preset-balanced',
  name: 'Balanced',
  taskType: 'standard-summary' as TaskType,
  preferredModel: 'claude-3-5-sonnet-20241022',
  preferredProvider: 'anthropic',
  fallbackModel: 'gemini-2.0-flash',
  fallbackProvider: 'google',
  minSuccessRate: 90,
  maxLatencyMs: 5000,
  enabled: true,
};

const now = Date.now();

/**
 * All preset strategies available in the marketplace
 */
export const PRESET_STRATEGIES: PresetStrategy[] = [
  {
    listing: {
      id: 'preset-cost-sensitive',
      name: 'Cost-Sensitive',
      description: 'Minimize cost while maintaining acceptable quality. Best for high-volume, simple tasks.',
      author: 'system',
      taskTypes: ['quick-summary', 'translation', 'tag-generation'],
      avgCostSaving: 0.6,
      rating: 4.5,
      usageCount: 1250,
      tags: ['cost-optimized', 'high-volume', 'fast'],
      createdAt: now,
    },
    strategy: COST_SENSITIVE_STRATEGY,
  },
  {
    listing: {
      id: 'preset-high-quality',
      name: 'High-Quality',
      description: 'Maximize output quality regardless of cost. Best for complex reasoning tasks.',
      author: 'system',
      taskTypes: ['structured-summary', 'chat', 'push-strategy'],
      avgCostSaving: -0.2,
      rating: 4.8,
      usageCount: 890,
      tags: ['quality-first', 'reasoning', 'complex-tasks'],
      createdAt: now,
    },
    strategy: HIGH_QUALITY_STRATEGY,
  },
  {
    listing: {
      id: 'preset-balanced',
      name: 'Balanced',
      description: 'Balance between cost and quality. Good default for most tasks.',
      author: 'system',
      taskTypes: ['standard-summary', 'intent-classification'],
      avgCostSaving: 0.3,
      rating: 4.6,
      usageCount: 2100,
      tags: ['balanced', 'default', 'general-purpose'],
      createdAt: now,
    },
    strategy: BALANCED_STRATEGY,
  },
];
