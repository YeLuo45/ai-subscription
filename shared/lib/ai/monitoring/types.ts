/**
 * Monitoring Types
 * Real-time metrics, alert rules, alerts, and dashboard data types
 */

import type { TaskType } from '../cost-tracker/types';

/**
 * Real-time metrics snapshot
 */
export interface RealtimeMetrics {
  requestsPerMinute: number;
  avgLatencyMs: number;
  successRate: number;
  costPerMinute: number;
  activeTenants: number;
  topModels: Array<{ modelId: string; count: number }>;
}

/**
 * Alert rule definition for monitoring thresholds
 */
export interface AlertRule {
  id: string;
  name: string;
  metric: 'cost' | 'latency' | 'successRate' | 'errorRate';
  threshold: number;
  operator: '>' | '<' | '>=' | '<=';
  severity: 'info' | 'warning' | 'critical';
  enabled: boolean;
  cooldownMs: number;
  lastTriggered?: number;
}

/**
 * Alert instance triggered by rule evaluation
 */
export interface Alert {
  id: string;
  ruleId: string;
  tenantId: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  metric: string;
  currentValue: number;
  threshold: number;
  timestamp: number;
  acknowledged: boolean;
}

/**
 * Dashboard aggregated data for a tenant
 */
export interface DashboardData {
  summary: {
    totalRequests: number;
    totalCostUSD: number;
    avgSuccessRate: number;
    period: { start: number; end: number };
  };
  byTaskType: Array<{ taskType: TaskType; count: number; cost: number }>;
  byModel: Array<{ modelId: string; count: number; cost: number }>;
  costTrend: Array<{ timestamp: number; cost: number }>;
  alertHistory: Alert[];
}
