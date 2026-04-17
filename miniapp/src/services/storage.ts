// Storage service for uni-app - uses wx.storage
import type { Subscription, AIModel, Article, Summary, PushHistory, AppSettings } from '../types';

const STORAGE_KEYS = {
  subscriptions: 'ai_sub_subscriptions',
  models: 'ai_sub_models',
  articles: 'ai_sub_articles',
  summaries: 'ai_sub_summaries',
  pushHistory: 'ai_sub_push_history',
  settings: 'ai_sub_settings',
} as const;

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ============ Subscriptions ============
export function getSubscriptions(): Subscription[] {
  try {
    const data = uni.getStorageSync(STORAGE_KEYS.subscriptions);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

export function saveSubscription(sub: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>): Subscription {
  const subs = getSubscriptions();
  const now = new Date().toISOString();
  const full: Subscription = { ...sub, id: generateId(), createdAt: now, updatedAt: now };
  subs.push(full);
  uni.setStorageSync(STORAGE_KEYS.subscriptions, JSON.stringify(subs));
  return full;
}

export function updateSubscription(sub: Subscription): Subscription {
  const subs = getSubscriptions();
  const idx = subs.findIndex((s) => s.id === sub.id);
  if (idx !== -1) {
    subs[idx] = { ...sub, updatedAt: new Date().toISOString() };
    uni.setStorageSync(STORAGE_KEYS.subscriptions, JSON.stringify(subs));
  }
  return sub;
}

export function deleteSubscription(id: string): void {
  const subs = getSubscriptions().filter((s) => s.id !== id);
  uni.setStorageSync(STORAGE_KEYS.subscriptions, JSON.stringify(subs));
}

// ============ Articles ============
export function getArticles(subscriptionId?: string, limit = 50): Article[] {
  try {
    const data = uni.getStorageSync(STORAGE_KEYS.articles);
    if (!data) return [];
    let articles: Article[] = JSON.parse(data);
    if (subscriptionId) articles = articles.filter((a) => a.subscriptionId === subscriptionId);
    return articles.sort((a, b) => new Date(b.fetchedAt).getTime() - new Date(a.fetchedAt).getTime()).slice(0, limit);
  } catch { return []; }
}

export function saveArticle(article: Omit<Article, 'id' | 'fetchedAt'>): Article {
  const articles = getArticles();
  const full: Article = { ...article, id: generateId(), fetchedAt: new Date().toISOString() };
  // Keep only latest 200 articles
  const updated = [full, ...articles].slice(0, 200);
  uni.setStorageSync(STORAGE_KEYS.articles, JSON.stringify(updated));
  return full;
}

export function getArticleByLink(link: string): Article | undefined {
  return getArticles().find((a) => a.link === link);
}

// ============ Models ============
export function getModels(): AIModel[] {
  try {
    const data = uni.getStorageSync(STORAGE_KEYS.models);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

export function saveModel(model: Omit<AIModel, 'id' | 'createdAt'>): AIModel {
  const models = getModels();
  const full: AIModel = { ...model, id: generateId(), createdAt: new Date().toISOString() };
  models.push(full);
  uni.setStorageSync(STORAGE_KEYS.models, JSON.stringify(models));
  return full;
}

export function updateModel(model: AIModel): AIModel {
  const models = getModels();
  const idx = models.findIndex((m) => m.id === model.id);
  if (idx !== -1) { models[idx] = model; uni.setStorageSync(STORAGE_KEYS.models, JSON.stringify(models)); }
  return model;
}

export function deleteModel(id: string): void {
  const models = getModels().filter((m) => m.id !== id);
  uni.setStorageSync(STORAGE_KEYS.models, JSON.stringify(models));
}

// ============ Summaries ============
export function getSummaries(articleId?: string): Summary[] {
  try {
    const data = uni.getStorageSync(STORAGE_KEYS.summaries);
    if (!data) return [];
    let summaries: Summary[] = JSON.parse(data);
    if (articleId) summaries = summaries.filter((s) => s.articleId === articleId);
    return summaries;
  } catch { return []; }
}

export function saveSummary(summary: Omit<Summary, 'id' | 'createdAt'>): Summary {
  const summaries = getSummaries();
  const full: Summary = { ...summary, id: generateId(), createdAt: new Date().toISOString() };
  summaries.push(full);
  uni.setStorageSync(STORAGE_KEYS.summaries, JSON.stringify(summaries));
  return full;
}

// ============ Push History ============
export function getPushHistory(limit = 50): PushHistory[] {
  try {
    const data = uni.getStorageSync(STORAGE_KEYS.pushHistory);
    if (!data) return [];
    return JSON.parse(data).sort((a: PushHistory, b: PushHistory) =>
      new Date(b.pushedAt).getTime() - new Date(a.pushedAt).getTime()
    ).slice(0, limit);
  } catch { return []; }
}

export function savePushHistory(record: Omit<PushHistory, 'id'>): PushHistory {
  const history = getPushHistory();
  const full: PushHistory = { ...record, id: generateId() };
  history.unshift(full);
  uni.setStorageSync(STORAGE_KEYS.pushHistory, JSON.stringify(history.slice(0, 100)));
  return full;
}

// ============ Settings ============
const DEFAULT_SETTINGS: AppSettings = {
  push: {
    enabled: true,
    time: '09:00',
    frequency: 'daily',
    contentType: 'title_summary',
    channel: 'notification',
    quietHoursEnabled: false,
    quietHoursStart: '23:00',
    quietHoursEnd: '08:00',
    maxDailyPush: 20,
  },
  email: {
    enabled: false,
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    fromEmail: '',
    fromName: 'AI订阅',
  },
  defaultModelId: '',
  summaryLength: 'medium',
};

export function getSettings(): AppSettings {
  try {
    const data = uni.getStorageSync(STORAGE_KEYS.settings);
    return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
  } catch { return DEFAULT_SETTINGS; }
}

export function saveSettings(settings: AppSettings): void {
  uni.setStorageSync(STORAGE_KEYS.settings, JSON.stringify(settings));
}
