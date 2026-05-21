/**
 * Cost Estimator
 * Estimates token count and cost based on content characteristics
 */

import type { TaskType } from '../cost-tracker/types';
import type { RouterModelInfo } from '../providers-ai-subscription';
import { AI_SUBSCRIPTION_PROVIDERS } from '../providers-ai-subscription';
import { PRICING_TABLE } from '../cost-tracker/calculator';

export interface CostEstimation {
  inputTokens: number;
  outputTokens: number;
  costUSD: number;
}

/**
 * Estimate cost based on content length and task type
 * Chinese ≈ 2 chars/token, English ≈ 4 chars/token
 */
export function estimateCost(
  content: string,
  taskType: TaskType
): CostEstimation {
  const chars = content.length;
  const isChinese = /[\u4e00-\u9fa5]/.test(content);
  const inputTokens = isChinese ? Math.ceil(chars / 2) : Math.ceil(chars / 4);

  // Output token estimation based on task type
  const outputTokens = taskType === 'quick-summary' ? 50 :
                       taskType === 'structured-summary' ? 200 : 100;

  // Cost estimation using gemini-2.0-flash as baseline
  const costUSD = (inputTokens / 1000) * 0.0001 + (outputTokens / 1000) * 0.0004;

  return { inputTokens, outputTokens, costUSD };
}

/**
 * Get models sorted by estimated cost for a task type
 */
export function getModelsByEstimatedCost(
  taskType: TaskType,
  contentLength: number
): Array<{ model: RouterModelInfo; providerId: string; estimatedCost: number }> {
  const results: Array<{ model: RouterModelInfo; providerId: string; estimatedCost: number }> = [];

  for (const [providerId, provider] of Object.entries(AI_SUBSCRIPTION_PROVIDERS)) {
    const model = provider.models.find(m => m.taskTypes.includes(taskType));
    if (model) {
      // Calculate estimated cost using pricing table
      const pricing = PRICING_TABLE[model.id] || PRICING_TABLE['default'];
      const isChinese = false; // We don't know yet, use English estimate
      const inputTokens = Math.ceil(contentLength / 4);
      const outputTokens = taskType === 'quick-summary' ? 50 :
                           taskType === 'structured-summary' ? 200 : 100;
      const estimatedCost = (inputTokens / 1000) * pricing.inputPer1K +
                           (outputTokens / 1000) * pricing.outputPer1K;

      results.push({ model, providerId, estimatedCost });
    }
  }

  return results.sort((a, b) => a.estimatedCost - b.estimatedCost);
}

/**
 * Find the cheapest model for a task type that meets requirements
 */
export function findCheapestModel(
  taskType: TaskType,
  contentLength: number,
  minCapability?: { vision?: boolean; maxContentLength?: number }
): { model: RouterModelInfo; providerId: string; estimatedCost: number } | null {
  const candidates = getModelsByEstimatedCost(taskType, contentLength);

  for (const candidate of candidates) {
    if (minCapability?.vision && !candidate.model.capabilities.vision) {
      continue;
    }
    if (minCapability?.maxContentLength) {
      const maxLen = candidate.model.routingCondition?.maxContentLength;
      if (maxLen && maxLen < minCapability.maxContentLength) {
        continue;
      }
    }
    return candidate;
  }

  return null;
}
