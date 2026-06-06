/**
 * PromisePool — bounded-concurrency promise execution
 *
 * Inspired by: p-limit / promise-pool
 *
 * Run up to N promises concurrently, queueing the rest.
 */

export class PromisePool {
  private concurrency: number;
  private active: number = 0;
  private queue: Array<() => void> = [];

  constructor(concurrency: number = 4) {
    if (concurrency < 1) throw new Error('concurrency must be >= 1');
    this.concurrency = concurrency;
  }

  /**
   * Run a single task via the pool.
   */
  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.active >= this.concurrency) {
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }
    this.active += 1;
    try {
      return await fn();
    } finally {
      this.active -= 1;
      const next = this.queue.shift();
      if (next) next();
    }
  }

  /**
   * Map items through async function with bounded concurrency.
   */
  async map<T, R>(items: T[], fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
    return Promise.all(items.map((item, idx) => this.run(() => fn(item, idx))));
  }

  /**
   * For each item with bounded concurrency.
   */
  async forEach<T>(items: T[], fn: (item: T, index: number) => Promise<void>): Promise<void> {
    await Promise.all(items.map((item, idx) => this.run(() => fn(item, idx))));
  }

  /**
   * Process items in order, returning results in same order.
   */
  async process<T, R>(items: T[], fn: (item: T) => Promise<R>): Promise<R[]> {
    const results: R[] = [];
    for (const item of items) {
      results.push(await this.run(() => fn(item)));
    }
    return results;
  }

  /**
   * Get current active count.
   */
  get activeCount(): number {
    return this.active;
  }

  /**
   * Get queue size.
   */
  get queueSize(): number {
    return this.queue.length;
  }
}
