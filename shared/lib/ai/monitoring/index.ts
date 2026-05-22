/**
 * Monitoring Module
 * Real-time metrics collection, alerting, and dashboard data aggregation
 */

// Types
export * from './types';

// Metrics collector
export { metricsCollector } from './metrics';

// Alert engine
export { alertEngine, DEFAULT_ALERT_RULES } from './alert-engine';
export type { AlertRule } from './types';

// Notifier
export { sendAlert } from './notifier';
export type { NotificationChannel } from './notifier';

// Dashboard
export { getDashboardData } from './dashboard';
