/**
 * PromisePool.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { PromisePool } from '../PromisePool';

describe('PromisePool — basic', () => {
  it('runs a single task', async () => {
    const pool = new PromisePool(2);
    const r = await pool.run(async () => 42);
    expect(r).toBe(42);
  });

  it('throws on invalid concurrency', () => {
    expect(() => new PromisePool(0)).toThrow();
  });
});

describe('PromisePool — concurrency', () => {
  it('limits concurrent execution', async () => {
    const pool = new PromisePool(2);
    let active = 0;
    let maxActive = 0;
    const tasks = Array.from({ length: 10 }, () => async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((r) => setTimeout(r, 10));
      active -= 1;
      return 1;
    });
    await Promise.all(tasks.map((t) => pool.run(t)));
    expect(maxActive).toBeLessThanOrEqual(2);
  });
});

describe('PromisePool — map', () => {
  it('maps items', async () => {
    const pool = new PromisePool(3);
    const r = await pool.map([1, 2, 3, 4], async (n) => n * 2);
    expect(r).toEqual([2, 4, 6, 8]);
  });

  it('preserves order', async () => {
    const pool = new PromisePool(5);
    const r = await pool.map([1, 2, 3], async (n) => {
      await new Promise((res) => setTimeout(res, Math.random() * 10));
      return n;
    });
    expect(r).toEqual([1, 2, 3]);
  });
});

describe('PromisePool — process', () => {
  it('processes in order', async () => {
    const pool = new PromisePool(1);
    const r = await pool.process([1, 2, 3], async (n) => n * 10);
    expect(r).toEqual([10, 20, 30]);
  });
});

describe('PromisePool — state', () => {
  it('activeCount and queueSize', async () => {
    const pool = new PromisePool(1);
    const p1 = pool.run(async () => {
      await new Promise((r) => setTimeout(r, 20));
      return 1;
    });
    const p2 = pool.run(async () => 2);
    expect(pool.activeCount).toBeGreaterThan(0);
    await Promise.all([p1, p2]);
    expect(pool.activeCount).toBe(0);
  });
});

describe('PromisePool — errors', () => {
  it('continues after error', async () => {
    const pool = new PromisePool(2);
    const r = await Promise.allSettled([
      pool.run(async () => { throw new Error('boom'); }),
      pool.run(async () => 'ok'),
    ]);
    expect(r[0].status).toBe('rejected');
    expect(r[1].status).toBe('fulfilled');
  });
});
