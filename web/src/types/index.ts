// Core types for AI Subscription Aggregator

export interface Subscription {
  id: string;
  name: string;
  url: string;
  type: 'rss' | 'atom' | 'api';
  category: string;
  enabled: boolean;
  aiSummaryEnabled: boolean;
  fetchIntervalMinutes: number;
  lastFetchedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AIModel {
  id: string;
  name: string;
  provider: 'minimax' | 'xiaomi' | 'zhipu' | 'claude' | 'gemini' | 'openai';
  apiBaseUrl: string;
  apiKey: string;
  modelName: string;
  temperature: number;
  maxTokens: number;
  isDefault: boolean;
  createdAt: string;
}

export interface Article {
  id: string;
  subscriptionId: string;
  title: string;
  link: string;
  description: string;
  content?: string;
  author?: string;
  pubDate: string;
  fetchedAt: string;
  isRead: boolean;
  isStarred: boolean;
  isReadLater: boolean;    // ADD: read later flag
  readLaterAt?: string;   // ADD: when added to read later
}

export interface Summary {
  id: string;
  articleId: string;
  subscriptionId: string;
  content: string;
  keywords: string[];
  modelId: string;
  tokenUsed: number;
  createdAt: string;
  tags: string[];
  isStarred: boolean;
}

export interface PushHistory {
  id: string;
  subscriptionId: string;
  title: string;
  summary: string;
  pushChannel: 'notification' | 'email' | 'webhook' | 'both';
  pushedAt: string;
  status: 'success' | 'failure';
  errorMessage?: string;
}

export interface PushSettings {
  enabled: boolean;
  time: string; // HH:mm
  frequency: 'hourly' | 'daily' | 'weekly';
  contentType: 'title_only' | 'title_summary' | 'title_full_summary';
  channel: 'notification' | 'email' | 'webhook' | 'both';
  quietHoursEnabled: boolean;
  quietHoursStart: string; // HH:mm
  quietHoursEnd: string;   // HH:mm
  maxDailyPush: number;
}

export interface EmailSettings {
  enabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  fromEmail: string;
  fromName: string;
}

export interface AppSettings {
  push: PushSettings;
  email: EmailSettings;
  defaultModelId: string;
  summaryLength: 'short' | 'medium' | 'long';
  webhookUrl?: string;
  webhookHeaders?: Record<string, string>;
}

export const PRESET_SUBSCRIPTIONS: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt' | 'lastFetchedAt'>[] = [
  // AI & Tech
  { name: 'Hacker News', url: 'https://hnrss.org/frontpage', type: 'rss', category: 'AI', enabled: true, aiSummaryEnabled: true, fetchIntervalMinutes: 30 },
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/', type: 'rss', category: 'Tech', enabled: true, aiSummaryEnabled: true, fetchIntervalMinutes: 60 },
  { name: 'MIT Technology Review', url: 'https://www.technologyreview.com/feed/', type: 'rss', category: 'AI', enabled: true, aiSummaryEnabled: true, fetchIntervalMinutes: 60 },
  { name: 'VentureBeat AI', url: 'https://venturebeat.com/category/ai/feed/', type: 'rss', category: 'AI', enabled: true, aiSummaryEnabled: true, fetchIntervalMinutes: 60 },
  { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', type: 'rss', category: 'Tech', enabled: false, aiSummaryEnabled: true, fetchIntervalMinutes: 60 },
  // Developer
  { name: 'GitHub Blog', url: 'https://github.blog/feed/', type: 'rss', category: 'Dev', enabled: true, aiSummaryEnabled: true, fetchIntervalMinutes: 60 },
  { name: 'Dev.to', url: 'https://dev.to/feed', type: 'rss', category: 'Dev', enabled: false, aiSummaryEnabled: true, fetchIntervalMinutes: 60 },
  { name: 'CSS-Tricks', url: 'https://css-tricks.com/feed/', type: 'rss', category: 'Dev', enabled: false, aiSummaryEnabled: true, fetchIntervalMinutes: 120 },
  // AI News
  { name: 'AI Newsletter', url: 'https://buttondown.email/AI/dispatch', type: 'rss', category: 'AI', enabled: false, aiSummaryEnabled: true, fetchIntervalMinutes: 60 },
  { name: 'DeepMind Blog', url: 'https://deepmind.com/blog/feed/basic/', type: 'rss', category: 'AI', enabled: true, aiSummaryEnabled: true, fetchIntervalMinutes: 60 },
  { name: 'OpenAI Blog', url: 'https://openai.com/blog/rss/', type: 'rss', category: 'AI', enabled: true, aiSummaryEnabled: true, fetchIntervalMinutes: 60 },
  // Finance
  { name: 'Bloomberg Tech', url: 'https://feeds.bloomberg.com/technology/news.rss', type: 'rss', category: 'Finance', enabled: false, aiSummaryEnabled: true, fetchIntervalMinutes: 60 },
  { name: 'CNBC Technology', url: 'https://www.cnbc.com/id/19854910/device/rss/rss.html', type: 'rss', category: 'Finance', enabled: false, aiSummaryEnabled: true, fetchIntervalMinutes: 60 },
  // Science
  { name: 'ArXiv CS.AI', url: 'https://rss.arxiv.org/rss/cs.AI', type: 'rss', category: 'Science', enabled: true, aiSummaryEnabled: true, fetchIntervalMinutes: 120 },
  { name: 'Nature', url: 'https://www.nature.com/nature.rss', type: 'rss', category: 'Science', enabled: false, aiSummaryEnabled: true, fetchIntervalMinutes: 120 },
];

export const DEFAULT_MODELS: Omit<AIModel, 'id' | 'createdAt'>[] = [
  {
    name: 'MiniMax M2',
    provider: 'minimax',
    apiBaseUrl: 'https://api.minimax.chat/v1',
    apiKey: '',
    modelName: 'MiniMax-M2.7',
    temperature: 0.3,
    maxTokens: 1000,
    isDefault: true,
  },
  {
    name: '小米',
    provider: 'xiaomi',
    apiBaseUrl: 'https://api.xiaomimimo.com/v1',
    apiKey: '',
    modelName: 'MiLM',
    temperature: 0.3,
    maxTokens: 1000,
    isDefault: false,
  },
  {
    name: '智谱 GLM-4',
    provider: 'zhipu',
    apiBaseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    apiKey: '',
    modelName: 'glm-4',
    temperature: 0.3,
    maxTokens: 1000,
    isDefault: false,
  },
  {
    name: 'Claude 3.5',
    provider: 'claude',
    apiBaseUrl: 'https://api.anthropic.com/v1',
    apiKey: '',
    modelName: 'claude-3-5-sonnet-20241022',
    temperature: 0.3,
    maxTokens: 1000,
    isDefault: false,
  },
  {
    name: 'Gemini 2.0',
    provider: 'gemini',
    apiBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    apiKey: '',
    modelName: 'gemini-2.0-flash',
    temperature: 0.3,
    maxTokens: 1000,
    isDefault: false,
  },
];
