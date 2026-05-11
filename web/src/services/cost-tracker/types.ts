// Cost tracking types

import type { TaskType } from '@shared/lib/ai/providers-ai-subscription';

export interface CostRecord {
  id: string;
  timestamp: number;
  taskType: TaskType;
  modelId: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  costUSD: number;
  latencyMs: number;
  success: boolean;
}

export interface CostSummary {
  totalCost: number;
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  costByModel: Record<string, number>;
  costByTaskType: Record<string, number>;
  avgLatencyMs: number;
  successRate: number;
  period: { start: number; end: number };
}

export interface PricingEntry {
  inputPer1K: number;
  outputPer1K: number;
}

export type PricingTable = Record<string, PricingEntry>;

export interface CostAlert {
  threshold: number;
  currentCost: number;
  period: 'daily' | 'weekly' | 'monthly';
}
