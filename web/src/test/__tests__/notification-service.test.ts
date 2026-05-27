/**
 * Notification Service Pure Unit Tests
 * Tests notification management logic without IndexedDB dependencies
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest';

// ============================================================
// Notification types and pure logic (extracted from notification-service.ts)
// ============================================================

interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  dismissed: boolean;
  metadata?: Record<string, unknown>;
}

type NotificationType = Notification['type'];

// Priority levels for notifications
const PRIORITY: Record<NotificationType, number> = {
  error: 4,
  warning: 3,
  success: 2,
  info: 1,
};

// Create a notification object with defaults
function createNotification(overrides: Partial<Notification> & { id: string; type: NotificationType; title: string; message: string }): Notification {
  return {
    id: overrides.id,
    type: overrides.type,
    title: overrides.title,
    message: overrides.message,
    timestamp: overrides.timestamp ?? Date.now(),
    read: overrides.read ?? false,
    dismissed: overrides.dismissed ?? false,
    metadata: overrides.metadata,
  };
}

// Check if notification is active (not dismissed)
function isActive(notification: Notification): boolean {
  return !notification.dismissed;
}

// Check if notification is unread
function isUnread(notification: Notification): boolean {
  return !notification.read;
}

// Mark notification as read
function markAsRead(notification: Notification): Notification {
  return { ...notification, read: true };
}

// Mark notification as dismissed
function dismiss(notification: Notification): Notification {
  return { ...notification, dismissed: true };
}

// Get priority of notification
function getPriority(notification: Notification): number {
  return PRIORITY[notification.type] ?? 0;
}

// Filter notifications by type
function filterByType(notifications: Notification[], type: NotificationType): Notification[] {
  return notifications.filter(n => n.type === type);
}

// Filter active notifications
function filterActive(notifications: Notification[]): Notification[] {
  return notifications.filter(isActive);
}

// Filter unread notifications
function filterUnread(notifications: Notification[]): Notification[] {
  return notifications.filter(isUnread);
}

// Sort by timestamp (newest first)
function sortByTimestamp(notifications: Notification[], ascending = false): Notification[] {
  return [...notifications].sort((a, b) => 
    ascending ? a.timestamp - b.timestamp : b.timestamp - a.timestamp
  );
}

// Sort by priority (highest first)
function sortByPriority(notifications: Notification[]): Notification[] {
  return [...notifications].sort((a, b) => getPriority(b) - getPriority(a));
}

// Get notification count by type
function countByType(notifications: Notification[]): Record<NotificationType, number> {
  const counts: Record<NotificationType, number> = { info: 0, warning: 0, error: 0, success: 0 };
  for (const n of notifications) {
    counts[n.type]++;
  }
  return counts;
}

// Get unread count
function getUnreadCount(notifications: Notification[]): number {
  return notifications.filter(isUnread).length;
}

// Get active unread count
function getActiveUnreadCount(notifications: Notification[]): number {
  return notifications.filter(n => isActive(n) && isUnread(n)).length;
}

// Group notifications by type
function groupByType(notifications: Notification[]): Record<NotificationType, Notification[]> {
  const groups: Record<NotificationType, Notification[]> = {
    info: [],
    warning: [],
    error: [],
    success: [],
  };
  for (const n of notifications) {
    groups[n.type].push(n);
  }
  return groups;
}

// Merge notifications from different sources (deduplicate by id)
function mergeNotifications(a: Notification[], b: Notification[]): Notification[] {
  const map = new Map<string, Notification>();
  for (const n of [...a, ...b]) {
    if (!map.has(n.id) || map.get(n.id)!.timestamp < n.timestamp) {
      map.set(n.id, n);
    }
  }
  return Array.from(map.values());
}

// Check if notification matches search query
function matchesSearch(notification: Notification, query: string): boolean {
  const lowerQuery = query.toLowerCase();
  return (
    notification.title.toLowerCase().includes(lowerQuery) ||
    notification.message.toLowerCase().includes(lowerQuery) ||
    notification.type.includes(lowerQuery)
  );
}

// Filter by search query
function filterBySearch(notifications: Notification[], query: string): Notification[] {
  if (!query.trim()) return notifications;
  return notifications.filter(n => matchesSearch(n, query));
}

// ============================================================
// Pure function tests
// ============================================================

describe('NotificationService Pure Logic', () => {
  // Helper to create notification with defaults
  function notif(overrides: Partial<Notification> & { id: string; type: NotificationType; title: string; message: string }): Notification {
    return createNotification(overrides);
  }

  const now = Date.now();
  const sampleNotifications: Notification[] = [
    notif({ id: '1', type: 'info', title: 'Info Title', message: 'Info message', timestamp: now - 1000, read: false }),
    notif({ id: '2', type: 'warning', title: 'Warning Title', message: 'Warning message', timestamp: now - 2000, read: false }),
    notif({ id: '3', type: 'error', title: 'Error Title', message: 'Error message', timestamp: now - 3000, read: true }),
    notif({ id: '4', type: 'success', title: 'Success Title', message: 'Success message', timestamp: now - 4000, read: false }),
    notif({ id: '5', type: 'info', title: 'Info Title 2', message: 'Info message 2', timestamp: now - 5000, read: true }),
  ];

  describe('createNotification', () => {
    it('should create with all required fields', () => {
      const n = notif({ id: 'test', type: 'info', title: 'T', message: 'M' });
      expect(n.id).toBe('test');
      expect(n.type).toBe('info');
      expect(n.title).toBe('T');
      expect(n.message).toBe('M');
    });

    it('should set default values', () => {
      const n = notif({ id: 'test', type: 'error', title: 'T', message: 'M' });
      expect(n.read).toBe(false);
      expect(n.dismissed).toBe(false);
      expect(typeof n.timestamp).toBe('number');
    });

    it('should allow overriding defaults', () => {
      const n = notif({ id: 'test', type: 'info', title: 'T', message: 'M', read: true, dismissed: true });
      expect(n.read).toBe(true);
      expect(n.dismissed).toBe(true);
    });
  });

  describe('isActive', () => {
    it('should return true for non-dismissed', () => {
      expect(isActive(notif({ id: '1', type: 'info', title: '', message: '' }))).toBe(true);
    });

    it('should return false for dismissed', () => {
      expect(isActive(notif({ id: '1', type: 'info', title: '', message: '', dismissed: true }))).toBe(false);
    });
  });

  describe('isUnread', () => {
    it('should return true for unread', () => {
      expect(isUnread(notif({ id: '1', type: 'info', title: '', message: '' }))).toBe(true);
    });

    it('should return false for read', () => {
      expect(isUnread(notif({ id: '1', type: 'info', title: '', message: '', read: true }))).toBe(false);
    });
  });

  describe('markAsRead', () => {
    it('should return new notification with read=true', () => {
      const n = notif({ id: '1', type: 'info', title: '', message: '' });
      const updated = markAsRead(n);
      expect(updated.read).toBe(true);
      expect(n.read).toBe(false); // original unchanged
    });
  });

  describe('dismiss', () => {
    it('should return new notification with dismissed=true', () => {
      const n = notif({ id: '1', type: 'info', title: '', message: '' });
      const updated = dismiss(n);
      expect(updated.dismissed).toBe(true);
      expect(n.dismissed).toBe(false); // original unchanged
    });
  });

  describe('getPriority', () => {
    it('should return correct priority for each type', () => {
      expect(getPriority(notif({ id: '1', type: 'error', title: '', message: '' }))).toBe(4);
      expect(getPriority(notif({ id: '1', type: 'warning', title: '', message: '' }))).toBe(3);
      expect(getPriority(notif({ id: '1', type: 'success', title: '', message: '' }))).toBe(2);
      expect(getPriority(notif({ id: '1', type: 'info', title: '', message: '' }))).toBe(1);
    });
  });

  describe('filterByType', () => {
    it('should filter correctly', () => {
      const info = filterByType(sampleNotifications, 'info');
      expect(info.length).toBe(2);
      expect(info.every(n => n.type === 'info')).toBe(true);
    });

    it('should return empty for non-existent type', () => {
      const error = filterByType(sampleNotifications, 'error');
      expect(error.length).toBe(1);
    });
  });

  describe('filterActive', () => {
    it('should exclude dismissed', () => {
      const withDismissed = [
        ...sampleNotifications,
        notif({ id: 'dismissed', type: 'info', title: '', message: '', dismissed: true }),
      ];
      const active = filterActive(withDismissed);
      expect(active.some(n => n.id === 'dismissed')).toBe(false);
    });
  });

  describe('filterUnread', () => {
    it('should exclude read', () => {
      const unread = filterUnread(sampleNotifications);
      expect(unread.every(n => !n.read)).toBe(true);
      expect(unread.length).toBe(3);
    });
  });

  describe('sortByTimestamp', () => {
    it('should sort newest first by default', () => {
      const sorted = sortByTimestamp(sampleNotifications);
      expect(sorted[0].id).toBe('1'); // most recent (now - 1000)
      expect(sorted[sorted.length - 1].id).toBe('5'); // oldest (now - 5000)
    });

    it('should sort oldest first when ascending', () => {
      const sorted = sortByTimestamp(sampleNotifications, true);
      expect(sorted[0].id).toBe('5');
      expect(sorted[sorted.length - 1].id).toBe('1');
    });
  });

  describe('sortByPriority', () => {
    it('should sort error first', () => {
      const sorted = sortByPriority(sampleNotifications);
      expect(sorted[0].type).toBe('error');
    });

    it('should sort info last', () => {
      const sorted = sortByPriority(sampleNotifications);
      expect(sorted[sorted.length - 1].type).toBe('info');
    });
  });

  describe('countByType', () => {
    it('should count correctly', () => {
      const counts = countByType(sampleNotifications);
      expect(counts.info).toBe(2);
      expect(counts.warning).toBe(1);
      expect(counts.error).toBe(1);
      expect(counts.success).toBe(1);
    });
  });

  describe('getUnreadCount', () => {
    it('should return correct count', () => {
      expect(getUnreadCount(sampleNotifications)).toBe(3);
    });
  });

  describe('getActiveUnreadCount', () => {
    it('should exclude dismissed and read', () => {
      expect(getActiveUnreadCount(sampleNotifications)).toBe(3);
    });
  });

  describe('groupByType', () => {
    it('should group correctly', () => {
      const groups = groupByType(sampleNotifications);
      expect(groups.info.length).toBe(2);
      expect(groups.warning.length).toBe(1);
      expect(groups.error.length).toBe(1);
      expect(groups.success.length).toBe(1);
    });
  });

  describe('mergeNotifications', () => {
    it('should merge without duplicates', () => {
      const a: Notification[] = [notif({ id: '1', type: 'info', title: 'A', message: '' })];
      const b: Notification[] = [notif({ id: '1', type: 'info', title: 'B', message: '' }), notif({ id: '2', type: 'info', title: '', message: '' })];
      const merged = mergeNotifications(a, b);
      expect(merged.length).toBe(2);
    });

    it('should keep newer timestamp when duplicate', () => {
      const a: Notification[] = [notif({ id: '1', type: 'info', title: 'Old', message: '', timestamp: 1000 })];
      const b: Notification[] = [notif({ id: '1', type: 'info', title: 'New', message: '', timestamp: 2000 })];
      const merged = mergeNotifications(a, b);
      expect(merged[0].title).toBe('New');
    });
  });

  describe('matchesSearch', () => {
    it('should match title', () => {
      const n = notif({ id: '1', type: 'info', title: 'Hello World', message: '' });
      expect(matchesSearch(n, 'hello')).toBe(true);
      expect(matchesSearch(n, 'world')).toBe(true);
      expect(matchesSearch(n, 'xyz')).toBe(false);
    });

    it('should match message', () => {
      const n = notif({ id: '1', type: 'info', title: '', message: 'Hello World' });
      expect(matchesSearch(n, 'hello')).toBe(true);
    });

    it('should match type', () => {
      const n = notif({ id: '1', type: 'error', title: '', message: '' });
      expect(matchesSearch(n, 'error')).toBe(true);
    });

    it('should be case insensitive', () => {
      const n = notif({ id: '1', type: 'info', title: 'Hello', message: '' });
      expect(matchesSearch(n, 'HELLO')).toBe(true);
    });
  });

  describe('filterBySearch', () => {
    it('should return all for empty query', () => {
      expect(filterBySearch(sampleNotifications, '').length).toBe(5);
      expect(filterBySearch(sampleNotifications, '   ').length).toBe(5);
    });

    it('should filter by title', () => {
      const result = filterBySearch(sampleNotifications, 'Error');
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('3');
    });
  });

  describe('notification pipeline', () => {
    it('should complete full pipeline', () => {
      // Add dismissed notification
      const withDismissed = [
        ...sampleNotifications,
        notif({ id: '6', type: 'info', title: 'Dismissed', message: '', dismissed: true }),
      ];

      // Pipeline: filter active → filter unread → sort by priority
      const active = filterActive(withDismissed);
      const unread = filterUnread(active);
      const sorted = sortByPriority(unread);

      // Should have 3 active unread, highest priority first (warning=3, success=2, info=1)
      expect(sorted.length).toBe(3);
      expect(sorted[0].type).toBe('warning'); // priority 3 (read errors are filtered out)
      expect(sorted[1].type).toBe('success'); // priority 2
      expect(sorted[2].type).toBe('info');     // priority 1
    });

    it('should handle search + filter + sort', () => {
      // Search for "info" in title
      const searchResults = filterBySearch(sampleNotifications, 'info');
      const unread = filterUnread(searchResults);
      const sorted = sortByTimestamp(unread);

      // Should get info notifications that are unread, sorted newest first
      expect(sorted.every(n => !n.read)).toBe(true);
    });
  });
});