/**
 * Mutex.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Mutex } from '../Mutex';

describe('Mutex — basic', () => {
  it('starts unlocked', () => {
    const m = new Mutex();
    expect(m.isLocked).toBe(false);
  });

  it('acquire sets locked', async () => {
    const m = new Mutex();
    const release = await m.acquire();
    expect(m.isLocked).toBe(true);
    release();
    expect(m.isLocked).toBe(false);
  });

  it('serializes access', async () => {
    const m = new Mutex();
    const log: string[] = [];
    await m.run(async () => {
      log.push('a1');
      await new Promise((r) => setTimeout(r, 5));
      log.push('a2');
    });
    await m.run(async () => {
      log.push('b1');
      log.push('b2');
    });
    expect(log).toEqual(['a1', 'a2', 'b1', 'b2']);
  });
});

describe('Mutex — tryLock', () => {
  it('succeeds when free', () => {
    const m = new Mutex();
    const r = m.tryLock();
    expect(r).not.toBe(null);
    expect(m.isLocked).toBe(true);
    r!();
  });

  it('fails when held', async () => {
    const m = new Mutex();
    const r = await m.acquire();
    expect(m.tryLock()).toBe(null);
    r();
  });
});

describe('Mutex — concurrent waiters', () => {
  it('queues waiters', async () => {
    const m = new Mutex();
    const order: string[] = [];
    const r1 = await m.acquire();
    const p2 = m.run(async () => { order.push('b'); });
    const p3 = m.run(async () => { order.push('c'); });
    await new Promise((r) => setTimeout(r, 5));
    order.push('a-end');
    r1();
    await Promise.all([p2, p3]);
    expect(order).toEqual(['a-end', 'b', 'c']);
  });
});
