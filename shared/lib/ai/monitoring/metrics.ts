/**
 * Real-time Metrics Collector
 * Collects and aggregates request metrics for monitoring
 */

import type { RealtimeMetrics } from './types';

interface MetricsSnapshot {
  timestamp: number;
  metrics: RealtimeMetrics;
}

interface RequestRecord {
  timestamp: number;
  latencyMs: number;
  costUSD: number;
  success: boolean;
  modelId: string;
}

class MetricsCollector {
  private requestBuffer: RequestRecord[] = [];
  private metrics: RealtimeMetrics = {
    requestsPerMinute: 0,
    avgLatencyMs: 0,
    successRate: 1,
    costPerMinute: 0,
    activeTenants: 0,
    topModels: [],
  };
  private history: MetricsSnapshot[] = [];

  private readonly BUFFER_MAX_AGE_MS = 60000; // Keep 1 minute of data

  /**
   * Record a new request for metrics aggregation
   */
  recordRequest(latencyMs: number, costUSD: number, success: boolean, modelId: string): void {
    const now = Date.now();
    this.requestBuffer.push({ timestamp: now, latencyMs, costUSD, success, modelId });
    this.pruneBuffer(now);
    this.recalculate();
  }

  /**
   * Get current real-time metrics snapshot
   */
  getRealtimeMetrics(): RealtimeMetrics {
    return { ...this.metrics };
  }

  /**
   * Get metrics history for a given time period
   */
  getMetricsHistory(periodMs: number): MetricsSnapshot[] {
    const cutoff = Date.now() - periodMs;
    return this.history.filter(s => s.timestamp >= cutoff);
  }

  /**
   * Update active tenant count
   */
  setActiveTenants(count: number): void {
    this.metrics.activeTenants = count;
  }

  /**
   * Prune old entries from buffer
   */
  private pruneBuffer(now: number): void {
    const cutoff = now - this.BUFFER_MAX_AGE_MS;
    this.requestBuffer = this.requestBuffer.filter(r => r.timestamp >= cutoff);
  }

  /**
   * Recalculate metrics from current buffer
   */
  private recalculate(): void {
    const now = Date.now();
    const cutoff = now - this.BUFFER_MAX_AGE_MS;
    const recentRequests = this.requestBuffer.filter(r => r.timestamp >= cutoff);

    if (recentRequests.length === 0) {
      this.metrics.requestsPerMinute = 0;
      this.metrics.avgLatencyMs = 0;
      this.metrics.successRate = 1;
      this.metrics.costPerMinute = 0;
      this.metrics.topModels = [];
    } else {
      const totalLatency = recentRequests.reduce((sum, r) => sum + r.latencyMs, 0);
      const totalCost = recentRequests.reduce((sum, r) => sum + r.costUSD, 0);
      const successCount = recentRequests.filter(r => r.success).length;

      this.metrics.requestsPerMinute = recentRequests.length;
      this.metrics.avgLatencyMs = Math.round(totalLatency / recentRequests.length);
      this.metrics.successRate = successCount / recentRequests.length;
      this.metrics.costPerMinute = Math.round(totalCost * 1000) / 1000;

      // Calculate top models
      const modelCounts = new Map<string, number>();
      for (const r of recentRequests) {
        modelCounts.set(r.modelId, (modelCounts.get(r.modelId) || 0) + 1);
      }
      this.metrics.topModels = Array.from(modelCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([modelId, count]) => ({ modelId, count }));
    }

    // Save snapshot to history every 10 seconds
    const lastSnapshot = this.history[this.history.length - 1];
    if (!lastSnapshot || now - lastSnapshot.timestamp >= 10000) {
      this.history.push({ timestamp: now, metrics: { ...this.metrics } });
    }

    // Prune old history (keep max 1 hour)
    const historyCutoff = now - 3600000;
    this.history = this.history.filter(s => s.timestamp >= historyCutoff);
  }
}

export const metricsCollector = new MetricsCollector();
