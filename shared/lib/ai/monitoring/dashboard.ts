/**
 * Dashboard Data Aggregation
 * Aggregates metrics and alert data for dashboard display
 */

import type { Alert, DashboardData, RealtimeMetrics } from './types';
import { metricsCollector } from './metrics';
import { alertEngine } from './alert-engine';
import type { TaskType } from '../cost-tracker/types';

/**
 * Get aggregated dashboard data for a tenant
 */
export async function getDashboardData(
  tenantId: string,
  periodMs: number
): Promise<DashboardData> {
  // Get metrics history for the period
  const history = metricsCollector.getMetricsHistory(periodMs);
  const now = Date.now();
  const periodStart = now - periodMs;

  // Calculate summary statistics
  let totalRequests = 0;
  let totalCostUSD = 0;
  let totalSuccess = 0;
  let totalLatency = 0;

  for (const snapshot of history) {
    totalRequests += snapshot.metrics.requestsPerMinute;
    totalCostUSD += snapshot.metrics.costPerMinute;
    totalSuccess += snapshot.metrics.successRate;
    totalLatency += snapshot.metrics.avgLatencyMs;
  }

  const avgSuccessRate = history.length > 0 ? totalSuccess / history.length : 1;

  // Build cost trend from history
  const costTrend = history.map(s => ({
    timestamp: s.timestamp,
    cost: s.metrics.costPerMinute,
  }));

  // Aggregate by task type (simulated - in production would come from actual records)
  const byTaskType = aggregateByTaskType(history);

  // Aggregate by model (simulated - in production would come from actual records)
  const byModel = aggregateByModel(history);

  // Get recent alerts
  const alertHistory = alertEngine.getAlerts(20).filter(
    a => a.timestamp >= periodStart || !a.acknowledged
  );

  return {
    summary: {
      totalRequests,
      totalCostUSD: Math.round(totalCostUSD * 1000) / 1000,
      avgSuccessRate: Math.round(avgSuccessRate * 1000) / 1000,
      period: { start: periodStart, end: now },
    },
    byTaskType,
    byModel,
    costTrend,
    alertHistory,
  };
}

/**
 * Aggregate metrics by task type
 */
function aggregateByTaskType(
  history: Array<{ timestamp: number; metrics: RealtimeMetrics }>
): Array<{ taskType: TaskType; count: number; cost: number }> {
  // In production, this would aggregate from actual cost records
  // For now, return placeholder structure
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

  return taskTypes.map(taskType => ({
    taskType,
    count: 0,
    cost: 0,
  }));
}

/**
 * Aggregate metrics by model
 */
function aggregateByModel(
  history: Array<{ timestamp: number; metrics: RealtimeMetrics }>
): Array<{ modelId: string; count: number; cost: number }> {
  // Combine top models from all snapshots
  const modelMap = new Map<string, { count: number; cost: number }>();

  for (const snapshot of history) {
    for (const model of snapshot.metrics.topModels) {
      const existing = modelMap.get(model.modelId) || { count: 0, cost: 0 };
      modelMap.set(model.modelId, {
        count: existing.count + model.count,
        cost: existing.cost + (snapshot.metrics.costPerMinute / history.length || 0),
      });
    }
  }

  return Array.from(modelMap.entries())
    .map(([modelId, data]) => ({
      modelId,
      count: data.count,
      cost: Math.round(data.cost * 1000) / 1000,
    }))
    .sort((a, b) => b.count - a.count);
}
