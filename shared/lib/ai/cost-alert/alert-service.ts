// Cost Alert Service - Core business logic for cost alerts

import type { CostAlert, AlertNotification, AlertConfig, AlertStatus } from './types';
import * as storage from './storage';
import { sendBrowserNotification, sendPanelNotification } from './notifier';

// Helper to get time range for a period type
function getPeriodRange(type: 'daily' | 'weekly' | 'monthly'): { start: number; end: number } {
  const now = new Date();
  const end = now.getTime();
  let start: number;

  switch (type) {
    case 'daily': {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      start = today.getTime();
      break;
    }
    case 'weekly': {
      const dayOfWeek = now.getDay();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - dayOfWeek);
      startOfWeek.setHours(0, 0, 0, 0);
      start = startOfWeek.getTime();
      break;
    }
    case 'monthly': {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      start = startOfMonth.getTime();
      break;
    }
    default:
      start = end - 24 * 60 * 60 * 1000; // Default to last 24h
  }

  return { start, end };
}

// Calculate cost for a time period from cost-tracker
async function getPeriodCost(type: 'daily' | 'weekly' | 'monthly'): Promise<number> {
  try {
    const { getRecordsByTimeRange } = await import('../cost-tracker/storage');
    const { aggregateRecords } = await import('../cost-tracker/aggregator');
    
    const { start, end } = getPeriodRange(type);
    const records = await getRecordsByTimeRange(start, end);
    const summary = aggregateRecords(records);
    
    return summary.totalCost;
  } catch (error) {
    console.error('[CostAlert] Failed to get period cost:', error);
    return 0;
  }
}

// Determine alert status based on percent
function determineStatus(percent: number, config: AlertConfig): AlertStatus {
  if (percent >= 100) return 'exceeded';
  if (percent >= config.criticalPercent) return 'critical';
  if (percent >= config.warningPercent) return 'warning';
  return 'normal';
}

// Create notification message
function createNotificationMessage(
  alert: CostAlert,
  type: 'warning' | 'critical' | 'exceeded'
): string {
  const statusText = {
    warning: '警告',
    critical: '严重',
    exceeded: '超出预算',
  }[type];

  const typeText = {
    daily: '今日',
    weekly: '本周',
    monthly: '本月',
  }[alert.type];

  return `${typeText}成本${statusText}: ${alert.name} 已使用 ${alert.percent.toFixed(1)}% ($${alert.current.toFixed(4)} / $${(alert.threshold / 100).toFixed(2)})`;
}

export class CostAlertService {
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;
    await storage.initAlertStorage();
    this.initialized = true;
  }

  // ============================================================
  // Alert Rule Management
  // ============================================================

  async createAlert(param: { name: string; type: 'daily' | 'weekly' | 'monthly'; threshold: number }): Promise<CostAlert> {
    await this.init();
    
    const alert: CostAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name: param.name,
      type: param.type,
      threshold: param.threshold, // in cents
      current: 0,
      percent: 0,
      status: 'normal',
      createdAt: Date.now(),
    };

    await storage.saveAlert(alert);
    return alert;
  }

  async getAlerts(): Promise<CostAlert[]> {
    await this.init();
    return storage.getAllAlerts();
  }

  async updateAlert(id: string, updates: Partial<CostAlert>): Promise<void> {
    await this.init();
    
    const alert = await storage.getAlert(id);
    if (!alert) {
      throw new Error(`Alert not found: ${id}`);
    }

    const updated = { ...alert, ...updates };
    await storage.saveAlert(updated);
  }

  async deleteAlert(id: string): Promise<void> {
    await this.init();
    await storage.deleteAlert(id);
  }

  // ============================================================
  // Notification History
  // ============================================================

  async getNotifications(limit?: number): Promise<AlertNotification[]> {
    await this.init();
    return storage.getNotifications(limit);
  }

  async markRead(notificationId: string): Promise<void> {
    await this.init();
    await storage.markRead(notificationId);
  }

  async clearNotifications(): Promise<void> {
    await this.init();
    await storage.clearNotifications();
  }

  // ============================================================
  // Configuration
  // ============================================================

  async getConfig(): Promise<AlertConfig> {
    await this.init();
    return storage.getConfig();
  }

  async updateConfig(config: Partial<AlertConfig>): Promise<void> {
    await this.init();
    const current = await storage.getConfig();
    await storage.saveConfig({ ...current, ...config });
  }

  // ============================================================
  // Core: Check and Trigger Alerts
  // ============================================================

  async checkAndAlert(): Promise<void> {
    await this.init();

    const alerts = await this.getAlerts();
    if (alerts.length === 0) return;

    const config = await this.getConfig();
    const now = Date.now();

    for (const alert of alerts) {
      // Get current period cost
      const currentCost = await getPeriodCost(alert.type);
      const percent = alert.threshold > 0 ? (currentCost / (alert.threshold / 100)) * 100 : 0;
      const status = determineStatus(percent, config);

      // Update alert with current values
      alert.current = currentCost * 100; // Store in cents for consistency
      alert.percent = percent;
      alert.status = status;

      // Check if we need to trigger a notification
      const shouldNotify = 
        status !== 'normal' &&
        (!alert.lastTriggered || now - alert.lastTriggered > 60 * 60 * 1000); // Min 1hr between notifications

      if (shouldNotify) {
        let notificationType: 'warning' | 'critical' | 'exceeded';
        
        if (status === 'exceeded') {
          notificationType = 'exceeded';
        } else if (status === 'critical') {
          notificationType = 'critical';
        } else {
          notificationType = 'warning';
        }

        const message = createNotificationMessage(alert, notificationType);

        const notification: AlertNotification = {
          id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          alertId: alert.id,
          type: notificationType,
          message,
          threshold: alert.threshold,
          actual: alert.current,
          createdAt: now,
          read: false,
        };

        // Save notification
        await storage.saveNotification(notification);

        // Send notifications
        if (config.enableBrowserNotification) {
          const title = notificationType === 'exceeded' ? '💸 预算超支' :
                        notificationType === 'critical' ? '⚠️ 成本严重告警' : '📊 成本警告';
          await sendBrowserNotification(title, message);
        }

        if (config.enablePanelNotification) {
          sendPanelNotification(notification);
        }

        // Update last triggered time
        alert.lastTriggered = now;
      }

      // Save updated alert
      await storage.saveAlert(alert);
    }
  }
}

// Singleton instance
let serviceInstance: CostAlertService | null = null;

export function getCostAlertService(): CostAlertService {
  if (!serviceInstance) {
    serviceInstance = new CostAlertService();
  }
  return serviceInstance;
}

// For backward compatibility
export const costAlertService = typeof window !== 'undefined' ? getCostAlertService() : null;
