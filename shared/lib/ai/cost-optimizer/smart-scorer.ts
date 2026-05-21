/**
 * Smart Scorer
 * Scores candidate models based on cost, preference, health, and content fit
 */

import type { RouterModelInfo } from '../providers-ai-subscription';
import type { ProviderHealth, ScoringWeights } from './types';

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  costWeight: 2.0,
  preferenceWeight: 1.5,
  healthWeight: 1.0,
  lengthFitWeight: 1.0,
};

/**
 * Evaluate how well a model's context window fits the content length
 */
function evaluateContentFit(model: RouterModelInfo, contentLength: number): number {
  const contextWindow = model.contextWindow;
  const routingCondition = model.routingCondition;

  // If content exceeds context window, return very low score
  if (contentLength > contextWindow) {
    return 0;
  }

  // If model has explicit max content length, check it
  if (routingCondition?.maxContentLength) {
    if (contentLength > routingCondition.maxContentLength) {
      return 0;
    }
  }

  // Calculate fit score based on how much of context window is used
  // Higher utilization = better fit (assuming we want to use the model efficiently)
  const utilizationRatio = contentLength / contextWindow;

  if (utilizationRatio < 0.1) {
    // Very small content for a large context model - not ideal
    return 0.5;
  } else if (utilizationRatio < 0.5) {
    // Good utilization
    return 1.0;
  } else if (utilizationRatio < 0.9) {
    // Optimal utilization
    return 1.2;
  } else {
    // Near capacity - could be risky
    return 0.8;
  }
}

/**
 * Score a model for a given content and conditions
 * Higher score = better choice
 */
export function scoreModel(
  model: RouterModelInfo,
  contentLength: number,
  preference: 'speed' | 'quality' | 'balanced',
  health: ProviderHealth,
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS
): number {
  // Base score starts at 0 - models that don't meet basic requirements get 0
  let score = 0;

  // 1. Cost score: lower cost rank (1) = higher score
  // costRank is 1 (cheapest), 2, or 3 (most expensive)
  const costScore = (3 - model.costRank) * weights.costWeight;
  score += costScore;

  // 2. Preference match score
  const modelPreference = model.routingCondition?.preference;
  if (modelPreference === preference) {
    score += weights.preferenceWeight;
  } else if (preference === 'balanced' && modelPreference) {
    // Balanced preference gets partial credit for any model with a defined preference
    score += weights.preferenceWeight * 0.5;
  }

  // 3. Health score: available providers get positive score based on latency
  if (health.available) {
    // Latency-based score: lower latency = higher score
    // Cap at 100ms, above which the score becomes negative
    const latencyScore = Math.max(0, (100 - health.latencyMs) / 10) * weights.healthWeight;
    score += latencyScore;
  } else {
    // Unavailable providers get a large negative score
    score -= 1000;
  }

  // 4. Content fit score
  const fitScore = evaluateContentFit(model, contentLength);
  score += fitScore * weights.lengthFitWeight;

  return score;
}

/**
 * Rank models by their scores and return in descending order
 */
export function rankModels(
  models: Array<{ model: RouterModelInfo; providerId: string }>,
  contentLength: number,
  preference: 'speed' | 'quality' | 'balanced',
  healthMap: Map<string, ProviderHealth>,
  weights?: ScoringWeights
): Array<{ model: RouterModelInfo; providerId: string; score: number; health: ProviderHealth }> {
  const ranked = models.map(({ model, providerId }) => {
    const health = healthMap.get(providerId) || {
      providerId,
      available: false,
      latencyMs: 999999,
      lastCheck: 0,
    };
    const score = scoreModel(model, contentLength, preference, health, weights);
    return { model, providerId, score, health };
  });

  // Enhanced logging for bidding visualization
  console.log(`[Cost Optimizer] Scoring ${ranked.length} candidates:`);
  ranked.forEach((r, idx) => {
    const healthStatus = r.health.available ? 'OK' : 'DOWN';
    const bestMarker = idx === 0 ? ' BEST' : '';
    console.log(`  - ${r.providerId}/${r.model.id}: score=${r.score.toFixed(2)}, health=${healthStatus}(${r.health.latencyMs}ms), costRank=${r.model.costRank}${bestMarker}`);
  });

  return ranked.sort((a, b) => b.score - a.score);
}

/**
 * Select the best model from candidates
 */
export function selectBestModel(
  models: Array<{ model: RouterModelInfo; providerId: string }>,
  contentLength: number,
  preference: 'speed' | 'quality' | 'balanced',
  healthMap: Map<string, ProviderHealth>,
  weights?: ScoringWeights
): { model: RouterModelInfo; providerId: string; score: number } | null {
  const ranked = rankModels(models, contentLength, preference, healthMap, weights);

  // Filter to only available models and return the top one
  const available = ranked.filter(({ score }) => score > -1000); // Filter out completely unavailable
  return available.length > 0 ? available[0] : null;
}
