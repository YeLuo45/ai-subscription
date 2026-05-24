/**
 * Task Router
 * Singleton priority queue router for task decomposition
 */

import { TaskPriority, PRIORITY_NAMES, STARVATION_THRESHOLD_MS, DEFAULT_WEIGHTS } from './types.js';
import type { QueuedTask, QueueMetrics, TaskPriority as TP } from './types.js';

export { TaskPriority } from './types.js';

export class TaskRouter {
  private queues: Map<TP, QueuedTask[]>;
  private metrics: Map<TP, QueueMetrics>;
  private weights: Map<TP, number>;
  private starvingTasks: Map<string, number>; // taskId -> lastRunTimestamp
  private static _instance: TaskRouter | null = null;

  private constructor() {
    this.queues = new Map();
    this.metrics = new Map();
    this.weights = new Map();
    this.starvingTasks = new Map();

    // Initialize queues and metrics for all priority levels
    for (let p = TaskPriority.CRITICAL; p <= TaskPriority.BACKGROUND; p++) {
      const priority = p as TP;
      this.queues.set(priority, []);
      this.metrics.set(priority, {
        priority,
        name: PRIORITY_NAMES[priority],
        length: 0,
        totalProcessed: 0,
        totalFailed: 0,
        avgWaitTime: 0,
      });
      this.weights.set(priority, DEFAULT_WEIGHTS[priority]);
    }
  }

  static getInstance(): TaskRouter {
    if (!TaskRouter._instance) {
      TaskRouter._instance = new TaskRouter();
    }
    return TaskRouter._instance;
  }

  /**
   * Enqueue a task with the given priority
   * @returns taskId
   */
  enqueue(task: Omit<QueuedTask, 'id' | 'createdAt' | 'retryCount'>): string {
    const id = crypto.randomUUID();
    const now = Date.now();

    const queuedTask: QueuedTask = {
      ...task,
      id,
      createdAt: now,
      retryCount: 0,
    };

    const queue = this.queues.get(task.priority)!;
    queue.push(queuedTask);

    // Track for starvation prevention
    this.starvingTasks.set(id, now);

    // Update metrics
    this.updateQueueMetrics(task.priority);

    return id;
  }

  /**
   * Dequeue the next task, respecting priority and starvation prevention
   */
  dequeue(priority?: TP): QueuedTask | undefined {
    if (priority !== undefined) {
      return this.dequeueFromQueue(priority);
    }

    // Check for starving tasks first
    const starvingTask = this.findStarvingTask();
    if (starvingTask) {
      this.removeTaskFromQueue(starvingTask.id, starvingTask.priority);
      this.starvingTasks.delete(starvingTask.id);
      return starvingTask;
    }

    // Weighted round-robin selection across non-empty queues
    const selected = this.weightedRoundRobinSelect();
    if (selected === undefined) {
      return undefined;
    }

    return this.dequeueFromQueue(selected);
  }

  /**
   * Get metrics for all queues
   */
  getMetrics(): QueueMetrics[] {
    // Refresh metrics before returning
    for (const p of Array.from(this.queues.keys())) {
      const m = this.metrics.get(p)!;
      const queue = this.queues.get(p)!;
      m.length = queue.length;
    }
    return Array.from(this.metrics.values());
  }

  /**
   * Get metrics for a specific priority
   */
  getQueueMetrics(priority: TP): QueueMetrics {
    const m = this.metrics.get(priority)!;
    const queue = this.queues.get(priority)!;
    m.length = queue.length;
    return m;
  }

  /**
   * Rebalance queues - prevent starvation by boosting starving tasks
   */
  rebalance(): void {
    const now = Date.now();
    const threshold = STARVATION_THRESHOLD_MS;

    // Update starving tasks map and remove completed ones
    for (const [taskId, lastRun] of Array.from(this.starvingTasks.entries())) {
      if (now - lastRun > threshold) {
        // Move task to higher priority queue temporarily
        this.boostStarvingTask(taskId, threshold);
      }
    }
  }

  /**
   * Peek at the next task in a specific queue without removing it
   */
  peek(priority: TP): QueuedTask | undefined {
    const queue = this.queues.get(priority);
    if (!queue || queue.length === 0) {
      return undefined;
    }
    return queue[0];
  }

  /**
   * Get total number of tasks across all queues
   */
  size(): number {
    let total = 0;
    for (const queue of Array.from(this.queues.values())) {
      total += queue.length;
    }
    return total;
  }

  /**
   * Clear all queues or a specific priority queue
   */
  clear(priority?: TP): void {
    if (priority !== undefined) {
      const queue = this.queues.get(priority)!;
      for (const task of queue) {
        this.starvingTasks.delete(task.id);
      }
      queue.length = 0;
      this.updateQueueMetrics(priority);
    } else {
      for (const p of Array.from(this.queues.keys())) {
        const queue = this.queues.get(p)!;
        for (const task of queue) {
          this.starvingTasks.delete(task.id);
        }
        queue.length = 0;
        this.updateQueueMetrics(p);
      }
    }
  }

  /**
   * Remove a task by ID from its queue
   */
  removeTask(taskId: string): boolean {
    for (const [p, queue] of Array.from(this.queues.entries())) {
      const index = queue.findIndex((t) => t.id === taskId);
      if (index !== -1) {
        queue.splice(index, 1);
        this.starvingTasks.delete(taskId);
        this.updateQueueMetrics(p);
        return true;
      }
    }
    return false;
  }

