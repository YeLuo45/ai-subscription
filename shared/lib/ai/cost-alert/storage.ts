// IndexedDB storage for cost alerts

import type { CostAlert, AlertNotification, AlertConfig } from './types';

const DB_NAME = 'ai-subscription-cost-alerts';
const STORE_ALERTS = 'alerts';
const STORE_NOTIFICATIONS = 'notifications';
const STORE_CONFIG = 'config';
const DB_VERSION = 1;

let db: IDBDatabase | null = null;

export async function initAlertStorage(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve();
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      
      if (!database.objectStoreNames.contains(STORE_ALERTS)) {
        const alertStore = database.createObjectStore(STORE_ALERTS, { keyPath: 'id' });
        alertStore.createIndex('type', 'type', { unique: false });
        alertStore.createIndex('status', 'status', { unique: false });
      }
      
      if (!database.objectStoreNames.contains(STORE_NOTIFICATIONS)) {
        const notifStore = database.createObjectStore(STORE_NOTIFICATIONS, { keyPath: 'id' });
        notifStore.createIndex('alertId', 'alertId', { unique: false });
        notifStore.createIndex('createdAt', 'createdAt', { unique: false });
        notifStore.createIndex('read', 'read', { unique: false });
      }
      
      if (!database.objectStoreNames.contains(STORE_CONFIG)) {
        database.createObjectStore(STORE_CONFIG, { keyPath: 'id' });
      }
    };
  });
}

async function ensureDB(): Promise<IDBDatabase> {
  if (!db) await initAlertStorage();
  return db!;
}

// ============================================================
// Alert Operations
// ============================================================

export async function saveAlert(alert: CostAlert): Promise<void> {
  const database = await ensureDB();
  
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_ALERTS, 'readwrite');
    const store = tx.objectStore(STORE_ALERTS);
    const request = store.put(alert);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function getAlert(id: string): Promise<CostAlert | undefined> {
  const database = await ensureDB();
  
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_ALERTS, 'readonly');
    const store = tx.objectStore(STORE_ALERTS);
    const request = store.get(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

export async function getAllAlerts(): Promise<CostAlert[]> {
  const database = await ensureDB();
  
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_ALERTS, 'readonly');
    const store = tx.objectStore(STORE_ALERTS);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
}

export async function deleteAlert(id: string): Promise<void> {
  const database = await ensureDB();
  
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_ALERTS, 'readwrite');
    const store = tx.objectStore(STORE_ALERTS);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// ============================================================
// Notification Operations
// ============================================================

export async function saveNotification(notification: AlertNotification): Promise<void> {
  const database = await ensureDB();
  
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NOTIFICATIONS, 'readwrite');
    const store = tx.objectStore(STORE_NOTIFICATIONS);
    const request = store.put(notification);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function getNotifications(limit: number = 50): Promise<AlertNotification[]> {
  const database = await ensureDB();
  
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NOTIFICATIONS, 'readonly');
    const store = tx.objectStore(STORE_NOTIFICATIONS);
    const index = store.index('createdAt');
    const request = index.openCursor(null, 'prev');

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const cursor = request.result;
      const results: AlertNotification[] = [];
      let count = 0;
      
      let current = cursor;
      while (current && count < limit) {
        results.push(current.value);
        count++;
        current = current.continue();
      }
      
      resolve(results);
    };
  });
}

export async function markRead(notificationId: string): Promise<void> {
  const database = await ensureDB();
  
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NOTIFICATIONS, 'readwrite');
    const store = tx.objectStore(STORE_NOTIFICATIONS);
    const getRequest = store.get(notificationId);

    getRequest.onerror = () => reject(getRequest.error);
    getRequest.onsuccess = () => {
      const notification = getRequest.result;
      if (notification) {
        notification.read = true;
        const putRequest = store.put(notification);
        putRequest.onerror = () => reject(putRequest.error);
        putRequest.onsuccess = () => resolve();
      } else {
        resolve();
      }
    };
  });
}

export async function clearNotifications(): Promise<void> {
  const database = await ensureDB();
  
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NOTIFICATIONS, 'readwrite');
    const store = tx.objectStore(STORE_NOTIFICATIONS);
    const request = store.clear();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// ============================================================
// Config Operations
// ============================================================

const DEFAULT_CONFIG: AlertConfig = {
  enableBrowserNotification: true,
  enablePanelNotification: true,
  warningPercent: 80,
  criticalPercent: 95,
};

export async function getConfig(): Promise<AlertConfig> {
  const database = await ensureDB();
  
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_CONFIG, 'readonly');
    const store = tx.objectStore(STORE_CONFIG);
    const request = store.get('default');

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || DEFAULT_CONFIG);
  });
}

export async function saveConfig(config: AlertConfig): Promise<void> {
  const database = await ensureDB();
  
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_CONFIG, 'readwrite');
    const store = tx.objectStore(STORE_CONFIG);
    const request = store.put({ id: 'default', ...config });

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}
