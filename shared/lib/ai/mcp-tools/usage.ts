/**
 * MCP Tool Usage Tracking
 * Records and retrieves tool usage statistics
 */

import type { ToolUsageStats } from './types';

/**
 * In-memory storage for tool usage statistics
 */
const usageStats: Map<string, ToolUsageStats> = new Map();

/**
 * Detailed usage records for analytics
 */
interface UsageRecord {
  toolId: string;
  success: boolean;
  latencyMs: number;
  timestamp: number;
}

const usageRecords: UsageRecord[] = [];
const MAX_RECORDS = 10000;

/**
 * Record a tool usage event
 */
export async function recordToolUsage(
  toolId: string,
  success: boolean,
  latencyMs: number
): Promise<void> {
  // Get or create stats for this tool
  let stats = usageStats.get(toolId);
  
  if (!stats) {
    stats = {
      toolId,
      totalCalls: 0,
      successRate: 0,
      avgLatencyMs: 0,
      lastUsed: Date.now(),
    };
    usageStats.set(toolId, stats);
  }
  
  // Update running statistics
  const newTotalCalls = stats.totalCalls + 1;
  const newSuccessRate = success
    ? (stats.successRate * stats.totalCalls + 1) / newTotalCalls
    : (stats.successRate * stats.totalCalls) / newTotalCalls;
  const newAvgLatencyMs = (stats.avgLatencyMs * stats.totalCalls + latencyMs) / newTotalCalls;
  
  stats.totalCalls = newTotalCalls;
  stats.successRate = newSuccessRate;
  stats.avgLatencyMs = newAvgLatencyMs;
  stats.lastUsed = Date.now();
  
  // Add to usage records
  usageRecords.push({
    toolId,
    success,
    latencyMs,
    timestamp: Date.now(),
  });
  
  // Trim records if needed
  if (usageRecords.length > MAX_RECORDS) {
    usageRecords.splice(0, usageRecords.length - MAX_RECORDS);
  }
}

/**
 * Get usage statistics for a specific tool or all tools
 */
export async function getToolUsageStats(toolId?: string): Promise<ToolUsageStats[]> {
  if (toolId) {
    const stats = usageStats.get(toolId);
    return stats ? [stats] : [];
  }
  
  return Array.from(usageStats.values());
}

/**
 * Get recent usage records for a tool
 */
export async function getRecentUsage(
  toolId: string,
  limit: number = 100
): Promise<UsageRecord[]> {
  return usageRecords
    .filter(record => record.toolId === toolId)
    .slice(-limit);
}

/**
 * Get aggregate statistics across all tools
 */
export async function getAggregateStats(): Promise<{
  totalCalls: number;
  overallSuccessRate: number;
  avgLatencyMs: number;
  toolsUsed: number;
}> {
  const allStats = Array.from(usageStats.values());
  
  if (allStats.length === 0) {
    return {
      totalCalls: 0,
      overallSuccessRate: 0,
      avgLatencyMs: 0,
      toolsUsed: 0,
    };
  }
  
  const totalCalls = allStats.reduce((sum, s) => sum + s.totalCalls, 0);
  const weightedSuccessRate = allStats.reduce(
    (sum, s) => sum + s.successRate * s.totalCalls,
    0
  ) / totalCalls;
  const weightedLatency = allStats.reduce(
    (sum, s) => sum + s.avgLatencyMs * s.totalCalls,
    0
  ) / totalCalls;
  
  return {
    totalCalls,
    overallSuccessRate: weightedSuccessRate,
    avgLatencyMs: weightedLatency,
    toolsUsed: allStats.length,
  };
}

/**
 * Clear usage statistics (for testing)
 */
export function clearUsageStats(): void {
  usageStats.clear();
  usageRecords.length = 0;
}
