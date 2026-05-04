// IndexedDB-based local storage for Web platform
import type { Subscription, SubscriptionGroup, AIModel, Article, Summary, PushHistory, AppSettings, ArticleNote } from '../types';

const DB_NAME = 'AISubscriptionDB';
const DB_VERSION = 2;

const STORES = {
  subscriptions: 'subscriptions',
  models: 'models',
  articles: 'articles',
  summaries: 'summaries',
  pushHistory: 'pushHistory',
  settings: 'settings',
  groups: 'groups',
  notes: 'notes',
} as const;

let dbInstance: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (dbInstance) { resolve(dbInstance); return; }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => { dbInstance = request.result; resolve(request.result); };
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORES.subscriptions)) {
        db.createObjectStore(STORES.subscriptions, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.models)) {
        db.createObjectStore(STORES.models, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.articles)) {
        const store = db.createObjectStore(STORES.articles, { keyPath: 'id' });
        store.createIndex('subscriptionId', 'subscriptionId', { unique: false });
        store.createIndex('fetchedAt', 'fetchedAt', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.summaries)) {
        db.createObjectStore(STORES.summaries, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.pushHistory)) {
        db.createObjectStore(STORES.pushHistory, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.settings)) {
        db.createObjectStore(STORES.settings, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(STORES.groups)) {
        db.createObjectStore(STORES.groups, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.notes)) {
        db.createObjectStore(STORES.notes, { keyPath: 'id' });
      }
    };
  });
}

