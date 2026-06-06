/**
 * PromiseQueue — async FIFO task queue
 *
 * Inspired by: p-queue
 *
 * Process async tasks in FIFO order with concurrency limit.
 */

export class PromiseQueue {
  private concurrency: number;
  private active: number = 0;
  private tasks: Array<() => Promise<unknown>> = [];
  private running: boolean = false;

  constructor(concurrency: number = 1) {
    if (concurrency < 1) throw new Error('concurrency must be >= 1');
    this.concurrency = concurrency;
  }

  /**
   * Add task to queue, returns promise that resolves with result.
   */
  add<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const wrappedTask = async () => {
        try {
          const r = await task();
          resolve(r);
        } catch (e) {
          reject(e);
        }
      };
      this.tasks.push(wrappedTask);
      this.schedule();
    });
  }

  /**
   * Start processing the queue.
   */
  start(): void {
    this.running = true;
    this.schedule();
  }

  /**
   * Stop accepting new tasks. Resolves when current queue is empty.
   */
  async stop(): Promise<void> {
    this.running = false;
    while (this.active > 0 || this.tasks.length > 0) {
      await new Promise((r) => setTimeout(r, 5));
    }
  }

  /**
   * Wait for all queued tasks to complete.
   */
  async drain(): Promise<void> {
    while (this.tasks.length > 0 || this.active > 0) {
      await new Promise((r) => setTimeout(r, 5));
    }
  }

  private schedule(): void {
    if (!this.running) return;
    while (this.active < this.concurrency && this.tasks.length > 0) {
      const task = this.tasks.shift()!;
      this.active += 1;
      task().finally(() => {
        this.active -= 1;
        this.schedule();
      });
    }
  }

  /**
   * Get current pending count.
   */
  get pending(): number {
    return this.tasks.length;
  }

  /**
   * Get current active count.
   */
  get activeCount(): number {
    return this.active;
  }

  /**
   * Get total queued/active.
   */
  get size(): number {
    return this.tasks.length + this.active;
  }

  /**
   * Clear pending tasks (does not stop running).
   */
  clear(): void {
    this.tasks.length = 0;
  }
}
