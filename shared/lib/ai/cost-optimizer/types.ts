/**
 * Cost Optimizer Types
 * Type definitions for cost-aware routing
 */

import type { RouterModelInfo } from '../providers-ai-subscription';
import type { TaskType } from '../cost-tracker/types';

export interface CostEstimate {
  taskType: TaskType;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedCostUSD: number;
  preferredModel: RouterModelInfo;
  alternatives: RouterModelInfo[];
}

export interface BudgetPolicy {
  dailyLimitUSD: number;
  monthlyLimitUSD: number;
  fallbackWhenExceeded: 'free-tier' | 'local' | 'reject';
}

export interface ProviderHealth {
  providerId: string;
  available: boolean;
  latencyMs: number;
  error?: string;
  lastCheck: number;
}

export interface ScoringWeights {
  costWeight: number;
  preferenceWeight: number;
  healthWeight: number;
  lengthFitWeight: number;
}

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  costWeight: 2.0,
  preferenceWeight: 1.5,
  healthWeight: 1.0,
  lengthFitWeight: 1.0,
};
