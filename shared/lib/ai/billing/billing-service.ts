// Billing service - manages billing history records
import type { BillingHistoryEntry, UsageRecord, CurrentSubscription } from './types';
import { getCurrentSubscription, getCurrentUsage } from './quota-tracker';
import { getPlan } from './plans';
import type { CostRecord } from '../cost-tracker/types';

const DB_NAME = 'ai-subscription-billing';
const STORE_NAME = 'billing-history';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('periodStart', 'periodStart', { unique: true });
      }
    };
  });
}

export async function getBillingHistory(limit = 12): Promise<BillingHistoryEntry[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => {
      const results = (request.result as BillingHistoryEntry[])
        .sort((a, b) => b.periodStart - a.periodStart)
        .slice(0, limit);
      resolve(results);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getBillingRecordForPeriod(periodStart: number): Promise<BillingHistoryEntry | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('periodStart');
    const request = index.get(periodStart);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function createOrUpdateBillingRecord(periodStart: number): Promise<BillingHistoryEntry> {
  const { getRecordsByTimeRange } = await import('../cost-tracker/storage');
  
  const periodEnd = new Date(periodStart).setMonth(new Date(periodStart).getMonth() + 1);
  const records: CostRecord[] = await getRecordsByTimeRange(periodStart, periodEnd);
  
  const totalTokens = records.reduce((sum, r) => sum + r.inputTokens + r.outputTokens, 0);
  const totalCostUSD = records.reduce((sum, r) => sum + r.costUSD, 0);
  const requestCount = records.length;
  
  const subscription = await getCurrentSubscription();
  const plan = getPlan(subscription.plan);
  
  const usage: UsageRecord = {
    periodStart,
    periodEnd,
    totalTokens,
    totalCostUSD,
    requestCount,
    overageCount: 0,
  };
  
  const entry: BillingHistoryEntry = {
    id: `billing-${periodStart}`,
    periodStart,
    periodEnd,
    plan: subscription.plan,
    usage,
    status: plan.id === 'free' ? 'free' : 'pending',
    createdAt: Date.now(),
  };
  
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(entry);
    tx.oncomplete = () => resolve(entry);
    tx.onerror = () => reject(tx.error);
  });
}

export async function updateBillingRecordStatus(id: string, status: BillingHistoryEntry['status']): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const entry = getReq.result as BillingHistoryEntry;
      if (entry) {
        entry.status = status;
        store.put(entry);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

export async function getBillingService() {
  return {
    getBillingHistory,
    getBillingRecordForPeriod,
    createOrUpdateBillingRecord,
    updateBillingRecordStatus,
    getCurrentSubscription: () => getCurrentSubscription(),
    getCurrentUsage: () => getCurrentUsage(),
  };
}
