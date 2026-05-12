// Notification utilities for cost alerts

import type { AlertNotification } from './types';

/**
 * Send a browser notification if permission is granted
 */
export async function sendBrowserNotification(title: string, body: string): Promise<void> {
  if (typeof Notification === 'undefined') {
    return;
  }
  
  if (Notification.permission === 'granted') {
    new Notification(title, { body });
  }
}

/**
 * Dispatch a custom event for panel notification
 */
export function sendPanelNotification(notification: AlertNotification): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  window.dispatchEvent(new CustomEvent('cost-alert', { detail: notification }));
}

/**
 * Request browser notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof Notification === 'undefined') {
    return 'denied';
  }
  
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission;
  }
  
  return Notification.permission;
}
