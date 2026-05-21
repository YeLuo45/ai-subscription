/**
 * Model Performance Analytics
 * Aggregates statistics from routing-history and cost-tracker
 */

import type { RoutingDecision } from './types';
import type { CostRecord, CostSummary } from '../cost-tracker/types';
import { aggregateRecords } from '../cost-tracker/aggregator';
import { getRoutingHistory } from './storage';
import { getAllRecords } from '../cost-tracker/storage';

export interface ModelPerformance {
  modelId: string;
  providerId: string;
  totalCalls: number;
  successRate: number;
  avgLatencyMs: number;
  avgCostUSD: number;
  avgQualityScore?: number;
  bestFor: TaskType[];
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

interface ModelStats {
  totalCalls: number;
  successCount: number;
  totalLatency: number;
  totalCost: number;
  taskTypeCounts: Record<string, number>;
  providerId: string;
}

/**
 * Get model performance metrics aggregated from routing history and cost tracker
 */
export async function getModelPerformance(): Promise<ModelPerformance[]> {
  const [routingHistory, costRecords] = await Promise.all([
    getRoutingHistory(1000),
    getAllRecords(),
  ]);

  // Aggregate model stats from cost records (more accurate for costs/latency)
  const modelStatsMap = new Map<string, ModelStats>();

  for (const record of costRecords) {
    const key = `${record.modelId}:${record.provider}`;
    
    if (!modelStatsMap.has(key)) {
      modelStatsMap.set(key, {
        totalCalls: 0,
        successCount: 0,
        totalLatency: 0,
        totalCost: 0,
        taskTypeCounts: {},
        providerId: record.provider,
      });
    }
    
    const stats = modelStatsMap.get(key)!;
    stats.totalCalls++;
    if (record.success) stats.successCount++;
    stats.totalLatency += record.latencyMs;
    stats.totalCost += record.costUSD;
    stats.taskTypeCounts[record.taskType] = (stats.taskTypeCounts[record.taskType] || 0) + 1;
  }

  // If no cost records, try to get from routing history
  if (modelStatsMap.size === 0 && routingHistory.length > 0) {
    for (const decision of routingHistory) {
      const key = `${decision.selectedModel}:${decision.selectedProvider}`;
      
      if (!modelStatsMap.has(key)) {
        modelStatsMap.set(key, {
          totalCalls: 0,
          successCount: 0,
          totalLatency: 0,
          totalCost: 0,
          taskTypeCounts: {},
          providerId: decision.selectedProvider,
        });
      }
      
      const stats = modelStatsMap.get(key)!;
      stats.totalCalls++;
      // Routing decisions that made it to selection are implicitly successful
      stats.successCount++;
      stats.totalCost += decision.actualCostUSD ?? decision.estimatedCostUSD;
      stats.taskTypeCounts[decision.taskType] = (stats.taskTypeCounts[decision.taskType] || 0) + 1;
    }
  }

  // Convert to ModelPerformance array
  const performances: ModelPerformance[] = [];

  for (const [key, stats] of modelStatsMap) {
    const [modelId, providerId] = key.split(':');
    
    // Determine best task types (top 3 by call count)
    const bestFor = (Object.entries(stats.taskTypeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([taskType]) => taskType as TaskType));

    performances.push({
      modelId,
      providerId,
      totalCalls: stats.totalCalls,
      successRate: stats.totalCalls > 0 ? (stats.successCount / stats.totalCalls) * 100 : 0,
      avgLatencyMs: stats.totalCalls > 0 ? stats.totalLatency / stats.totalCalls : 0,
      avgCostUSD: stats.totalCalls > 0 ? stats.totalCost / stats.totalCalls : 0,
      bestFor,
    });
  }

  // Sort by total calls descending
  performances.sort((a, b) => b.totalCalls - a.totalCalls);

  return performances;
}

/**
 * Get performance for a specific model
 */
export async function getModelPerformanceById(
  modelId: string,
  providerId?: string
): Promise<ModelPerformance | null> {
  const allPerformance = await getModelPerformance();
  return allPerformance.find(
    p => p.modelId === modelId && (providerId ? p.providerId === providerId : true)
  ) || null;
}

/**
 * Get overall cost summary from cost tracker
 */
export async function getCostSummary(): Promise<CostSummary> {
  const records = await getAllRecords();
  return aggregateRecords(records);
}

/**
 * Get routing decisions within a time range
 */
export async function getRoutingDecisionsByTimeRange(
  startTime: number,
  endTime: number
): Promise<RoutingDecision[]> {
  const all = await getRoutingHistory(10000);
  return all.filter(d => d.timestamp >= startTime && d.timestamp <= endTime);
}
