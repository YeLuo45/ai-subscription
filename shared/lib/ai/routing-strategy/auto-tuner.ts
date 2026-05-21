/**
 * Auto-Tuner
 * Automatically generates routing strategies based on analytics and recommendations
 */

import type { RoutingStrategy } from './types';
import { getModelPerformance } from '../routing-history/analytics';
import { getRoutingRecommendations, type RoutingRecommendation } from '../routing-history/recommender';
import type { TaskType } from '../providers-ai-subscription';

/**
 * Generate routing strategies from analytics data
 * Uses historical performance to create optimized strategies
 */
export async function generateStrategyFromAnalytics(): Promise<RoutingStrategy[]> {
  const [performance, recommendations] = await Promise.all([
    getModelPerformance(),
    getRoutingRecommendations(),
  ]);

  const strategies: RoutingStrategy[] = [];

  // Create a map for quick lookup
  const perfMap = new Map<string, typeof performance[0]>();
  for (const perf of performance) {
    const key = `${perf.modelId}:${perf.providerId}`;
    perfMap.set(key, perf);
  }

  // Generate strategies from recommendations
  for (const rec of recommendations) {
    const perfKey = `${rec.recommendedModel}:${rec.recommendedProvider}`;
    const perf = perfMap.get(perfKey);

    const strategy: RoutingStrategy = {
      id: `auto-${rec.taskType}-${Date.now()}`,
      name: `Auto-generated: ${rec.taskType} strategy`,
      taskType: rec.taskType,
      preferredModel: rec.recommendedModel,
      preferredProvider: rec.recommendedProvider,
      minSuccessRate: perf?.successRate ? Math.max(80, perf.successRate - 5) : 90,
      maxLatencyMs: perf?.avgLatencyMs ? Math.min(2000, perf.avgLatencyMs * 1.2) : 1500,
      enabled: true,
    };

    // Add fallback if we have another viable option
    if (perf && perf.totalCalls > 10) {
      // Find a fallback with different characteristics
      const fallback = findFallbackStrategy(rec.taskType, rec.recommendedModel, performance);
      if (fallback) {
        strategy.fallbackModel = fallback.modelId;
        strategy.fallbackProvider = fallback.providerId;
      }
    }

    strategies.push(strategy);
  }

  // Also create strategies for task types without recommendations if we have data
  const taskTypesWithRecs = new Set(recommendations.map(r => r.taskType));
  const allTaskTypes: TaskType[] = [
    'translation',
    'quick-summary',
    'standard-summary',
    'structured-summary',
    'tag-generation',
    'knowledge-graph',
    'chat',
    'push-strategy',
    'intent-classification',
  ];

  for (const taskType of allTaskTypes) {
    if (taskTypesWithRecs.has(taskType)) continue;

    // Check if we have performance data for this task type
    const taskTypePerf = performance.filter(p => p.bestFor.includes(taskType));
    if (taskTypePerf.length === 0) continue;

    // Pick the best performing model for this task type
    const best = taskTypePerf.sort((a, b) => {
      // Sort by success rate desc, then latency asc
      if (b.successRate !== a.successRate) return b.successRate - a.successRate;
      return a.avgLatencyMs - b.avgLatencyMs;
    })[0];

    strategies.push({
      id: `auto-${taskType}-${Date.now()}`,
      name: `Auto-generated: ${taskType} strategy`,
      taskType,
      preferredModel: best.modelId,
      preferredProvider: best.providerId,
      minSuccessRate: Math.max(80, best.successRate - 5),
      maxLatencyMs: Math.min(2000, best.avgLatencyMs * 1.2),
      enabled: true,
    });
  }

  console.log(`[Auto-Tuner] Generated ${strategies.length} strategies from analytics`);
  return strategies;
}

/**
 * Find a fallback strategy different from the primary
 */
function findFallbackStrategy(
  taskType: TaskType,
  primaryModel: string,
  performance: { modelId: string; providerId: string; successRate: number; avgLatencyMs: number; bestFor: TaskType[] }[]
): { modelId: string; providerId: string } | null {
  // Find models that are different from primary and have decent performance
  const candidates = performance
    .filter(p =>
      p.bestFor.includes(taskType) &&
      !(p.modelId === primaryModel) &&
      p.successRate > 70
    )
    .sort((a, b) => {
      // Prefer higher success rate, then lower latency
      if (b.successRate !== a.successRate) return b.successRate - a.successRate;
      return a.avgLatencyMs - b.avgLatencyMs;
    });

  if (candidates.length === 0) return null;

  return {
    modelId: candidates[0].modelId,
    providerId: candidates[0].providerId,
  };
}

/**
 * Optimize existing strategy based on new data
 */
