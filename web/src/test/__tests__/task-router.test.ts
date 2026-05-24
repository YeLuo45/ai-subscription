/**
 * TaskRouter Tests
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TaskRouter } from '../../../../shared/lib/task-router/router.js';
import { TaskPriority } from '../../../../shared/lib/task-router/types.js';

describe('TaskRouter', () => {
  let router: TaskRouter;

  beforeEach(() => {
    // Get fresh instance for each test
    router = TaskRouter.getInstance();
    router.clear();
  });

  afterEach(() => {
    router.clear();
  });

  // ─────────────────────────────────────────────
  // 1. Singleton pattern
  // ─────────────────────────────────────────────
  it('should return the same instance via getInstance()', () => {
    const a = TaskRouter.getInstance();
    const b = TaskRouter.getInstance();
    expect(a).toBe(b);
  });

  // ─────────────────────────────────────────────
  // 2. Basic enqueue/dequeue
  // ─────────────────────────────────────────────
  it('should enqueue a task and return a taskId', () => {
    const taskId = router.enqueue({
      priority: TaskPriority.NORMAL,
      operation: 'sync_subscriptions',
      payload: { userId: 1 },
      maxRetries: 3,
    });
    expect(taskId).toBeTruthy();
    expect(typeof taskId).toBe('string');
    expect(taskId.length).toBeGreaterThan(0);
  });

  it('should dequeue the enqueued task', () => {
    const taskId = router.enqueue({
      priority: TaskPriority.NORMAL,
      operation: 'sync_subscriptions',
      payload: { userId: 1 },
      maxRetries: 3,
    });
    const dequeued = router.dequeue();
    expect(dequeued).not.toBeNull();
    expect(dequeued!.id).toBe(taskId);
  });

  // ─────────────────────────────────────────────
  // 3. Priority ordering
  // ─────────────────────────────────────────────
  it('should dequeue CRITICAL before HIGH priority tasks', () => {
    router.enqueue({ priority: TaskPriority.LOW, operation: 'log_activity', payload: {}, maxRetries: 1 });
    router.enqueue({ priority: TaskPriority.HIGH, operation: 'log_activity', payload: {}, maxRetries: 1 });
    router.enqueue({ priority: TaskPriority.CRITICAL, operation: 'log_activity', payload: {}, maxRetries: 1 });

    // Dequeue all three – CRITICAL should come out first (or near-first due to weighting)
    const first = router.dequeue()!;
    const second = router.dequeue()!;
    const third = router.dequeue()!;

    expect(first.priority).toBe(TaskPriority.CRITICAL);
    expect(second.priority).toBe(TaskPriority.HIGH);
    expect(third.priority).toBe(TaskPriority.LOW);
  });

  it('should dequeue from a specific priority queue', () => {
    router.enqueue({ priority: TaskPriority.CRITICAL, operation: 'sync_favorites', payload: {}, maxRetries: 1 });
    router.enqueue({ priority: TaskPriority.HIGH, operation: 'sync_notes', payload: {}, maxRetries: 1 });

    const high = router.dequeue(TaskPriority.HIGH);
    expect(high).not.toBeNull();
    expect(high!.priority).toBe(TaskPriority.HIGH);

    const critical = router.dequeue(TaskPriority.CRITICAL);
    expect(critical).not.toBeNull();
    expect(critical!.priority).toBe(TaskPriority.CRITICAL);
  });

  // ─────────────────────────────────────────────
  // 4. Empty queue behavior
  // ─────────────────────────────────────────────
  it('should return undefined when dequeuing an empty queue', () => {
    const result = router.dequeue();
    expect(result).toBeUndefined();
  });

  it('should return undefined when peeking an empty queue', () => {
    const result = router.peek(TaskPriority.CRITICAL);
    expect(result).toBeUndefined();
  });

  // ─────────────────────────────────────────────
  // 5. Size tracking
  // ─────────────────────────────────────────────
  it('should track the correct total size across all queues', () => {
    router.enqueue({ priority: TaskPriority.CRITICAL, operation: 'sync_favorites', payload: {}, maxRetries: 1 });
    router.enqueue({ priority: TaskPriority.HIGH, operation: 'sync_notes', payload: {}, maxRetries: 1 });
    router.enqueue({ priority: TaskPriority.LOW, operation: 'log_activity', payload: {}, maxRetries: 1 });
    expect(router.size()).toBe(3);

    router.dequeue();
    expect(router.size()).toBe(2);

    router.dequeue();
    expect(router.size()).toBe(1);

    router.dequeue();
    expect(router.size()).toBe(0);
  });

  // ─────────────────────────────────────────────
  // 6. Clear functionality
  // ─────────────────────────────────────────────
  it('should clear a specific priority queue', () => {
    router.enqueue({ priority: TaskPriority.HIGH, operation: 'sync_subscriptions', payload: {}, maxRetries: 1 });
    router.enqueue({ priority: TaskPriority.HIGH, operation: 'log_activity', payload: {}, maxRetries: 1 });
    router.enqueue({ priority: TaskPriority.LOW, operation: 'log_activity', payload: {}, maxRetries: 1 });

    router.clear(TaskPriority.HIGH);
    expect(router.size()).toBe(1);
    expect(router.peek(TaskPriority.HIGH)).toBeUndefined();
    expect(router.peek(TaskPriority.LOW)).not.toBeUndefined();
  });

  it('should clear all queues when no priority is specified', () => {
    router.enqueue({ priority: TaskPriority.CRITICAL, operation: 'sync_favorites', payload: {}, maxRetries: 1 });
    router.enqueue({ priority: TaskPriority.HIGH, operation: 'sync_notes', payload: {}, maxRetries: 1 });
    router.clear();
    expect(router.size()).toBe(0);
  });

  // ─────────────────────────────────────────────
  // 7. Peek functionality
  // ─────────────────────────────────────────────
  it('should peek at the next task without removing it', () => {
    const taskId = router.enqueue({
      priority: TaskPriority.NORMAL,
      operation: 'report_stats',
      payload: {},
      maxRetries: 2,
    });

    const peeked = router.peek(TaskPriority.NORMAL);
    expect(peeked).not.toBeNull();
    expect(peeked!.id).toBe(taskId);
    expect(router.size()).toBe(1); // still there
  });

  // ─────────────────────────────────────────────
  // 8. Metrics tracking
  // ─────────────────────────────────────────────
  it('should return correct queue length in getMetrics()', () => {
    router.enqueue({ priority: TaskPriority.NORMAL, operation: 'sync_subscriptions', payload: {}, maxRetries: 1 });
    router.enqueue({ priority: TaskPriority.NORMAL, operation: 'update_tags', payload: {}, maxRetries: 1 });

    const metrics = router.getMetrics();
    const normal = metrics.find((m) => m.priority === TaskPriority.NORMAL);
    expect(normal).not.toBeUndefined();
    expect(normal!.length).toBe(2);
  });

  it('should track totalProcessed and totalFailed after completeTask/failTask', () => {
    const taskId = router.enqueue({
      priority: TaskPriority.HIGH,
      operation: 'sync_favorites',
      payload: {},
      maxRetries: 2,
    });

    router.completeTask(taskId);
    const metrics = router.getMetrics();
    const high = metrics.find((m) => m.priority === TaskPriority.HIGH);
    expect(high!.totalProcessed).toBe(1);
    expect(high!.totalFailed).toBe(0);
  });

  // ─────────────────────────────────────────────
  // 9. Remove task by ID
  // ─────────────────────────────────────────────
  it('should remove a task by ID', () => {
    const taskId = router.enqueue({
      priority: TaskPriority.LOW,
      operation: 'log_activity',
      payload: {},
      maxRetries: 1,
    });
    expect(router.size()).toBe(1);

    const removed = router.removeTask(taskId);
    expect(removed).toBe(true);
    expect(router.size()).toBe(0);
  });

  it('should return false when removing a non-existent task', () => {
    const removed = router.removeTask('non-existent-id');
    expect(removed).toBe(false);
  });

  // ─────────────────────────────────────────────
  // 10. Rebalance / starvation prevention
  // ─────────────────────────────────────────────
  it('should rebalance without errors', () => {
    router.enqueue({ priority: TaskPriority.BACKGROUND, operation: 'report_stats', payload: {}, maxRetries: 1 });
    router.enqueue({ priority: TaskPriority.LOW, operation: 'log_activity', payload: {}, maxRetries: 1 });
    expect(() => router.rebalance()).not.toThrow();
  });

  // ─────────────────────────────────────────────
  // 11. Task operation types
  // ─────────────────────────────────────────────
  it('should accept all supported operation types', () => {
    const operations = [
      'sync_favorites',
      'sync_notes',
      'sync_subscriptions',
      'update_tags',
      'log_activity',
      'report_stats',
    ] as const;

    operations.forEach((op) => {
      const id = router.enqueue({ priority: TaskPriority.LOW, operation: op, payload: {}, maxRetries: 1 });
      expect(id).toBeTruthy();
    });
    expect(router.size()).toBe(6);
  });

  // ─────────────────────────────────────────────
  // 12. Queue order FIFO
  // ─────────────────────────────────────────────
  it('should maintain FIFO order within the same priority queue', () => {
    const id1 = router.enqueue({ priority: TaskPriority.NORMAL, operation: 'sync_subscriptions', payload: { n: 1 }, maxRetries: 1 });
    const id2 = router.enqueue({ priority: TaskPriority.NORMAL, operation: 'sync_subscriptions', payload: { n: 2 }, maxRetries: 1 });
    const id3 = router.enqueue({ priority: TaskPriority.NORMAL, operation: 'sync_subscriptions', payload: { n: 3 }, maxRetries: 1 });

    const first = router.dequeue(TaskPriority.NORMAL)!;
    const second = router.dequeue(TaskPriority.NORMAL)!;
    const third = router.dequeue(TaskPriority.NORMAL)!;

    expect(first.payload).toEqual({ n: 1 });
    expect(second.payload).toEqual({ n: 2 });
    expect(third.payload).toEqual({ n: 3 });
  });
});