/**
 * 本地存储工具 - uni-app 小程序版使用 uni.setStorageSync
 */

export interface Subscription {
  id: string;
  name: string;
  url: string;
  type: 'rss' | 'atom' | 'api';
  category: string;
  enabled: boolean;
  aiSummaryEnabled: boolean;
  fetchIntervalMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export interface ContentItem {
  id: string;
  subscriptionId: string;
  title: string;
  link: string;
  description: string;
  pubDate: string;
  summary?: string;
  keywords?: string[];
  isRead: boolean;
}

export interface PushSettings {
  enabled: boolean;
  pushTime: string;
  pushChannel: 'notification' | 'email' | 'both';
  contentType: 'title_only' | 'title_summary' | 'title_full_summary';
  emailConfig?: EmailConfig;
}

export interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  email: string;
  password: string;
  useTLS: boolean;
}

export interface AppSettings {
  subscriptions: Subscription[];
  models: import('../adapters/ai-model-adapter').ModelConfig[];
  pushSettings: PushSettings;
  lastFetchTime: Record<string, string>;
}

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

const STORAGE_KEY = 'ai_subscription_settings';

export function loadSettings(): AppSettings {
  try {
    const data = uni.getStorageSync(STORAGE_KEY);
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
    uni.setStorageSync(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('[Storage] 保存设置失败:', e);
  }
}

export function loadContent(subscriptionId: string): ContentItem[] {
  try {
    const key = `ai_subscription_content_${subscriptionId}`;
    const data = uni.getStorageSync(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveContent(subscriptionId: string, items: ContentItem[]): void {
  try {
    const key = `ai_subscription_content_${subscriptionId}`;
    const trimmed = items.slice(0, 50);
    uni.setStorageSync(key, JSON.stringify(trimmed));
  } catch (e) {
    console.error('[Storage] 保存内容失败:', e);
  }
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
