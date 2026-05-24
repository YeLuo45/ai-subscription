/**
 * MCP Tool: estimate_cost
 * Exposes cost estimation via MCP
 */

import { calculateCost } from '../../cost-tracker/calculator';

export interface CostInput {
  modelName?: string;
  inputTokens?: number;
  outputTokens?: number;
}

export interface CostOutput {
  estimatedCost: number;
  currency: string;
  modelName: string;
}

export async function costTool(input: CostInput): Promise<CostOutput> {
  const modelName = input.modelName || 'gemini-2.0-flash';
  const inputTokens = input.inputTokens || 1000;
  const outputTokens = input.outputTokens || 500;

  const estimatedCost = calculateCost(modelName, inputTokens, outputTokens);

  return {
    estimatedCost,
    currency: 'USD',
    modelName,
  };
}
