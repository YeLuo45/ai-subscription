// Cost aggregation and statistics

import type { CostRecord, CostSummary } from './types';

export function aggregateRecords(records: CostRecord[]): CostSummary {
  if (records.length === 0) {
    const now = Date.now();
    return {
      totalCost: 0,
      totalRequests: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      costByModel: {},
      costByTaskType: {},
      avgLatencyMs: 0,
      successRate: 0,
      period: { start: now, end: now },
    };
  }

  const costs: CostSummary = {
    totalCost: 0,
    totalRequests: records.length,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    costByModel: {},
    costByTaskType: {},
    avgLatencyMs: 0,
    successRate: 0,
    period: {
      start: Math.min(...records.map(r => r.timestamp)),
      end: Math.max(...records.map(r => r.timestamp)),
    },
  };

  let totalLatency = 0;
  let successCount = 0;

  for (const record of records) {
    costs.totalCost += record.costUSD;
    costs.totalInputTokens += record.inputTokens;
    costs.totalOutputTokens += record.outputTokens;
    totalLatency += record.latencyMs;

    if (record.success) successCount++;

    costs.costByModel[record.modelId] = (costs.costByModel[record.modelId] || 0) + record.costUSD;
    costs.costByTaskType[record.taskType] = (costs.costByTaskType[record.taskType] || 0) + record.costUSD;
  }

  costs.avgLatencyMs = totalLatency / records.length;
  costs.successRate = (successCount / records.length) * 100;

  return costs;
}

export function getDailyCosts(records: CostRecord[]): Record<string, number> {
  const daily: Record<string, number> = {};

  for (const record of records) {
    const date = new Date(record.timestamp).toISOString().split('T')[0];
    daily[date] = (daily[date] || 0) + record.costUSD;
  }

  return daily;
}

export function getTopExpensiveModels(records: CostRecord[], limit = 5): Array<{ modelId: string; cost: number }> {
  const byModel: Record<string, number> = {};

  for (const record of records) {
    byModel[record.modelId] = (byModel[record.modelId] || 0) + record.costUSD;
  }

  return Object.entries(byModel)
    .map(([modelId, cost]) => ({ modelId, cost }))
    .sort((a, b) => b.cost - a.cost)
    .slice(0, limit);
}

export function getTopExpensiveTaskTypes(records: CostRecord[], limit = 5): Array<{ taskType: string; cost: number }> {
  const byTaskType: Record<string, number> = {};

  for (const record of records) {
    byTaskType[record.taskType] = (byTaskType[record.taskType] || 0) + record.costUSD;
  }

  return Object.entries(byTaskType)
    .map(([taskType, cost]) => ({ taskType, cost }))
    .sort((a, b) => b.cost - a.cost)
    .slice(0, limit);
}
