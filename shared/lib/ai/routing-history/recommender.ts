/**
 * Routing Recommendation Engine
 * Provides optimal model configuration suggestions based on historical data
 */

import type { ModelPerformance } from './analytics';
import { getModelPerformance } from './analytics';

export interface RoutingRecommendation {
  taskType: TaskType;
  recommendedModel: string;
  recommendedProvider: string;
  reason: string;
  potentialSavings: number;
  confidence: number;
}

export interface CostSaving {
  taskType: TaskType;
  currentAvgCostUSD: number;
  recommendedCostUSD: number;
  savingPercent: number;
  monthlyEstimate: number;
}

type TaskType = 
  | 'translation'
  | 'quick-summary'
  | 'standard-summary'
  | 'structured-summary'
  | 'tag-generation'
  | 'knowledge-graph'
  | 'chat'
  | 'push-strategy'
  | 'intent-classification';

interface TaskTypeStats {
  totalCalls: number;
  totalCost: number;
  modelCosts: Record<string, { modelId: string; providerId: string; cost: number; calls: number }>;
  avgLatencyByModel: Record<string, number>;
  successRateByModel: Record<string, { success: number; total: number }>;
}

/**
 * Generate routing recommendations based on historical performance
 */
export async function getRoutingRecommendations(): Promise<RoutingRecommendation[]> {
  const [performance, costRecords] = await Promise.all([
    getModelPerformance(),
    getCostRecordsForAnalysis(),
  ]);

  if (performance.length === 0) {
    return getDefaultRecommendations();
  }

  // Aggregate stats by task type
  const taskTypeStats = await aggregateByTaskType(costRecords);
  
  const recommendations: RoutingRecommendation[] = [];
  const taskTypes: TaskType[] = [
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

  for (const taskType of taskTypes) {
    const stats = taskTypeStats[taskType];
    if (!stats || stats.totalCalls < 3) {
      // Not enough data, skip
      continue;
    }

    // Find the best model for this task type
    // Best = highest success rate, reasonable latency, lowest cost among high-performers
    let bestModel: string | null = null;
    let bestProvider: string | null = null;
    let bestScore = -Infinity;
    let bestCost = 0;
    let reason = '';

    for (const [modelKey, data] of Object.entries(stats.modelCosts)) {
      const [modelId, providerId] = modelKey.split('|');
      const successRate = stats.successRateByModel[modelKey] 
        ? stats.successRateByModel[modelKey].success / stats.successRateByModel[modelKey].total 
        : 0.5;
      const avgLatency = stats.avgLatencyByModel[modelKey] || 500;
      
      // Score: prioritize success rate, then latency, then cost
      // Weight: success rate (40%), latency (30%), cost (30%)
      const normalizedCost = data.cost / Math.max(data.calls, 1);
      const costScore = Math.max(0, 1 - normalizedCost / 0.1); // Normalize to $0.10 max
      const latencyScore = Math.max(0, 1 - avgLatency / 2000); // Normalize to 2000ms max
      const score = successRate * 0.4 + latencyScore * 0.3 + costScore * 0.3;

      if (score > bestScore) {
        bestScore = score;
        bestModel = modelId;
        bestProvider = providerId;
        bestCost = normalizedCost;
        
        if (successRate > 0.95 && avgLatency < 500) {
          reason = `High success rate (${(successRate * 100).toFixed(0)}%) and fast latency (${avgLatency.toFixed(0)}ms)`;
        } else if (successRate > 0.95) {
          reason = `Excellent reliability (${(successRate * 100).toFixed(0)}% success rate)`;
        } else if (avgLatency < 500) {
          reason = `Fast response time (${avgLatency.toFixed(0)}ms avg)`;
        } else {
          reason = `Best balance of speed, reliability, and cost`;
        }
      }
    }

    if (bestModel && bestProvider) {
      // Calculate potential savings (difference from current average)
      const avgCost = stats.totalCost / stats.totalCalls;
      const potentialSavings = Math.max(0, avgCost - bestCost);

      // Confidence based on sample size and consistency
      const confidence = Math.min(95, 50 + stats.totalCalls * 2);

      recommendations.push({
        taskType,
        recommendedModel: bestModel,
        recommendedProvider: bestProvider,
        reason,
        potentialSavings,
        confidence,
      });
    }
  }

  return recommendations.sort((a, b) => b.potentialSavings - a.potentialSavings);
}

/**
 * Calculate cost savings estimates
 */
export async function getCostSavingsEstimate(): Promise<CostSaving[]> {
  const recommendations = await getRoutingRecommendations();
  const costRecords = await getCostRecordsForAnalysis();
  
  const taskTypeStats = await aggregateByTaskType(costRecords);
  const monthlyEstimate = estimateMonthlyRequests();

  const savings: CostSaving[] = [];

  for (const rec of recommendations) {
    const stats = taskTypeStats[rec.taskType];
    if (!stats) continue;

    const currentAvgCost = stats.totalCost / Math.max(stats.totalCalls, 1);
    const savingPercent = currentAvgCost > 0 
      ? ((currentAvgCost - rec.recommendedModel) / currentAvgCost) * 100 
      : 0;

    savings.push({
      taskType: rec.taskType,
      currentAvgCostUSD: currentAvgCost,
      recommendedCostUSD: rec.potentialSavings > 0 
        ? currentAvgCost * (1 - savingPercent / 100) 
        : currentAvgCost,
      savingPercent: Math.max(0, savingPercent),
      monthlyEstimate: rec.potentialSavings * monthlyEstimate,
    });
  }

  return savings.sort((a, b) => b.monthlyEstimate - a.monthlyEstimate);
}

// Helper functions

async function getCostRecordsForAnalysis(): Promise<Array<{
  taskType: string;
  modelId: string;
  provider: string;
  costUSD: number;
  latencyMs: number;
  success: boolean;
}>> {
  // Try to get from cost-tracker storage
  try {
    const { getAllRecords } = await import('../cost-tracker/storage');
    const records = await getAllRecords();
    return records.map(r => ({
      taskType: r.taskType,
      modelId: r.modelId,
      provider: r.provider,
      costUSD: r.costUSD,
      latencyMs: r.latencyMs,
      success: r.success,
    }));
  } catch {
    return [];
  }
}

async function aggregateByTaskType(
  records: Array<{
    taskType: string;
    modelId: string;
    provider: string;
    costUSD: number;
    latencyMs: number;
    success: boolean;
  }>
): Promise<Record<string, TaskTypeStats>> {
  const stats: Record<string, TaskTypeStats> = {};

  for (const record of records) {
    if (!stats[record.taskType]) {
      stats[record.taskType] = {
        totalCalls: 0,
        totalCost: 0,
        modelCosts: {},
        avgLatencyByModel: {},
        successRateByModel: {},
      };
    }

    const ts = stats[record.taskType];
    const modelKey = `${record.modelId}|${record.provider}`;

    ts.totalCalls++;
    ts.totalCost += record.costUSD;

    if (!ts.modelCosts[modelKey]) {
      ts.modelCosts[modelKey] = { modelId: record.modelId, providerId: record.provider, cost: 0, calls: 0 };
    }
    ts.modelCosts[modelKey].cost += record.costUSD;
    ts.modelCosts[modelKey].calls++;

    if (!ts.avgLatencyByModel[modelKey]) {
      ts.avgLatencyByModel[modelKey] = 0;
    }
    // Rolling average
    const prevCalls = ts.modelCosts[modelKey].calls - 1;
    ts.avgLatencyByModel[modelKey] = 
      (ts.avgLatencyByModel[modelKey] * prevCalls + record.latencyMs) / ts.modelCosts[modelKey].calls;

    if (!ts.successRateByModel[modelKey]) {
      ts.successRateByModel[modelKey] = { success: 0, total: 0 };
    }
    ts.successRateByModel[modelKey].total++;
    if (record.success) {
      ts.successRateByModel[modelKey].success++;
    }
  }

  return stats;
}

function estimateMonthlyRequests(): number {
  // Rough estimate based on typical usage patterns
  // In production, this would be calculated from actual historical data
  return 1000;
}

function getDefaultRecommendations(): RoutingRecommendation[] {
  // Return sensible defaults when no historical data available
  return [
    {
      taskType: 'translation',
      recommendedModel: 'gpt-4o-mini',
      recommendedProvider: 'openai',
      reason: 'Cost-effective for translation tasks',
      potentialSavings: 0.002,
      confidence: 30,
    },
    {
      taskType: 'quick-summary',
      recommendedModel: 'gpt-4o-mini',
      recommendedProvider: 'openai',
      reason: 'Fast and affordable for quick summaries',
      potentialSavings: 0.001,
      confidence: 30,
    },
    {
      taskType: 'standard-summary',
      recommendedModel: 'gpt-4o',
      recommendedProvider: 'openai',
      reason: 'Balanced performance for standard summaries',
      potentialSavings: 0.005,
      confidence: 30,
    },
  ];
}
