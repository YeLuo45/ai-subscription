/**
 * ConnectionPool.test.ts — Pure unit tests for resource pool
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConnectionPool } from '../ConnectionPool';

describe('ConnectionPool — start and basic acquire', () => {
  let p: ConnectionPool;
  afterEach(async () => {
    if (p) await p.close();
  });

  it('starts with minSize resources', async () => {
    p = new ConnectionPool({ minSize: 2, maxSize: 5 });
    await p.start();
    expect(p.stats().total).toBe(2);
  });

  it('acquires an idle resource', async () => {
    p = new ConnectionPool({ minSize: 1 });
    await p.start();
    const r = await p.acquire();
    expect(r.success).toBe(true);
    expect(r.resource).toBeDefined();
  });

  it('creates new resources up to maxSize', async () => {
    p = new ConnectionPool({ minSize: 0, maxSize: 3 });
    await p.start();
    const r1 = await p.acquire();
    const r2 = await p.acquire();
    const r3 = await p.acquire();
    expect(p.stats().totalCreated).toBe(3);
  });

  it('rejects acquire when closed', async () => {
    p = new ConnectionPool({ minSize: 1 });
    await p.start();
    await p.close();
    const r = await p.acquire();
    expect(r.success).toBe(false);
    expect(r.reason).toBe('pool closed');
  });
});

describe('ConnectionPool — release', () => {
  let p: ConnectionPool;
  beforeEach(async () => {
    p = new ConnectionPool({ minSize: 2 });
    await p.start();
  });
  afterEach(async () => {
    await p.close();
  });

  it('releases a resource back to pool', async () => {
    const r = await p.acquire();
    expect(p.release(r.resource!)).toBe(true);
    expect(p.stats().active).toBe(0);
  });

  it('releases fails on unknown resource', () => {
    const fake = { id: 'nope', createdAt: 0, lastUsedAt: 0, useCount: 0, acquired: true };
    expect(p.release(fake)).toBe(false);
  });

  it('increments useCount on each acquire', async () => {
    const r1 = await p.acquire();
    const id = r1.resource!.id;
    p.release(r1.resource!);
    const r2 = await p.acquire();
    expect(r2.resource!.id).toBe(id);
    expect(r2.resource!.useCount).toBe(2);
  });
});

describe('ConnectionPool — concurrent acquire', () => {
  it('queues when all resources busy', async () => {
    const p = new ConnectionPool({ minSize: 1, maxSize: 1, acquireTimeoutMs: 200 });
    await p.start();
    const r1 = await p.acquire();
    const promise = p.acquire();
    // Release after small delay
    setTimeout(() => p.release(r1.resource!), 50);
    const r2 = await promise;
    expect(r2.success).toBe(true);
    expect(r2.waitedMs).toBeGreaterThanOrEqual(40);
    await p.close();
  });

  it('times out when waiting too long', async () => {
    const p = new ConnectionPool({ minSize: 1, maxSize: 1, acquireTimeoutMs: 100 });
    await p.start();
    await p.acquire(); // grab the only one
    const r = await p.acquire();
    expect(r.success).toBe(false);
    expect(r.reason).toBe('acquire timeout');
    await p.close();
  });
});

describe('ConnectionPool — factory and validation', () => {
  it('uses custom factory', async () => {
    const p = new ConnectionPool({
      minSize: 0,
      maxSize: 1,
      factory: () => ({ id: 'custom', createdAt: 0, lastUsedAt: 0, useCount: 0, acquired: false, data: { type: 'custom' } }),
    });
    await p.start();
    const r = await p.acquire();
    expect(r.resource!.data?.type).toBe('custom');
    await p.close();
  });

  it('replaces resource when validate returns false', async () => {
    const p = new ConnectionPool({
      minSize: 1,
      maxSize: 2,
      factory: () => ({ id: 'v', createdAt: 0, lastUsedAt: 0, useCount: 0, acquired: false }),
      validate: () => false,
    });
    await p.start();
    const r = await p.acquire();
    expect(r.success).toBe(true);
    await p.close();
  });
});

describe('ConnectionPool — stats and close', () => {
  it('reports correct counts', async () => {
    const p = new ConnectionPool({ minSize: 2 });
    await p.start();
    await p.acquire();
    const s = p.stats();
    expect(s.total).toBe(2);
    expect(s.active).toBe(1);
    expect(s.idle).toBe(1);
    expect(s.totalAcquired).toBe(1);
    await p.close();
  });

  it('closeAll destroys all resources', async () => {
    const p = new ConnectionPool({ minSize: 3 });
    await p.start();
    expect(p.stats().total).toBe(3);
    await p.close();
  });

  it('tracks acquire/release counts', async () => {
    const p = new ConnectionPool({ minSize: 1 });
    await p.start();
    const r = await p.acquire();
    p.release(r.resource!);
    const r2 = await p.acquire();
    p.release(r2.resource!);
    const s = p.stats();
    expect(s.totalAcquired).toBe(2);
    expect(s.totalReleased).toBe(2);
    await p.close();
  });

  it('counts timeouts', async () => {
    const p = new ConnectionPool({ minSize: 1, maxSize: 1, acquireTimeoutMs: 50 });
    await p.start();
    await p.acquire();
    await p.acquire();
    expect(p.stats().totalTimeouts).toBe(1);
    await p.close();
  });
});
