/**
 * NotificationService Unit Tests
 * Tests for IndexedDB notification storage
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NotificationService, getNotificationService, type Notification, type NotificationType } from '../notification-service';

// Simple mock for IDB request
function createMockRequest(result: unknown) {
  return {
    onsuccess: null as ((() => void) | null),
    onerror: null as ((() => void) | null),
    result,
  };
}

// In-memory store for mocking IndexedDB
const memoryStore: Record<string, Record<string, Notification>> = {};

function createMockDB() {
  return {
    objectStoreNames: {
      contains: (name: string) => memoryStore[name] !== undefined,
    },
    createObjectStore: (name: string) => {
      memoryStore[name] = {};
      return {
        createIndex: vi.fn(),
        put: (notification: Notification) => {
          memoryStore[name][notification.id] = notification;
          return createMockRequest(notification);
        },
        get: (id: string) => createMockRequest(memoryStore[name]?.[id]),
        getAll: () => createMockRequest(Object.values(memoryStore[name])),
        delete: (id: string) => {
          delete memoryStore[name][id];
          return createMockRequest(undefined);
        },
        clear: () => {
          memoryStore[name] = {};
          return createMockRequest(undefined);
        },
      };
    },
    transaction: (_name: string) => ({
      objectStore: (storeName: string) => ({
        createIndex: vi.fn(),
        put: (notification: Notification) => {
          memoryStore[storeName] = memoryStore[storeName] || {};
          memoryStore[storeName][notification.id] = notification;
          return createMockRequest(notification);
        },
        get: (id: string) => createMockRequest(memoryStore[storeName]?.[id]),
        getAll: () => createMockRequest(Object.values(memoryStore[storeName] || {})),
        delete: (id: string) => {
          delete (memoryStore[storeName] || {})[id];
          return createMockRequest(undefined);
        },
        clear: () => {
          memoryStore[storeName] = {};
          return createMockRequest(undefined);
        },
      }),
    }),
  };
}

// Mock indexedDB
const mockDB = createMockDB();
const mockOpen = vi.fn(() => {
  const req = createMockRequest(mockDB);
  req.onupgradeneeded = null;
  req.onblocked = null;
  return req;
});

// @ts-ignore - global mock
global.indexedDB = {
  open: mockOpen,
};

describe('NotificationService', () => {
  beforeEach(() => {
    // Clear memory store
    Object.keys(memoryStore).forEach(k => delete memoryStore[k]);
    mockOpen.mockClear();
  });

  describe('createNotification', () => {
    it('should create a notification with all required fields', async () => {
      const service = new NotificationService();
      const notification = await service.createNotification(
        'article_update',
        'Test Title',
        'Test Body'
      );

      expect(notification.id).toBeDefined();
      expect(notification.id.startsWith('notif_')).toBe(true);
      expect(notification.type).toBe('article_update');
      expect(notification.title).toBe('Test Title');
      expect(notification.body).toBe('Test Body');
      expect(notification.read).toBe(false);
      expect(notification.timestamp).toBeGreaterThan(0);
    });

    it('should create notifications with different types', async () => {
      const service = new NotificationService();
      const types: NotificationType[] = ['article_update', 'subscription', 'system'];

      for (const type of types) {
        const notification = await service.createNotification(type, 'Title', 'Body');
        expect(notification.type).toBe(type);
      }
    });

    it('should generate unique ids for each notification', async () => {
      const service = new NotificationService();
      const n1 = await service.createNotification('system', 'Title', 'Body');
      const n2 = await service.createNotification('system', 'Title', 'Body');

      expect(n1.id).not.toBe(n2.id);
    });
  });

  describe('markAsRead', () => {
    it('should mark an existing notification as read', async () => {
      const service = new NotificationService();
      const notification = await service.createNotification('system', 'Title', 'Body');
      expect(notification.read).toBe(false);

      await service.markAsRead(notification.id);

      const retrieved = await service.getById(notification.id);
      expect(retrieved?.read).toBe(true);
    });

    it('should not throw for non-existent notification id', async () => {
      const service = new NotificationService();
      await expect(service.markAsRead('non-existent-id')).resolves.not.toThrow();
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read', async () => {
      const service = new NotificationService();
      await service.createNotification('system', 'Title 1', 'Body');
      await service.createNotification('system', 'Title 2', 'Body');
      await service.createNotification('system', 'Title 3', 'Body');

      await service.markAllAsRead();

      const all = await service.getNotifications();
      expect(all.every(n => n.read)).toBe(true);
    });

    it('should handle empty notification list', async () => {
      const service = new NotificationService();
      await expect(service.markAllAsRead()).resolves.not.toThrow();
    });
  });

  describe('getUnreadCount', () => {
    it('should return 0 when no notifications exist', async () => {
      const service = new NotificationService();
      const count = await service.getUnreadCount();
      expect(count).toBe(0);
    });

    it('should return correct count of unread notifications', async () => {
      const service = new NotificationService();
      await service.createNotification('system', 'Title 1', 'Body');
      await service.createNotification('system', 'Title 2', 'Body');
      await service.createNotification('system', 'Title 3', 'Body');

      // Mark one as read
      const all = await service.getNotifications();
      await service.markAsRead(all[0].id);

      const count = await service.getUnreadCount();
      expect(count).toBe(2);
    });
  });

  describe('getNotifications', () => {
    it('should return all notifications sorted by timestamp descending', async () => {
      const service = new NotificationService();
      const n1 = await service.createNotification('article_update', 'First', 'Body');
      await new Promise(r => setTimeout(r, 10));
      const n2 = await service.createNotification('subscription', 'Second', 'Body');
      await new Promise(r => setTimeout(r, 10));
      const n3 = await service.createNotification('system', 'Third', 'Body');

      const notifications = await service.getNotifications();

      expect(notifications.length).toBe(3);
      expect(notifications[0].id).toBe(n3.id);
      expect(notifications[1].id).toBe(n2.id);
      expect(notifications[2].id).toBe(n1.id);
    });

    it('should limit results when limit parameter is provided', async () => {
      const service = new NotificationService();
      await service.createNotification('system', 'Title 1', 'Body');
      await service.createNotification('system', 'Title 2', 'Body');
      await service.createNotification('system', 'Title 3', 'Body');

      const notifications = await service.getNotifications(2);

      expect(notifications.length).toBe(2);
    });

    it('should return empty array when no notifications', async () => {
      const service = new NotificationService();
      const notifications = await service.getNotifications();
      expect(notifications).toEqual([]);
    });
  });

  describe('deleteNotification', () => {
    it('should delete an existing notification', async () => {
      const service = new NotificationService();
      const notification = await service.createNotification('system', 'Title', 'Body');
      
      await service.deleteNotification(notification.id);

      const retrieved = await service.getById(notification.id);
      expect(retrieved).toBeUndefined();
    });

    it('should not throw when deleting non-existent notification', async () => {
      const service = new NotificationService();
      await expect(service.deleteNotification('non-existent')).resolves.not.toThrow();
    });
  });

  describe('getById', () => {
    it('should return notification when it exists', async () => {
      const service = new NotificationService();
      const created = await service.createNotification('article_update', 'Title', 'Body');
      
      const retrieved = await service.getById(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.title).toBe('Title');
    });

    it('should return undefined when notification does not exist', async () => {
      const service = new NotificationService();
      const retrieved = await service.getById('non-existent-id');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('getByType', () => {
    it('should return only notifications of the specified type', async () => {
      const service = new NotificationService();
      await service.createNotification('article_update', 'Article', 'Body');
      await service.createNotification('subscription', 'Sub', 'Body');
      await service.createNotification('article_update', 'Article 2', 'Body');

      const articleNotifications = await service.getByType('article_update');

      expect(articleNotifications.length).toBe(2);
      expect(articleNotifications.every(n => n.type === 'article_update')).toBe(true);
    });
  });

  describe('clearAll', () => {
    it('should delete all notifications', async () => {
      const service = new NotificationService();
      await service.createNotification('system', 'Title 1', 'Body');
      await service.createNotification('system', 'Title 2', 'Body');

      await service.clearAll();

      const notifications = await service.getNotifications();
      expect(notifications).toEqual([]);
    });
  });

  describe('singleton', () => {
    it('should return the same instance', () => {
      const instance1 = getNotificationService();
      const instance2 = getNotificationService();
      expect(instance1).toBe(instance2);
    });
  });
});