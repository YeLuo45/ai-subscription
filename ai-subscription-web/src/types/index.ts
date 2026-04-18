/**
 * 共享类型定义
 */

export type SubscriptionType = 'rss' | 'atom' | 'api';

export interface Subscription {
  id: string;
  name: string;
  url: string;
  type: SubscriptionType;
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

export interface ParsedItem {
  id: string;
  title: string;
  link: string;
  description: string;
  pubDate: string;
}

export interface FetchResult {
  items: ParsedItem[];
  title: string;
  type: 'rss' | 'atom' | 'api' | 'unknown';
}

export interface PushSettings {
  enabled: boolean;
  pushTime: string; // HH:mm
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
  models: ModelConfig[];
  pushSettings: PushSettings;
  lastFetchTime: Record<string, string>;
}

export type ModelProvider = 'minimax' | 'xiaomi' | 'zhipu' | 'claude' | 'gemini';

export interface ModelConfig {
  id: string;
  name: string;
  provider: ModelProvider;
  apiBaseUrl: string;
  apiKey: string;
  modelName: string;
  temperature: number;
  maxTokens: number;
  isDefault: boolean;
}

export interface SummarizeOptions {
  modelPriority?: string[];
  summaryLength?: 'short' | 'medium' | 'long';
  sessionId?: string;
}

export interface SummarizeResult {
  success: boolean;
  summary: string;
  keywords: string[];
  modelUsed: string;
  error?: string;
}

// ============================================================
// 抓取日志（调试用）
// ============================================================
export type FetchLogLevel = 'success' | 'fail' | 'pending';

export interface FetchLogEntry {
  id: string;
  subscriptionId: string;
  subscriptionName: string;
  url: string;
  level: FetchLogLevel;
  message: string;
  duration?: number; // ms
  itemCount?: number;
  error?: string;
  timestamp: string;
}

export const MAX_FETCH_LOGS = 100;

// ============================================================
// 预设订阅源（15个RSS订阅源）
// ============================================================
export const PRESET_SUBSCRIPTIONS: Array<{
  name: string;
  url: string;
  type: SubscriptionType;
  category: string;
}> = [
  // 技术类
  { name: 'Hacker News', url: 'https://hnrss.org/frontpage', type: 'rss', category: '技术' },
  { name: 'GitHub Trending (Atom)', url: 'https://github.com/trending.atom', type: 'atom', category: '技术' },
  { name: 'InfoQ', url: 'https://feed.infoq.com/', type: 'rss', category: '技术' },
  { name: 'DevOps.com', url: 'https://devops.com/feed/', type: 'rss', category: '技术' },
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/', type: 'rss', category: '科技' },
  // 科技 / AI
  { name: '36氪', url: 'https://36kr.com/feed', type: 'rss', category: '科技' },
  { name: 'MIT Tech Review', url: 'https://www.technologyreview.com/feed/', type: 'rss', category: '科技' },
  { name: 'VentureBeat AI', url: 'https://venturebeat.com/category/ai/feed/', type: 'rss', category: 'AI' },
  { name: '机器之心', url: 'https://jiqizhixin.com/rss', type: 'rss', category: 'AI' },
  { name: 'AI Weekly', url: 'https://aiweekly.co/latest', type: 'rss', category: 'AI' },
  // 科技博客
  { name: '少数派', url: 'https://sspai.com/feed', type: 'rss', category: '科技' },
  { name: 'Solidot', url: 'https://www.solidot.org/index.rss', type: 'rss', category: '技术' },
  { name: '品玩', url: 'https://www.pingwest.com/feed', type: 'rss', category: '科技' },
  { name: '极客公园', url: 'https://feeds.geekpark.net/geekpark', type: 'rss', category: '科技' },
  { name: '量子位', url: 'https://www.qbitai.com/feed', type: 'rss', category: 'AI' },
];
