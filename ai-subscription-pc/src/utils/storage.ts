/**
 * Electron API 类型声明
 */

export interface ElectronAPI {
  store: {
    getAll: () => Promise<StoreData>;
    setSubscriptions: (subs: Subscription[]) => Promise<boolean>;
    setModels: (models: ModelConfig[]) => Promise<boolean>;
    setPushSettings: (settings: PushSettings) => Promise<boolean>;
    setContents: (subId: string, contents: ContentItem[]) => Promise<boolean>;
  };
  fetch: {
    rss: (url: string, type: string) => Promise<FetchResult>;
  };
  notification: {
    show: (title: string, body: string, onClick?: string) => Promise<{ success: boolean; error?: string }>;
  };
  email: {
    send: (options: EmailOptions) => Promise<{ success: boolean; error?: string }>;
    test: (smtpConfig: EmailConfig) => Promise<{ success: boolean; error?: string }>;
  };
  history: {
    add: (record: PushHistoryRecord) => Promise<boolean>;
  };
  on: (channel: string, callback: (...args: unknown[]) => void) => void;
  removeAllListeners: (channel: string) => void;
}

export interface StoreData {
  subscriptions: Subscription[];
  models: ModelConfig[];
  pushSettings: PushSettings;
  contents: Record<string, ContentItem[]>;
  pushHistory: PushHistoryRecord[];
}

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

export interface ModelConfig {
  id: string;
  name: string;
  provider: 'minimax' | 'xiaomi' | 'zhipu' | 'claude' | 'gemini';
  apiBaseUrl: string;
  apiKey: string;
  modelName: string;
  temperature: number;
  maxTokens: number;
  isDefault: boolean;
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

export interface EmailOptions {
  smtpConfig: EmailConfig;
  to: string;
  subject: string;
  html: string;
}

export interface FetchResult {
  success: boolean;
  items?: ContentItem[];
  title?: string;
  error?: string;
}

export interface PushHistoryRecord {
  id?: string;
  subscriptionId: string;
  subscriptionName: string;
  title: string;
  summary?: string;
  pushChannel: string;
  status: 'success' | 'failure';
  errorMessage?: string;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
