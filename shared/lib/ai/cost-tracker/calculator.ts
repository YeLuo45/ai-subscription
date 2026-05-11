// Cost calculation logic

import type { PricingTable, CostRecord } from './types';

// Current pricing table (USD per 1000 tokens)
export const PRICING_TABLE: PricingTable = {
  'gpt-4o': { inputPer1K: 0.005, outputPer1K: 0.015 },
  'gpt-4o-mini': { inputPer1K: 0.00015, outputPer1K: 0.0006 },
  'claude-3-5-sonnet-20241022': { inputPer1K: 0.003, outputPer1K: 0.015 },
  'claude-3-5-sonnet': { inputPer1K: 0.003, outputPer1K: 0.015 },
  'claude-3-opus': { inputPer1K: 0.015, outputPer1K: 0.075 },
  'gemini-2.0-flash': { inputPer1K: 0.0001, outputPer1K: 0.0004 },
  'gemini-2.5-pro-preview-06-05': { inputPer1K: 0.0025, outputPer1K: 0.01 },
  'default': { inputPer1K: 0.001, outputPer1K: 0.005 },
};

export function calculateCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = PRICING_TABLE[modelId] || PRICING_TABLE['default'];
  
  const inputCost = (inputTokens / 1000) * pricing.inputPer1K;
  const outputCost = (outputTokens / 1000) * pricing.outputPer1K;
  
  return inputCost + outputCost;
}

export function calculateRecordCost(record: CostRecord): number {
  return calculateCost(record.modelId, record.inputTokens, record.outputTokens);
}

export function formatCost(costUSD: number): string {
  if (costUSD < 0.001) {
    return `$${(costUSD * 1000).toFixed(4)}`;
  }
  if (costUSD < 1) {
    return `$${costUSD.toFixed(4)}`;
  }
  return `$${costUSD.toFixed(2)}`;
}

export function formatTokens(tokens: number): string {
  if (tokens < 1000) {
    return `${tokens}`;
  }
  if (tokens < 1000000) {
    return `${(tokens / 1000).toFixed(1)}K`;
  }
  return `${(tokens / 1000000).toFixed(1)}M`;
}

export function getModelDisplayName(modelId: string): string {
  const names: Record<string, string> = {
    'gpt-4o': 'GPT-4o',
    'gpt-4o-mini': 'GPT-4o Mini',
    'claude-3-5-sonnet-20241022': 'Claude 3.5 Sonnet',
    'gemini-2.0-flash': 'Gemini 2.0 Flash',
    'gemini-2.5-pro-preview-06-05': 'Gemini 2.5 Pro',
  };
  return names[modelId] || modelId;
}
