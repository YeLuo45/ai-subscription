/**
 * Email Subscription IndexedDB Layer
 * Tables: subscribers, email_templates, email_history
 */

import type { Subscriber, EmailTemplate, EmailHistory } from '../types/emailSubscription';

const DB_NAME = 'ai-subscription';
const DB_VERSION = 2; // Incremented for new stores

let dbInstance: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // subscribers table
      if (!db.objectStoreNames.contains('subscribers')) {
        const subStore = db.createObjectStore('subscribers', { keyPath: 'id' });
        subStore.createIndex('email', 'email', { unique: true });
        subStore.createIndex('status', 'status', { unique: false });
        subStore.createIndex('subscriptionType', 'subscriptionType', { unique: false });
      }

      // email_templates table
      if (!db.objectStoreNames.contains('email_templates')) {
        const tmplStore = db.createObjectStore('email_templates', { keyPath: 'id' });
        tmplStore.createIndex('type', 'type', { unique: false });
      }

      // email_history table
      if (!db.objectStoreNames.contains('email_history')) {
        const histStore = db.createObjectStore('email_history', { keyPath: 'id' });
        histStore.createIndex('status', 'status', { unique: false });
        histStore.createIndex('sentAt', 'sentAt', { unique: false });
        histStore.createIndex('to', 'to', { unique: false });
      }
    };
  });
}

function tx(storeNames: string | string[], mode: IDBTransactionMode = 'readonly') {
  return openDB().then(db => {
    const names = Array.isArray(storeNames) ? storeNames : [storeNames];
    const transaction = db.transaction(names, mode);
    const stores = names.map(name => ({ name, store: transaction.objectStore(name) }));
    return { transaction, stores: names.length === 1 ? stores[0].store : stores };
  });
}

function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ============================================================
// Subscribers Operations
// ============================================================

export async function getAllSubscribers(): Promise<Subscriber[]> {
  const { store } = await tx('subscribers');
  return promisifyRequest(store.getAll());
}

export async function getActiveSubscribers(): Promise<Subscriber[]> {
  const { store } = await tx('subscribers');
  const index = store.index('status');
  return promisifyRequest(index.getAll('active'));
}

export async function getSubscriberById(id: string): Promise<Subscriber | undefined> {
  const { store } = await tx('subscribers');
  return promisifyRequest(store.get(id));
}

export async function getSubscriberByEmail(email: string): Promise<Subscriber | undefined> {
  const { store } = await tx('subscribers');
  const index = store.index('email');
  return promisifyRequest(index.get(email));
}

export async function getSubscribersByType(type: string): Promise<Subscriber[]> {
  const { store } = await tx('subscribers');
  const index = store.index('subscriptionType');
  return promisifyRequest(index.getAll(type));
}

export async function saveSubscriber(subscriber: Subscriber): Promise<void> {
  const { store } = await tx('subscribers', 'readwrite');
  await promisifyRequest(store.put(subscriber));
}

export async function deleteSubscriber(id: string): Promise<void> {
  const { store } = await tx('subscribers', 'readwrite');
  await promisifyRequest(store.delete(id));
}

export async function updateSubscriberStatus(id: string, status: Subscriber['status']): Promise<void> {
  const subscriber = await getSubscriberById(id);
  if (subscriber) {
    subscriber.status = status;
    subscriber.updatedAt = Date.now();
    await saveSubscriber(subscriber);
  }
}

export async function getSubscribersByTags(tags: string[]): Promise<Subscriber[]> {
  const allSubscribers = await getAllSubscribers();
  return allSubscribers.filter(sub => 
    sub.status === 'active' && 
    sub.customTags?.some(tag => tags.includes(tag))
  );
}

// ============================================================
// Email Templates Operations
// ============================================================

export async function getAllTemplates(): Promise<EmailTemplate[]> {
  const { store } = await tx('email_templates');
  return promisifyRequest(store.getAll());
}

export async function getTemplateById(id: string): Promise<EmailTemplate | undefined> {
  const { store } = await tx('email_templates');
  return promisifyRequest(store.get(id));
}

export async function getTemplateByType(type: 'daily' | 'weekly'): Promise<EmailTemplate | undefined> {
  const { store } = await tx('email_templates');
  const index = store.index('type');
  const results = await promisifyRequest(index.getAll(type));
  return results[0];
}

export async function saveTemplate(template: EmailTemplate): Promise<void> {
  const { store } = await tx('email_templates', 'readwrite');
  await promisifyRequest(store.put(template));
}

export async function deleteTemplate(id: string): Promise<void> {
  const { store } = await tx('email_templates', 'readwrite');
  await promisifyRequest(store.delete(id));
}

export async function initDefaultTemplates(): Promise<void> {
  const existing = await getAllTemplates();
  if (existing.length === 0) {
    const now = Date.now();
    const { DEFAULT_DAILY_TEMPLATE, DEFAULT_WEEKLY_TEMPLATE } = await import('../types/emailSubscription');
    
    await saveTemplate({
      ...DEFAULT_DAILY_TEMPLATE,
      id: `tmpl_daily_${now}`,
      createdAt: now,
      updatedAt: now,
    });
    await saveTemplate({
      ...DEFAULT_WEEKLY_TEMPLATE,
      id: `tmpl_weekly_${now}`,
      createdAt: now,
      updatedAt: now,
    });
  }
}

// ============================================================
// Email History Operations
// ============================================================

export async function getAllEmailHistory(): Promise<EmailHistory[]> {
  const { store } = await tx('email_history');
  const results = await promisifyRequest(store.getAll());
  return results.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getEmailHistoryById(id: string): Promise<EmailHistory | undefined> {
  const { store } = await tx('email_history');
  return promisifyRequest(store.get(id));
}

export async function getFailedEmails(): Promise<EmailHistory[]> {
  const { store } = await tx('email_history');
  const index = store.index('status');
  return promisifyRequest(index.getAll('failed'));
}

export async function saveEmailHistory(history: EmailHistory): Promise<void> {
  const { store } = await tx('email_history', 'readwrite');
  await promisifyRequest(store.put(history));
}

export async function updateEmailHistoryStatus(
  id: string, 
  status: EmailHistory['status'],
  errorMessage?: string
): Promise<void> {
  const history = await getEmailHistoryById(id);
  if (history) {
    history.status = status;
    if (status === 'sent') {
      history.sentAt = Date.now();
    }
    if (errorMessage) {
      history.errorMessage = errorMessage;
      history.retryCount += 1;
    }
    await saveEmailHistory(history);
  }
}

export async function deleteEmailHistory(id: string): Promise<void> {
  const { store } = await tx('email_history', 'readwrite');
  await promisifyRequest(store.delete(id));
}

export async function clearOldEmailHistory(daysToKeep: number = 30): Promise<void> {
  const cutoff = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;
  const allHistory = await getAllEmailHistory();
  const { store } = await tx('email_history', 'readwrite');
  
  for (const history of allHistory) {
    if (history.createdAt < cutoff && history.status !== 'sending') {
      store.delete(history.id);
    }
  }
}
