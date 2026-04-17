/**
 * 本地存储工具 - Web 端使用 localStorage
 */
import { AppSettings, Subscription, ContentItem } from '../types';

const STORAGE_PREFIX = 'ai_subscription_';

const DEFAULT_SETTINGS: AppSettings = {
  subscriptions: [],
  models: [],
  pushSettings: {
    enabled: false,
    pushTime: '09:00',
    pushChannel: 'notification',
    contentType: 'title_summary',
  },
  lastFetchTime: {},
};

function getKey(key: string): string {
  return `${STORAGE_PREFIX}${key}`;
}

export function loadSettings(): AppSettings {
  try {
    const data = localStorage.getItem(getKey('settings'));
    if (data) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    }
  } catch (e) {
    console.error('[Storage] 加载设置失败:', e);
  }
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(getKey('settings'), JSON.stringify(settings));
  } catch (e) {
    console.error('[Storage] 保存设置失败:', e);
  }
}

export function loadContent(subscriptionId: string): ContentItem[] {
  try {
    const data = localStorage.getItem(getKey(`content_${subscriptionId}`));
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveContent(subscriptionId: string, items: ContentItem[]): void {
  try {
    const trimmed = items.slice(0, 50);
    localStorage.setItem(getKey(`content_${subscriptionId}`), JSON.stringify(trimmed));
  } catch (e) {
    console.error('[Storage] 保存内容失败:', e);
  }
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
