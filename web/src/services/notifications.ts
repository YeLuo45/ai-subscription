// Notification service - Web Notification API
import type { Article, Summary } from '../types';

export async function requestPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  if (Notification.permission !== 'denied') {
    return await Notification.requestPermission();
  }
  return Notification.permission;
}

export function sendNotification(title: string, body: string, onClick?: () => void): void {
  if (Notification.permission !== 'granted') {
    console.warn('Notification permission not granted');
    return;
  }

  const notification = new Notification(title, {
    body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'ai-subscription',
    requireInteraction: false,
  });

  if (onClick) {
    notification.onclick = () => {
      onClick();
      notification.close();
    };
  }

  setTimeout(() => notification.close(), 15000);
}

export function notifyNewArticle(article: Article, summary?: Summary): void {
  const body = summary?.content
    ? summary.content.slice(0, 200) + (summary.content.length > 200 ? '...' : '')
    : article.description?.slice(0, 200) || '点击查看详情';

  sendNotification(article.title, body, () => {
    window.open(article.link, '_blank');
  });
}

export function notifyBatch(subscriptionName: string, count: number, summaries: Summary[]): void {
  const body = summaries.length > 0
    ? `共${count}篇新内容，${summaries.length}篇已生成AI摘要`
    : `共${count}篇新内容`;

  sendNotification(`${subscriptionName} 更新`, body, () => {
    window.location.hash = '#/articles';
  });
}

export function notifyError(message: string): void {
  sendNotification('订阅抓取失败', message);
}
