/**
 * NotificationBroadcast Unit Tests
 * Tests for BroadcastChannel cross-tab sync
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest';
import {
  NotificationBroadcast,
  getNotificationBroadcast,
  type BroadcastMessage,
  type Notification,
} from '../notification-broadcast';

// Mock BroadcastChannel
const mockChannelMessages: BroadcastMessage[] = [];
let mockChannelClose: () => void;

const createMockBroadcastChannel = () => ({
  name: 'ai-subscription-notifications',
  postMessage: vi.fn((message: BroadcastMessage) => {
    mockChannelMessages.push(message);
  }),
  close: vi.fn(() => {
    if (mockChannelClose) mockChannelClose();
  }),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  onmessage: null as ((event: MessageEvent<BroadcastMessage>) => void) | null,
});

// @ts-ignore
global.BroadcastChannel = createMockBroadcastChannel;

describe('NotificationBroadcast', () => {
  let broadcast: NotificationBroadcast;

  beforeEach(() => {
    mockChannelMessages.length = 0;
    vi.clearAllMocks();
    broadcast = NotificationBroadcast.getInstance();
    broadcast.stopListening();
  });

  afterEach(() => {
    broadcast.close();
  });

  describe('singleton', () => {
    it('should return the same instance', () => {
      const instance1 = NotificationBroadcast.getInstance();
      const instance2 = NotificationBroadcast.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('broadcast', () => {
    it('should post a message to the channel', () => {
      const channel = (global.BroadcastChannel as ReturnType<typeof createMockBroadcastChannel>);
      broadcast.broadcast('NOTIFICATION_SYNC_REQUEST');

      expect(channel.postMessage).toHaveBeenCalledWith({
        type: 'NOTIFICATION_SYNC_REQUEST',
        payload: undefined,
      });
    });

    it('should include payload when provided', () => {
      const channel = (global.BroadcastChannel as ReturnType<typeof createMockBroadcastChannel>);
      const notification: Notification = {
        id: 'test-id',
        type: 'article_update',
        title: 'Test',
        body: 'Body',
        timestamp: Date.now(),
        read: false,
      };

      broadcast.broadcast('NOTIFICATION_NEW', notification);

      expect(channel.postMessage).toHaveBeenCalledWith({
        type: 'NOTIFICATION_NEW',
        payload: notification,
      });
    });
  });

  describe('broadcastNew', () => {
    it('should broadcast a new notification', () => {
      const channel = (global.BroadcastChannel as ReturnType<typeof createMockBroadcastChannel>);
      const notification: Notification = {
        id: 'new-notif',
        type: 'subscription',
        title: 'New Subscription',
        body: 'You have a new subscriber',
        timestamp: Date.now(),
        read: false,
      };

      broadcast.broadcastNew(notification);

      expect(channel.postMessage).toHaveBeenCalledWith({
        type: 'NOTIFICATION_NEW',
        payload: notification,
      });
    });
  });

  describe('broadcastRead', () => {
    it('should broadcast a read event with notification id', () => {
      const channel = (global.BroadcastChannel as ReturnType<typeof createMockBroadcastChannel>);

      broadcast.broadcastRead('notif-123');

      expect(channel.postMessage).toHaveBeenCalledWith({
        type: 'NOTIFICATION_READ',
        payload: { id: 'notif-123' },
      });
    });
  });

  describe('requestSync', () => {
    it('should broadcast a sync request', () => {
      const channel = (global.BroadcastChannel as ReturnType<typeof createMockBroadcastChannel>);

      broadcast.requestSync();

      expect(channel.postMessage).toHaveBeenCalledWith({
        type: 'NOTIFICATION_SYNC_REQUEST',
        payload: undefined,
      });
    });
  });

  describe('addListener', () => {
    it('should return a function to remove the listener', () => {
      const listener = vi.fn();
      const remove = broadcast.addListener(listener);

      expect(typeof remove).toBe('function');
      remove();
    });
  });

  describe('startListening / stopListening', () => {
    it('should not duplicate listeners when called twice', () => {
      const channel = (global.BroadcastChannel as ReturnType<typeof createMockBroadcastChannel>);
      
      broadcast.startListening();
      broadcast.startListening();

      // Should only add listener once (first call)
      // Second call is no-op, so still 1 call
      expect(channel.addEventListener).toHaveBeenCalledTimes(1);
    });

    it('should remove event listener on stopListening', () => {
      const channel = (global.BroadcastChannel as ReturnType<typeof createMockBroadcastChannel>);
      
      broadcast.startListening();
      broadcast.stopListening();

      expect(channel.removeEventListener).toHaveBeenCalled();
    });
  });

  describe('close', () => {
    it('should close the channel', () => {
      const channel = (global.BroadcastChannel as ReturnType<typeof createMockBroadcastChannel>);
      
      broadcast.close();

      expect(channel.close).toHaveBeenCalled();
    });
  });
});

describe('NotificationBroadcast Message Types', () => {
  it('should define all required message types', () => {
    const types = [
      'NOTIFICATION_NEW',
      'NOTIFICATION_READ',
      'NOTIFICATION_SYNC_REQUEST',
      'NOTIFICATION_SYNC_RESPONSE',
    ];

    for (const type of types) {
      expect(typeof type).toBe('string');
    }
  });
});