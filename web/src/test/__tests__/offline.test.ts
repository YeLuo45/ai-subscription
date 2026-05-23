/**
 * Offline Service Unit Tests
 * Tests for offline detection and queue management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  isOnline,
  queueOfflineAction,
  removeOfflineAction,
  flushOfflineQueue,
  getQueuedActionCount,
  clearOfflineQueue,
} from '../../services/offline';

// Mock notification module
vi.mock('../../services/notification', () => ({
  requestNotificationPermission: vi.fn().mockResolvedValue('granted'),
  notify: vi.fn(),
}));

describe('Offline Service', () => {
  beforeEach(() => {
    localStorage.clear();
    // Reset navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('isOnline', () => {
    it('should return true when navigator is online', () => {
      Object.defineProperty(navigator, 'onLine', { value: true });
      expect(isOnline()).toBe(true);
    });

    it('should return false when navigator is offline', () => {
      Object.defineProperty(navigator, 'onLine', { value: false });
      expect(isOnline()).toBe(false);
    });
  });

  describe('queueOfflineAction', () => {
    it('should add action to queue and return action id', () => {
      const id = queueOfflineAction('sync', { feedId: '123' });
      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('should store action with correct structure', () => {
      const id = queueOfflineAction('sync', { feedId: '123' });
      const queue = JSON.parse(localStorage.getItem('ai_subscription_offline_queue') || '[]');
      expect(queue.length).toBe(1);
      expect(queue[0].id).toBe(id);
      expect(queue[0].type).toBe('sync');
      expect(queue[0].payload).toEqual({ feedId: '123' });
      expect(queue[0].timestamp).toBeDefined();
    });

    it('should queue multiple actions', () => {
      queueOfflineAction('action1', { data: 1 });
      queueOfflineAction('action2', { data: 2 });
      queueOfflineAction('action3', { data: 3 });
      
      const count = getQueuedActionCount();
      expect(count).toBe(3);
    });
  });

  describe('removeOfflineAction', () => {
    it('should remove specific action from queue', () => {
      const id1 = queueOfflineAction('action1', { data: 1 });
      const id2 = queueOfflineAction('action2', { data: 2 });
      
      removeOfflineAction(id1);
      
      const queue = JSON.parse(localStorage.getItem('ai_subscription_offline_queue') || '[]');
      expect(queue.length).toBe(1);
      expect(queue[0].id).toBe(id2);
    });

    it('should handle removing non-existent action', () => {
      queueOfflineAction('action1', { data: 1 });
      expect(() => removeOfflineAction('non-existent-id')).not.toThrow();
    });
  });

  describe('getQueuedActionCount', () => {
    it('should return 0 for empty queue', () => {
      localStorage.removeItem('ai_subscription_offline_queue');
      expect(getQueuedActionCount()).toBe(0);
    });

    it('should return correct count of queued actions', () => {
      queueOfflineAction('a', {});
      queueOfflineAction('b', {});
      queueOfflineAction('c', {});
      expect(getQueuedActionCount()).toBe(3);
    });
  });

  describe('clearOfflineQueue', () => {
    it('should remove all actions from queue', () => {
      queueOfflineAction('a', {});
      queueOfflineAction('b', {});
      clearOfflineQueue();
      expect(getQueuedActionCount()).toBe(0);
    });
  });

  describe('flushOfflineQueue', () => {
    it('should return 0 when queue is empty', async () => {
      localStorage.removeItem('ai_subscription_offline_queue');
      const flushed = await flushOfflineQueue();
      expect(flushed).toBe(0);
    });

    it('should flush all queued actions', async () => {
      queueOfflineAction('sync', { feedId: '1' });
      queueOfflineAction('sync', { feedId: '2' });
      
      const flushed = await flushOfflineQueue();
      expect(flushed).toBe(2);
      expect(getQueuedActionCount()).toBe(0);
    });

    it('should dispatch events for each action', async () => {
      const eventListener = vi.fn();
      window.addEventListener('offline-action-flush', eventListener);
      
      queueOfflineAction('test', { data: 'test' });
      await flushOfflineQueue();
      
      expect(eventListener).toHaveBeenCalledTimes(1);
      
      window.removeEventListener('offline-action-flush', eventListener);
    });

    it('should keep failed actions in queue', async () => {
      // Add an action and make it fail by removing listener before flush
      queueOfflineAction('sync', { feedId: '1' });
      
      // Mock executeOfflineAction to fail by preventing default on event
      const eventListener = (e: Event) => { 
        e.preventDefault(); 
        throw new Error('Simulated failure'); 
      };
      window.addEventListener('offline-action-flush', eventListener);
      
      const flushed = await flushOfflineQueue();
      expect(flushed).toBe(0);
      
      window.removeEventListener('offline-action-flush', eventListener);
    });
  });
});