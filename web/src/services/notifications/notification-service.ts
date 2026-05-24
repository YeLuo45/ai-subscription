/**
 * NotificationService - IndexedDB-based notification storage
 * Zero new dependencies - uses only built-in Web APIs
 */

export type NotificationType = 'article_update' | 'subscription' | 'system';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  timestamp: number;
  read: boolean;
}

const DB_NAME = 'notifications';
const DB_VERSION = 1;
const STORE_NAME = 'notifications';

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
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('read', 'read', { unique: false });
        store.createIndex('type', 'type', { unique: false });
      }
    };
  });
}

function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function generateId(): string {
  return `notif_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * NotificationService - manages notification storage in IndexedDB
 */
export class NotificationService {
  private dbReady: Promise<void>;

  constructor() {
    this.dbReady = openDB().then(() => {});
  }

  private async ensureDB(): Promise<IDBDatabase> {
    await this.dbReady;
    return openDB();
  }

  /**
   * Create a new notification
   */
  async createNotification(
    type: NotificationType,
    title: string,
    body: string
  ): Promise<Notification> {
    const notification: Notification = {
      id: generateId(),
      type,
      title,
      body,
      timestamp: Date.now(),
      read: false,
    };

    const db = await this.ensureDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    await promisifyRequest(store.put(notification));

    return notification;
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(id: string): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const notification = await promisifyRequest<Notification | undefined>(
      store.get(id)
    );
    if (notification) {
      notification.read = true;
      await promisifyRequest(store.put(notification));
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const all = await promisifyRequest<Notification[]>(store.getAll());
    for (const notification of all) {
      if (!notification.read) {
        notification.read = true;
        await promisifyRequest(store.put(notification));
      }
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<number> {
    const db = await this.ensureDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const all = await promisifyRequest<Notification[]>(store.getAll());
    return all.filter(n => !n.read).length;
  }

  /**
   * Get all notifications, optionally limited
   */
  async getNotifications(limit?: number): Promise<Notification[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('timestamp');
    const all = await promisifyRequest<Notification[]>(index.getAll());
    
    // Sort descending by timestamp (newest first)
    const sorted = all.sort((a, b) => b.timestamp - a.timestamp);
    
    if (limit !== undefined && limit > 0) {
      return sorted.slice(0, limit);
    }
    return sorted;
  }

  /**
   * Delete a notification by id
   */
  async deleteNotification(id: string): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    await promisifyRequest(store.delete(id));
  }

  /**
   * Delete all notifications
   */
  async clearAll(): Promise<void> {
    const db = await this.ensureDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    await promisifyRequest(store.clear());
  }

  /**
   * Get a single notification by id
   */
  async getById(id: string): Promise<Notification | undefined> {
    const db = await this.ensureDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    return promisifyRequest<Notification | undefined>(store.get(id));
  }

  /**
   * Get notifications by type
   */
  async getByType(type: NotificationType): Promise<Notification[]> {
    const db = await this.ensureDB();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('type');
    return promisifyRequest<Notification[]>(index.getAll(type));
  }
}

// Singleton instance
let serviceInstance: NotificationService | null = null;

export function getNotificationService(): NotificationService {
  if (!serviceInstance) {
    serviceInstance = new NotificationService();
  }
  return serviceInstance;
}