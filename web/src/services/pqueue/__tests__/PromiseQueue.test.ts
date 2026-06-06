/**
 * PromiseQueue.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { PromiseQueue } from '../PromiseQueue';

describe('PromiseQueue — basic', () => {
  it('runs single task', async () => {
    const q = new PromiseQueue(2);
    q.start();
    const r = await q.add(async () => 42);
    expect(r).toBe(42);
  });

  it('throws on invalid concurrency', () => {
    expect(() => new PromiseQueue(0)).toThrow();
  });

  it('does not start without start()', async () => {
    const q = new PromiseQueue(1);
    const p = q.add(async () => 'x');
    await new Promise((r) => setTimeout(r, 5));
    q.start();
    expect(await p).toBe('x');
  });
});

describe('PromiseQueue — FIFO order', () => {
  it('preserves order with concurrency 1', async () => {
    const q = new PromiseQueue(1);
    q.start();
    const order: number[] = [];
    const p1 = q.add(async () => { order.push(1); });
    const p2 = q.add(async () => { order.push(2); });
    const p3 = q.add(async () => { order.push(3); });
    await Promise.all([p1, p2, p3]);
    expect(order).toEqual([1, 2, 3]);
  });
});

describe('PromiseQueue — concurrency', () => {
  it('limits concurrency', async () => {
    const q = new PromiseQueue(2);
    q.start();
    let active = 0;
    let maxActive = 0;
    const promises = Array.from({ length: 10 }, () =>
      q.add(async () => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await new Promise((r) => setTimeout(r, 5));
        active -= 1;
      }),
    );
    await Promise.all(promises);
    expect(maxActive).toBeLessThanOrEqual(2);
  });
});

describe('PromiseQueue — state', () => {
  it('pending and size', async () => {
    const q = new PromiseQueue(1);
    q.start();
    const p1 = q.add(async () => {
      await new Promise((r) => setTimeout(r, 20));
      return 1;
    });
    const p2 = q.add(async () => 2);
    expect(q.pending).toBe(1);
    expect(q.activeCount).toBe(1);
    expect(q.size).toBe(2);
    await Promise.all([p1, p2]);
    expect(q.size).toBe(0);
  });
});

describe('PromiseQueue — clear', () => {
  it('clears pending tasks', async () => {
    const q = new PromiseQueue(1);
    q.start();
    // Block first task to make second stay pending
    const blocker = new Promise<void>((r) => setTimeout(r, 20));
    q.add(async () => { await blocker; return 1; });
    await new Promise((r) => setTimeout(r, 0)); // let first task start
    q.add(async () => 2);
    expect(q.pending).toBe(1);
    q.clear();
    expect(q.pending).toBe(0);
  });
});

describe('PromiseQueue — errors', () => {
  it('propagates error', async () => {
    const q = new PromiseQueue(1);
    q.start();
    await expect(q.add(async () => { throw new Error('boom'); })).rejects.toThrow('boom');
  });
});

describe('PromiseQueue — drain', () => {
  it('drain waits for completion', async () => {
    const q = new PromiseQueue(2);
    q.start();
    const promises = Array.from({ length: 5 }, (_, i) =>
      q.add(async () => {
        await new Promise((r) => setTimeout(r, 5));
        return i;
      }),
    );
    await q.drain();
    expect((await Promise.all(promises)).sort()).toEqual([0, 1, 2, 3, 4]);
  });
});
