/**
 * Desktop notification service using Notification API
 * No external dependencies - pure browser APIs
 */

/**
 * Request notification permission from user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('[Notification] Browser does not support notifications');
    return 'denied';
  }
  
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  
  if (Notification.permission === 'denied') {
    return 'denied';
  }
  
  // Request permission
  const permission = await Notification.requestPermission();
  return permission;
}

/**
 * Send a desktop notification
 * @param title - Notification title
 * @param body - Notification body text
 * @param icon - Optional icon URL
 * @param tag - Optional tag for notification grouping
 * @param onClick - Optional callback when notification is clicked
 */
export function notify(
  title: string,
  body: string,
  icon?: string,
  tag?: string,
  onClick?: () => void
): Notification | null {
  if (!('Notification' in window)) {
    console.warn('[Notification] Browser does not support notifications');
    return null;
  }
  
  if (Notification.permission !== 'granted') {
    console.warn('[Notification] Permission not granted');
    return null;
  }
  
  const options: NotificationOptions = {
    body,
    icon: icon || '/icon.svg',
    tag: tag || title,
    requireInteraction: false,
    silent: false,
  };
  
  const notification = new Notification(title, options);
  
  if (onClick) {
    notification.onclick = () => {
      window.focus();
      onClick();
      notification.close();
    };
  }
  
  // Auto close after 5 seconds if not interacted
  setTimeout(() => notification.close(), 5000);
  
  return notification;
}

/**
 * Check if notifications are supported and permitted
 */
export function isNotificationSupported(): boolean {
  return 'Notification' in window;
}

export function isNotificationGranted(): boolean {
  return Notification.permission === 'granted';
}