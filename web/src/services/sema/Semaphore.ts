/**
 * Semaphore — async semaphore for resource access control
 *
 * Inspired by: Go sync.Semaphore / Edsger Dijkstra
 *
 * Limit concurrent access to N resources.
 * acquire() returns a release function.
 */

export class Semaphore {
  private permits: number;
  private waiters: Array<() => void> = [];

  constructor(permits: number) {
    if (permits < 1) throw new Error('permits must be >= 1');
    this.permits = permits;
  }

  /**
   * Acquire a permit. Returns a release function.
   */
  async acquire(): Promise<() => void> {
    if (this.permits > 0) {
      this.permits -= 1;
      return () => this.release();
    }
    return new Promise<() => void>((resolve) => {
      this.waiters.push(() => {
        this.permits -= 1;
        resolve(() => this.release());
      });
    });
  }

  /**
   * Acquire a permit and run fn, automatically releasing.
   */
  async run<T>(fn: () => Promise<T>): Promise<T> {
    const release = await this.acquire();
    try {
      return await fn();
    } finally {
      release();
    }
  }

  /**
   * Try to acquire without waiting.
   */
  tryAcquire(): (() => void) | null {
    if (this.permits > 0) {
      this.permits -= 1;
      return () => this.release();
    }
    return null;
  }

  private release(): void {
    this.permits += 1;
    if (this.waiters.length > 0) {
      const next = this.waiters.shift()!;
      next();
      this.permits -= 1; // waiter takes the permit
    }
  }

  /**
   * Available permits.
   */
  available(): number {
    return this.permits;
  }

  /**
   * Waiters count.
   */
  get queueSize(): number {
    return this.waiters.length;
  }
}
