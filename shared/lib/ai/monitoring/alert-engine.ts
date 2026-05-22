/**
 * Alert Rule Engine
 * Evaluates metrics against configured rules and generates alerts
 */

import { metricsCollector } from './metrics';
import type { Alert, AlertRule, RealtimeMetrics } from './types';

/**
 * Default alert rules for common monitoring scenarios
 */
export const DEFAULT_ALERT_RULES: AlertRule[] = [
  {
    id: 'high-cost',
    name: 'High Cost Per Minute',
    metric: 'cost',
    threshold: 10,
    operator: '>',
    severity: 'warning',
    enabled: true,
    cooldownMs: 60000,
  },
  {
    id: 'critical-cost',
    name: 'Critical Cost Per Minute',
    metric: 'cost',
    threshold: 50,
    operator: '>',
    severity: 'critical',
    enabled: true,
    cooldownMs: 30000,
  },
  {
    id: 'high-latency',
    name: 'High Latency',
    metric: 'latency',
    threshold: 5000,
    operator: '>',
    severity: 'warning',
    enabled: true,
    cooldownMs: 60000,
  },
  {
    id: 'critical-latency',
    name: 'Critical Latency',
    metric: 'latency',
    threshold: 10000,
    operator: '>',
    severity: 'critical',
    enabled: true,
    cooldownMs: 30000,
  },
  {
    id: 'low-success-rate',
    name: 'Low Success Rate',
    metric: 'successRate',
    threshold: 0.95,
    operator: '<',
    severity: 'warning',
    enabled: true,
    cooldownMs: 60000,
  },
  {
    id: 'critical-success-rate',
    name: 'Critical Success Rate',
    metric: 'successRate',
    threshold: 0.80,
    operator: '<',
    severity: 'critical',
    enabled: true,
    cooldownMs: 30000,
  },
];

export class AlertEngine {
  private rules: Map<string, AlertRule>;
  private alerts: Alert[] = [];

  constructor() {
    this.rules = new Map();
    DEFAULT_ALERT_RULES.forEach(rule => {
      this.rules.set(rule.id, { ...rule });
    });
  }

  /**
   * Check metrics against all enabled rules and generate alerts
   */
  checkMetrics(metrics: RealtimeMetrics): Alert[] {
    const now = Date.now();
    const newAlerts: Alert[] = [];

    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;

      // Check cooldown
      if (rule.lastTriggered && now - rule.lastTriggered < rule.cooldownMs) continue;

      const currentValue = this.getMetricValue(metrics, rule.metric);
      const triggered = this.evaluateCondition(currentValue, rule.threshold, rule.operator);

      if (triggered) {
        const alert: Alert = {
          id: `alert-${rule.id}-${now}`,
          ruleId: rule.id,
          tenantId: 'system',
          severity: rule.severity,
          message: this.buildAlertMessage(rule, currentValue),
          metric: rule.metric,
          currentValue,
          threshold: rule.threshold,
          timestamp: now,
          acknowledged: false,
        };
        newAlerts.push(alert);
        rule.lastTriggered = now;
      }
    }

    this.alerts = this.alerts.concat(newAlerts);

    // Keep last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    return newAlerts;
  }

  /**
   * Add a new alert rule
   */
  addRule(rule: AlertRule): void {
    this.rules.set(rule.id, { ...rule });
  }

  /**
   * Remove an alert rule
   */
  removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
  }

  /**
   * Get all alert rules
   */
  getRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get recent alerts
   */
  getAlerts(limit: number = 50): Alert[] {
    return this.alerts.slice(-limit);
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
    }
  }

  /**
   * Clear acknowledged alerts
   */
  clearAcknowledged(): void {
    this.alerts = this.alerts.filter(a => !a.acknowledged);
  }

  private getMetricValue(metrics: RealtimeMetrics, metric: string): number {
    switch (metric) {
      case 'cost':
        return metrics.costPerMinute;
      case 'latency':
        return metrics.avgLatencyMs;
      case 'successRate':
        return metrics.successRate;
      case 'errorRate':
        return 1 - metrics.successRate;
      default:
        return 0;
    }
  }

  private evaluateCondition(value: number, threshold: number, operator: string): boolean {
    switch (operator) {
      case '>':
        return value > threshold;
      case '<':
        return value < threshold;
      case '>=':
        return value >= threshold;
      case '<=':
        return value <= threshold;
      default:
        return false;
    }
  }

  private buildAlertMessage(rule: AlertRule, currentValue: number): string {
    const operatorSymbol = {
      '>': 'exceeded',
      '<': 'dropped below',
      '>=': 'reached or exceeded',
      '<=': 'reached or dropped below',
    }[rule.operator] || rule.operator;

    return `${rule.name}: ${rule.metric} ${operatorSymbol} ${rule.threshold} (current: ${currentValue.toFixed(2)})`;
  }
}

export const alertEngine = new AlertEngine();
