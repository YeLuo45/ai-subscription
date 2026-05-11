// Cost tracking types

// TaskType is re-exported from llm-router which imports it from providers-ai-subscription
// We use string type to avoid circular dependency issues
export type TaskType = 
  | 'translation'
  | 'quick-summary'
  | 'standard-summary'
  | 'structured-summary'
  | 'tag-generation'
  | 'knowledge-graph'
  | 'chat'
  | 'push-strategy'
  | 'intent-classification';

export interface CostRecord {
  id: string;
  timestamp: number;
  taskType: string;
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
