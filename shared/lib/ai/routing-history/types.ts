/**
 * Routing History Types
 * Type definitions for routing decision history
 */

import type { TaskType } from '../providers-ai-subscription';

export interface RoutingAlternative {
  model: string;
  provider: string;
  score: number;
  reason: string; // "costRank too high" / "health check failed" / "preference mismatch"
}

export interface RoutingDecision {
  id: string;
  timestamp: number;
  taskType: TaskType;
  contentLength: number;
  selectedModel: string;
  selectedProvider: string;
  selectedScore: number;
  alternatives: RoutingAlternative[];
  estimatedCostUSD: number;
  actualCostUSD?: number;
}

export interface RoutingExplanation {
  decision: RoutingDecision;
  summary: string;
  factors: Array<{
    factor: string;
    impact: 'positive' | 'negative' | 'neutral';
    detail: string;
  }>;
}
