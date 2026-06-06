/**
 * Mutex — async mutual exclusion lock
 *
 * Inspired by: async-mutex / Go sync.Mutex
 *
 * Only one holder at a time. FIFO queue.
 */

import { Semaphore } from '../sema/Semaphore';

export class Mutex {
  private sem: Semaphore;
  private locked: boolean = false;

  constructor() {
    this.sem = new Semaphore(1);
  }

  /**
   * Acquire lock. Returns release function.
   */
  async acquire(): Promise<() => void> {
    const release = await this.sem.acquire();
    this.locked = true;
    return () => {
      this.locked = false;
      release();
    };
  }

  /**
   * Run fn while holding the lock.
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
  tryLock(): (() => void) | null {
    if (!this.locked) {
      this.locked = true;
      return () => { this.locked = false; };
    }
    return null;
  }

  /**
   * Check if locked.
   */
  get isLocked(): boolean {
    return this.locked;
  }
}