async function getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
  const db = await openDB();
  const tx = db.transaction(storeName, mode);
  return tx.objectStore(storeName);
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ============ Subscriptions ============
export async function getSubscriptions(): Promise<Subscription[]> {
  const store = await getStore(STORES.subscriptions);
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getSubscription(id: string): Promise<Subscription | undefined> {
  const store = await getStore(STORES.subscriptions);
  return new Promise((resolve, reject) => {
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveSubscription(sub: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>): Promise<Subscription> {
  const store = await getStore(STORES.subscriptions, 'readwrite');
  const now = new Date().toISOString();
  const full: Subscription = { ...sub, id: generateId(), createdAt: now, updatedAt: now };
  return new Promise((resolve, reject) => {
    const req = store.add(full);
    req.onsuccess = () => resolve(full);
    req.onerror = () => reject(req.error);
  });
}

export async function updateSubscription(sub: Subscription): Promise<Subscription> {
  const store = await getStore(STORES.subscriptions, 'readwrite');
  const updated = { ...sub, updatedAt: new Date().toISOString() };
  return new Promise((resolve, reject) => {
    const req = store.put(updated);
    req.onsuccess = () => resolve(updated);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteSubscription(id: string): Promise<void> {
  const store = await getStore(STORES.subscriptions, 'readwrite');
  return new Promise((resolve, reject) => {
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ============ Articles ============
export async function getArticles(subscriptionId?: string, limit = 50): Promise<Article[]> {
  const store = await getStore(STORES.articles);
  return new Promise((resolve, reject) => {
    const req = subscriptionId
      ? store.index('subscriptionId').getAll(subscriptionId)
      : store.getAll();
    req.onsuccess = () => {
      const articles = (req.result as Article[])
        .sort((a, b) => new Date(b.fetchedAt).getTime() - new Date(a.fetchedAt).getTime())
        .slice(0, limit);
      resolve(articles);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function saveArticle(article: Omit<Article, 'id' | 'fetchedAt'>): Promise<Article> {
  const store = await getStore(STORES.articles, 'readwrite');
  const full: Article = { 
    ...article, 
    id: generateId(), 
    fetchedAt: new Date().toISOString(),
    isRead: article.isRead ?? false,
    isStarred: article.isStarred ?? false,
    isReadLater: article.isReadLater ?? false,
  };
  return new Promise((resolve, reject) => {
    const req = store.add(full);
    req.onsuccess = () => resolve(full);
    req.onerror = () => reject(req.error);
  });
}

export async function getArticleByLink(link: string): Promise<Article | undefined> {
  const store = await getStore(STORES.articles);
  return new Promise((resolve, reject) => {
    const req = store.index('link').get(link);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function updateArticle(article: Article): Promise<Article> {
  const store = await getStore(STORES.articles, 'readwrite');
  return new Promise((resolve, reject) => {
    const req = store.put(article);
    req.onsuccess = () => resolve(article);
    req.onerror = () => reject(request.error);
  });
}

export async function getReadLaterArticles(): Promise<Article[]> {
  const store = await getStore(STORES.articles);
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => {
      const articles = (req.result as Article[])
        .filter(a => a.isReadLater)
        .sort((a, b) => {
          const aTime = a.readLaterAt ? new Date(a.readLaterAt).getTime() : 0;
          const bTime = b.readLaterAt ? new Date(b.readLaterAt).getTime() : 0;
          return bTime - aTime;
        });
      resolve(articles);
    };
    req.onerror = () => reject(request.error);
  });
}

// ============ Models ============
export async function getModels(): Promise<AIModel[]> {
  const store = await getStore(STORES.models);
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveModel(model: Omit<AIModel, 'id' | 'createdAt'>): Promise<AIModel> {
  const store = await getStore(STORES.models, 'readwrite');
  const full: AIModel = { ...model, id: generateId(), createdAt: new Date().toISOString() };
  return new Promise((resolve, reject) => {
    const req = store.add(full);
    req.onsuccess = () => resolve(full);
    req.onerror = () => reject(req.error);
  });
}

export async function updateModel(model: AIModel): Promise<AIModel> {
  const store = await getStore(STORES.models, 'readwrite');
  return new Promise((resolve, reject) => {
    const req = store.put(model);
    req.onsuccess = () => resolve(model);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteModel(id: string): Promise<void> {
  const store = await getStore(STORES.models, 'readwrite');
  return new Promise((resolve, reject) => {
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ============ Summaries ============
export async function getSummaries(articleId?: string): Promise<Summary[]> {
  const store = await getStore(STORES.summaries);
  return new Promise((resolve, reject) => {
    const req = articleId
      ? store.index('articleId').getAll(articleId)
      : store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveSummary(summary: Omit<Summary, 'id' | 'createdAt'>): Promise<Summary> {
  const store = await getStore(STORES.summaries, 'readwrite');
  const full: Summary = { 
    ...summary, 
    id: generateId(), 
    createdAt: new Date().toISOString(),
    tags: summary.tags ?? [],
    isStarred: summary.isStarred ?? false,
  };
  return new Promise((resolve, reject) => {
    const req = store.add(full);
    req.onsuccess = () => resolve(full);
    req.onerror = () => reject(req.error);
  });
}

export async function updateSummary(summary: Summary): Promise<Summary> {
  const store = await getStore(STORES.summaries, 'readwrite');
  return new Promise((resolve, reject) => {
    const req = store.put(summary);
    req.onsuccess = () => resolve(summary);
    req.onerror = () => reject(request.error);
  });
}

export async function deleteSummary(id: string): Promise<void> {
  const store = await getStore(STORES.summaries, 'readwrite');
  return new Promise((resolve, reject) => {
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(request.error);
  });
}

// ============ Push History ============
export async function getPushHistory(limit = 50): Promise<PushHistory[]> {
  const store = await getStore(STORES.pushHistory);
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => {
      const history = (req.result as PushHistory[])
        .sort((a, b) => new Date(b.pushedAt).getTime() - new Date(a.pushedAt).getTime())
        .slice(0, limit);
      resolve(history);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function savePushHistory(record: Omit<PushHistory, 'id'>): Promise<PushHistory> {
  const store = await getStore(STORES.pushHistory, 'readwrite');
  const full: PushHistory = { ...record, id: generateId() };
  return new Promise((resolve, reject) => {
    const req = store.add(full);
    req.onsuccess = () => resolve(full);
    req.onerror = () => reject(request.error);
  });
}

// ============ Groups ============
export async function getGroups(): Promise<SubscriptionGroup[]> {
  const store = await getStore(STORES.groups);
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve((req.result as SubscriptionGroup[]).sort((a, b) => a.order - b.order));
    req.onerror = () => reject(request.error);
  });
}

export async function saveGroup(group: Omit<SubscriptionGroup, 'id' | 'createdAt'>): Promise<SubscriptionGroup> {
  const store = await getStore(STORES.groups, 'readwrite');
  const full: SubscriptionGroup = {
    ...group,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };
  return new Promise((resolve, reject) => {
    const req = store.put(full);
    req.onsuccess = () => resolve(full);
    req.onerror = () => reject(request.error);
  });
}

export async function deleteGroup(id: string): Promise<void> {
  const store = await getStore(STORES.groups, 'readwrite');
  // First, update all subscriptions in this group to ungrouped
  const allSubs = await getSubscriptions();
  const subsInGroup = allSubs.filter(s => s.groupId === id);
  for (const sub of subsInGroup) {
    await updateSubscription({ ...sub, groupId: undefined });
  }
  // Then delete the group
  return new Promise((resolve, reject) => {
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(request.error);
  });
}

export async function updateGroup(group: SubscriptionGroup): Promise<SubscriptionGroup> {
  const store = await getStore(STORES.groups, 'readwrite');
  return new Promise((resolve, reject) => {
    const req = store.put(group);
    req.onsuccess = () => resolve(group);
    req.onerror = () => reject(request.error);
  });
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
    fromName: 'AI Subscription',
  },
  defaultModelId: '',
  summaryLength: 'medium',
};

export async function getSettings(): Promise<AppSettings> {
  const store = await getStore(STORES.settings);
  return new Promise((resolve, reject) => {
    const req = store.get('app_settings');
    req.onsuccess = () => resolve(req.result?.value || DEFAULT_SETTINGS);
    req.onerror = () => reject(req.error);
  });
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const store = await getStore(STORES.settings, 'readwrite');
  return new Promise((resolve, reject) => {
    const req = store.put({ key: 'app_settings', value: settings });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ============ Notes ============
export async function getNoteByArticleId(articleId: string): Promise<ArticleNote | null> {
  const store = await getStore(STORES.notes);
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => {
      const notes = req.result as ArticleNote[];
      resolve(notes.find(n => n.articleId === articleId) || null);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function saveNote(note: Omit<ArticleNote, 'id' | 'createdAt' | 'updatedAt'>): Promise<ArticleNote> {
  const store = await getStore(STORES.notes, 'readwrite');
  const now = new Date().toISOString();
  const full: ArticleNote = {
    ...note,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };
  return new Promise((resolve, reject) => {
    const req = store.put(full);
    req.onsuccess = () => resolve(full);
    req.onerror = () => reject(req.error);
  });
}

export async function updateNote(note: ArticleNote): Promise<ArticleNote> {
  const store = await getStore(STORES.notes, 'readwrite');
  const updated = { ...note, updatedAt: new Date().toISOString() };
  return new Promise((resolve, reject) => {
    const req = store.put(updated);
    req.onsuccess = () => resolve(updated);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteNote(id: string): Promise<void> {
  const store = await getStore(STORES.notes, 'readwrite');
  return new Promise((resolve, reject) => {
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