export async function optimizeStrategy(strategy: RoutingStrategy): Promise<RoutingStrategy> {
  const performance = await getModelPerformance();
  const recommendations = await getRoutingRecommendations();

  // Find recommendation for this task type
  const rec = recommendations.find(r => r.taskType === strategy.taskType);

  if (rec) {
    // Update with recommended values
    return {
      ...strategy,
      preferredModel: rec.recommendedModel,
      preferredProvider: rec.recommendedProvider,
      minSuccessRate: Math.max(80, rec.confidence > 70 ? 95 : 90),
    };
  }

  // Find best performing model for this task type
  const taskTypePerf = performance.filter(p => p.bestFor.includes(strategy.taskType));
  if (taskTypePerf.length === 0) {
    return strategy; // No data, keep existing
  }

  const best = taskTypePerf.sort((a, b) => {
    if (b.successRate !== a.successRate) return b.successRate - a.successRate;
    return a.avgLatencyMs - b.avgLatencyMs;
  })[0];

  return {
    ...strategy,
    preferredModel: best.modelId,
    preferredProvider: best.providerId,
    minSuccessRate: Math.max(80, best.successRate - 5),
    maxLatencyMs: Math.min(2000, best.avgLatencyMs * 1.2),
  };
}

/**
 * Validate a strategy against current performance data
 */
export async function validateStrategy(strategy: RoutingStrategy): Promise<{
  isValid: boolean;
  issues: string[];
  suggestion?: string;
}> {
  const performance = await getModelPerformance();
  const issues: string[] = [];

  const matchingPerf = performance.find(
    p => p.modelId === strategy.preferredModel && p.providerId === strategy.preferredProvider
  );

  if (!matchingPerf) {
    issues.push('No historical data for this model/provider combination');
    return { isValid: false, issues, suggestion: 'Choose a model with historical performance data' };
  }

  if (matchingPerf.successRate < strategy.minSuccessRate) {
    issues.push(
      `Success rate ${matchingPerf.successRate.toFixed(1)}% is below minimum ${strategy.minSuccessRate}%`
    );
  }

  if (matchingPerf.avgLatencyMs > strategy.maxLatencyMs) {
    issues.push(
      `Latency ${matchingPerf.avgLatencyMs.toFixed(0)}ms exceeds maximum ${strategy.maxLatencyMs}ms`
    );
  }

  if (matchingPerf.totalCalls < 10) {
    issues.push('Limited historical data (< 10 calls)');
  }

  const suggestion = issues.length > 0
    ? `Consider using ${matchingPerf.modelId} which has ${matchingPerf.totalCalls} calls, ${matchingPerf.successRate.toFixed(1)}% success rate`
    : undefined;

  return {
    isValid: issues.length === 0,
    issues,
    suggestion,
  };
}

/**
 * Generate A/B test-ready strategy variants
 * Creates two strategy variations for testing
 */
export async function generateStrategyVariants(
  taskType: TaskType,
  baseStrategy?: RoutingStrategy
): Promise<{ strategyA: RoutingStrategy; strategyB: RoutingStrategy }> {
  const performance = await getModelPerformance();
  const recommendations = await getRoutingRecommendations();

  const rec = recommendations.find(r => r.taskType === taskType);
  const taskTypePerf = performance.filter(p => p.bestFor.includes(taskType));

  // Strategy A: Use recommendation (if available) or best performer
  const strategyAModel = rec
    ? { modelId: rec.recommendedModel, providerId: rec.recommendedProvider }
    : taskTypePerf.length > 0
      ? { modelId: taskTypePerf[0].modelId, providerId: taskTypePerf[0].providerId }
      : { modelId: 'gpt-4o-mini', providerId: 'openai' };

  // Strategy B: Use a different model (lower cost alternative or different provider)
  let strategyBModel: { modelId: string; providerId: string };

  if (taskTypePerf.length > 1) {
    // Pick second best
    strategyBModel = {
      modelId: taskTypePerf[1].modelId,
      providerId: taskTypePerf[1].providerId,
    };
  } else {
    // Fall back to a known cheap model
    strategyBModel = { modelId: 'gpt-4o-mini', providerId: 'openai' };
  }

  const baseId = baseStrategy?.id || `variant-${taskType}`;

  return {
    strategyA: {
      id: `${baseId}-variant-a`,
      name: `${taskType} - Variant A (Primary)`,
      taskType,
      preferredModel: strategyAModel.modelId,
      preferredProvider: strategyAModel.providerId,
      minSuccessRate: 90,
      maxLatencyMs: 1500,
      enabled: true,
    },
    strategyB: {
      id: `${baseId}-variant-b`,
      name: `${taskType} - Variant B (Alternative)`,
      taskType,
      preferredModel: strategyBModel.modelId,
      preferredProvider: strategyBModel.providerId,
      minSuccessRate: 85,
      maxLatencyMs: 2000,
      enabled: true,
    },
  };
}
