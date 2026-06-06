/**
 * RateLimiter.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { RateLimiter } from '../RateLimiter';

describe('RateLimiter — basic', () => {
  it('starts with full capacity', () => {
    const rl = new RateLimiter({ capacity: 5, refillTokens: 1, refillIntervalMs: 100 });
    expect(rl.available()).toBe(5);
  });

  it('consumes tokens', () => {
    const rl = new RateLimiter({ capacity: 3, refillTokens: 1, refillIntervalMs: 100 });
    expect(rl.tryAcquire()).toBe(true);
    expect(rl.available()).toBe(2);
    expect(rl.tryAcquire(2)).toBe(true);
    expect(rl.available()).toBe(0);
    expect(rl.tryAcquire()).toBe(false);
  });

  it('refills over time', async () => {
    const rl = new RateLimiter({ capacity: 2, refillTokens: 1, refillIntervalMs: 20 });
    rl.tryAcquire(2);
    expect(rl.available()).toBe(0);
    await new Promise((r) => setTimeout(r, 25));
    expect(rl.available()).toBeGreaterThan(0);
  });

  it('does not exceed capacity on refill', async () => {
    const rl = new RateLimiter({ capacity: 2, refillTokens: 5, refillIntervalMs: 10 });
    await new Promise((r) => setTimeout(r, 50));
    expect(rl.available()).toBe(2);
  });
});

describe('RateLimiter — acquire', () => {
  it('waits for tokens', async () => {
    const rl = new RateLimiter({ capacity: 1, refillTokens: 1, refillIntervalMs: 20 });
    rl.tryAcquire(1);
    const start = Date.now();
    await rl.acquire(1);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(15);
  });
});

describe('RateLimiter — run', () => {
  it('runs when tokens available', async () => {
    const rl = new RateLimiter({ capacity: 2, refillTokens: 1, refillIntervalMs: 10 });
    const r = await rl.run(async () => 42);
    expect(r).toBe(42);
  });
});
