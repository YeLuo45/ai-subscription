// Cost Alert Types

export interface CostAlert {
  id: string;
  name: string;
  type: 'daily' | 'weekly' | 'monthly';
  threshold: number;           // 阈值（分）
  current: number;            // 当前累计
  percent: number;
  status: 'normal' | 'warning' | 'critical' | 'exceeded';
  lastTriggered?: number;
  createdAt: number;
}

export interface AlertNotification {
  id: string;
  alertId: string;
  type: 'warning' | 'critical' | 'exceeded';
  message: string;
  threshold: number;
  actual: number;
  createdAt: number;
  read: boolean;
}

export interface AlertConfig {
  enableBrowserNotification: boolean;
  enablePanelNotification: boolean;
  warningPercent: number;     // 80
  criticalPercent: number;     // 95
}

export type AlertStatus = 'normal' | 'warning' | 'critical' | 'exceeded';
