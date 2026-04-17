/**
 * Notifications Service - Web 端通知栏推送
 * 使用 Web Notification API
 */

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
}

/**
 * 检查通知权限状态
 */
export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

/**
 * 请求通知权限
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
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

/**
 * 发送系统通知
 */
export function sendNotification(options: NotificationOptions): Notification | null {
  if (!('Notification' in window)) {
    console.warn('[Notifications] 浏览器不支持 Notification API');
    return null;
  }

  if (Notification.permission !== 'granted') {
    console.warn('[Notifications] 未获得通知权限');
    return null;
  }

  const notification = new Notification(options.title, {
    body: options.body,
    icon: options.icon || '/favicon.ico',
    tag: options.tag,
    requireInteraction: options.requireInteraction,
  });

  notification.onclick = () => {
    window.focus();
    notification.close();
  };

  // 5秒后自动关闭
  setTimeout(() => notification.close(), 5000);

  return notification;
}

/**
 * 发送批量内容通知
 */
export function sendContentNotification(
  items: Array<{ title: string; description?: string; link?: string }>,
  sourceName: string
): void {
  if (items.length === 0) return;

  if (items.length === 1) {
    sendNotification({
      title: items[0].title,
      body: items[0].description?.slice(0, 100) || sourceName,
      tag: `content-${sourceName}`,
    });
    return;
  }

  // 多个内容时发送汇总通知
  sendNotification({
    title: `${sourceName} - ${items.length} 条更新`,
    body: items.slice(0, 3).map(i => `• ${i.title}`).join('\n'),
    tag: `content-batch-${sourceName}`,
  });
}
