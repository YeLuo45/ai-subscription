/**
 * Alert Notifier
 * Sends alert notifications through various channels
 */

import type { Alert } from './types';

export type NotificationChannel = 'console' | 'email' | 'webhook';

/**
 * Send an alert through specified notification channels
 */
export async function sendAlert(alert: Alert, channels: NotificationChannel[]): Promise<void> {
  const tasks = channels.map(channel => sendToChannel(alert, channel));
  await Promise.allSettled(tasks);
}

async function sendToChannel(alert: Alert, channel: NotificationChannel): Promise<void> {
  switch (channel) {
    case 'console':
      sendToConsole(alert);
      break;
    case 'email':
      await sendToEmail(alert);
      break;
    case 'webhook':
      await sendToWebhook(alert);
      break;
  }
}

function sendToConsole(alert: Alert): void {
  const prefix = `[${alert.severity.toUpperCase()}]`;
  console.warn(`${prefix} Alert: ${alert.message}`, {
    id: alert.id,
    ruleId: alert.ruleId,
    metric: alert.metric,
    currentValue: alert.currentValue,
    threshold: alert.threshold,
    timestamp: new Date(alert.timestamp).toISOString(),
    acknowledged: alert.acknowledged,
  });
}

async function sendToEmail(alert: Alert): Promise<void> {
  // Placeholder for email integration
  // In production, this would integrate with an email service (SendGrid, SES, etc.)
  console.log(`[Email] Alert notification: ${alert.message} -> configured recipients`);
  // Simulate async operation
  await Promise.resolve();
}

async function sendToWebhook(alert: Alert): Promise<void> {
  // Placeholder for webhook integration
  // In production, this would POST to configured webhook URLs
  console.log(`[Webhook] Alert payload prepared: ${JSON.stringify({
    id: alert.id,
    severity: alert.severity,
    message: alert.message,
    metric: alert.metric,
    currentValue: alert.currentValue,
    threshold: alert.threshold,
    timestamp: alert.timestamp,
  })}`);
  // Simulate async operation
  await Promise.resolve();
}
