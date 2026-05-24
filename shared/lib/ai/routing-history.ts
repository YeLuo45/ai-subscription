// Stub for routing-history - not yet implemented
export interface RoutingDecision {
  id: string;
  timestamp: number;
  taskType: string;
  contentLength: number;
  selectedModel: string;
  selectedProvider: string;
  selectedScore: number;
  alternatives: Array<{ model: string; provider: string; score: number; reason: string }>;
  estimatedCostUSD: number;
}

export interface RoutingExplanation {
  decision: RoutingDecision;
  summary: string;
  factors: Array<{ factor: string; impact: 'positive' | 'negative' | 'neutral'; detail: string }>;
}