  /**
   * Mark a task as completed (updates metrics)
   */
  completeTask(taskId: string): void {
    for (const [p, queue] of Array.from(this.queues.entries())) {
      const index = queue.findIndex((t) => t.id === taskId);
      if (index !== -1) {
        const task = queue[index];
        const now = Date.now();
        const waitTime = now - task.createdAt;

        queue.splice(index, 1);
        this.starvingTasks.delete(taskId);

        // Update metrics
        const m = this.metrics.get(p)!;
        m.totalProcessed++;
        // Running average
        m.avgWaitTime = m.totalProcessed === 1
          ? waitTime
          : (m.avgWaitTime * (m.totalProcessed - 1) + waitTime) / m.totalProcessed;

        this.updateQueueMetrics(p);
        return;
      }
    }
  }

  /**
   * Mark a task as failed (increments retry count)
   */
  failTask(taskId: string): boolean {
    for (const [p, queue] of Array.from(this.queues.entries())) {
      const index = queue.findIndex((t) => t.id === taskId);
      if (index !== -1) {
        const task = queue[index];
        task.retryCount++;

        const m = this.metrics.get(p)!;
        if (task.retryCount >= task.maxRetries) {
          // Task failed permanently
          queue.splice(index, 1);
          this.starvingTasks.delete(taskId);
          m.totalFailed++;
          m.totalProcessed++; // Count as processed even if failed
        }

        this.updateQueueMetrics(p);
        return true;
      }
    }
    return false;
  }

  // --- Private helpers ---

  private dequeueFromQueue(priority: TP): QueuedTask | undefined {
    const queue = this.queues.get(priority);
    if (!queue || queue.length === 0) {
      return undefined;
    }

    const task = queue.shift()!;
    this.starvingTasks.delete(task.id);
    this.updateQueueMetrics(priority);
    return task;
  }

  private removeTaskFromQueue(taskId: string, priority: TP): void {
    const queue = this.queues.get(priority);
    if (!queue) return;
    const index = queue.findIndex((t) => t.id === taskId);
    if (index !== -1) {
      queue.splice(index, 1);
      this.updateQueueMetrics(priority);
    }
  }

  private findStarvingTask(): (QueuedTask & { priority: TP }) | undefined {
    const now = Date.now();
    const threshold = STARVATION_THRESHOLD_MS;

    // Find tasks that have been waiting too long
    for (const [taskId, lastRun] of Array.from(this.starvingTasks.entries())) {
      if (now - lastRun > threshold) {
        // Find which queue this task is in
        for (const [p, queue] of Array.from(this.queues.entries())) {
          const task = queue.find((t) => t.id === taskId);
          if (task) {
            return { ...task, priority: p };
          }
        }
      }
    }
    return undefined;
  }

  private boostStarvingTask(taskId: string, threshold: number): void {
    // Find and remove from current queue
    for (const [p, queue] of Array.from(this.queues.entries())) {
      const index = queue.findIndex((t) => t.id === taskId);
      if (index !== -1) {
        const task = queue.splice(index, 1)[0];
        this.updateQueueMetrics(p);

        // Move to higher priority if not already at CRITICAL
        const newPriority = Math.max(TaskPriority.CRITICAL, p - 1) as TP;
        const newQueue = this.queues.get(newPriority)!;
        newQueue.push(task);
        this.starvingTasks.set(task.id, Date.now()); // Reset timestamp
        this.updateQueueMetrics(newPriority);
        return;
      }
    }
  }

  private weightedRoundRobinSelect(): TP | undefined {
    const now = Date.now();
    const threshold = STARVATION_THRESHOLD_MS;

    // Calculate effective weight based on queue length and starvation
    type WeightedPriority = { priority: TP; effectiveWeight: number };
    const weighted: WeightedPriority[] = [];

    for (let p = TaskPriority.CRITICAL; p <= TaskPriority.BACKGROUND; p++) {
      const priority = p as TP;
      const queue = this.queues.get(priority)!;
      if (queue.length === 0) continue;

      const baseWeight = this.weights.get(priority)!;

      // Adjust weight based on starvation of tasks in this queue
      let starvationBoost = 1.0;
      for (const task of queue) {
        const lastRun = this.starvingTasks.get(task.id) || task.createdAt;
        const age = now - lastRun;
        if (age > threshold / 2) {
          starvationBoost = Math.max(starvationBoost, 1 + (age / threshold));
        }
      }

      weighted.push({
        priority,
        effectiveWeight: baseWeight * starvationBoost * (Math.pow(queue.length, 0.5)),
      });
    }

    if (weighted.length === 0) return undefined;

    // Weighted random selection
    const totalWeight = weighted.reduce((sum, w) => sum + w.effectiveWeight, 0);
    let random = Math.random() * totalWeight;

    for (const w of weighted) {
      random -= w.effectiveWeight;
      if (random <= 0) {
        return w.priority;
      }
    }

    return weighted[weighted.length - 1].priority;
  }

  private updateQueueMetrics(priority: TP): void {
    const m = this.metrics.get(priority)!;
    const queue = this.queues.get(priority)!;
    m.length = queue.length;
  }
}