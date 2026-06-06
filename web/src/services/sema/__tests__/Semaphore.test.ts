/**
 * Semaphore.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Semaphore } from '../Semaphore';

describe('Semaphore — basic', () => {
  it('throws on invalid permits', () => {
    expect(() => new Semaphore(0)).toThrow();
  });

  it('initial permits', () => {
    const s = new Semaphore(3);
    expect(s.available()).toBe(3);
  });

  it('acquire decrements', async () => {
    const s = new Semaphore(2);
    const release = await s.acquire();
    expect(s.available()).toBe(1);
    release();
    expect(s.available()).toBe(2);
  });
});

describe('Semaphore — run', () => {
  it('limits concurrency', async () => {
    const sem = new Semaphore(2);
    let active = 0;
    let maxActive = 0;
    const tasks = Array.from({ length: 10 }, () => async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((r) => setTimeout(r, 5));
      active -= 1;
    });
    await Promise.all(tasks.map((t) => sem.run(t)));
    expect(maxActive).toBeLessThanOrEqual(2);
  });
});

describe('Semaphore — tryAcquire', () => {
  it('returns release function when available', () => {
    const s = new Semaphore(1);
    const r = s.tryAcquire();
    expect(r).not.toBe(null);
    expect(s.available()).toBe(0);
    r!();
    expect(s.available()).toBe(1);
  });

  it('returns null when no permits', () => {
    const s = new Semaphore(1);
    s.tryAcquire();
    expect(s.tryAcquire()).toBe(null);
  });
});

describe('Semaphore — queueing', () => {
  it('queues when full', async () => {
    const sem = new Semaphore(1);
    const r1 = await sem.acquire();
    let second = false;
    const p2 = sem.acquire().then((r) => { second = true; return r; });
    // r1 not released yet
    await new Promise((r) => setTimeout(r, 10));
    expect(second).toBe(false);
    r1();
    await p2;
    expect(second).toBe(true);
  });
});
