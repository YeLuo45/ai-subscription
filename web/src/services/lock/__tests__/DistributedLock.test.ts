/**
 * DistributedLock.test.ts — Pure unit tests for distributed mutex
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DistributedLock } from '../DistributedLock';

describe('DistributedLock — basic acquire and release', () => {
  let dl: DistributedLock;
  beforeEach(() => {
    dl = new DistributedLock();
  });

  it('acquires a lock', () => {
    const r = dl.tryAcquire('res-1', 'owner-1');
    expect(r.success).toBe(true);
    expect(r.token).toBeDefined();
  });

  it('rejects second acquire on same resource', () => {
    dl.tryAcquire('res-1', 'owner-1');
    const r = dl.tryAcquire('res-1', 'owner-2');
    expect(r.success).toBe(false);
    expect(r.reason).toBe('already locked');
    expect(r.currentOwner).toBe('owner-1');
  });

  it('release returns true for correct token', () => {
    const r = dl.tryAcquire('res-1', 'owner-1');
    expect(dl.release('res-1', r.token!)).toBe(true);
  });

  it('release returns false for wrong token', () => {
    dl.tryAcquire('res-1', 'owner-1');
    expect(dl.release('res-1', 'wrong-token')).toBe(false);
  });

  it('isLocked reflects state', () => {
    expect(dl.isLocked('res-1')).toBe(false);
    dl.tryAcquire('res-1', 'owner-1');
    expect(dl.isLocked('res-1')).toBe(true);
  });

  it('getOwner returns current owner', () => {
    dl.tryAcquire('res-1', 'owner-1');
    expect(dl.getOwner('res-1')).toBe('owner-1');
  });

  it('getOwner returns undefined for unlocked', () => {
    expect(dl.getOwner('nope')).toBeUndefined();
  });
});

describe('DistributedLock — renew and expiry', () => {
  it('renew extends TTL', async () => {
    const dl = new DistributedLock(50);
    const r = dl.tryAcquire('res', 'o');
    expect(dl.renew('res', r.token!)).toBe(true);
    await new Promise((res) => setTimeout(res, 30));
    // Still locked because we renewed
    expect(dl.isLocked('res')).toBe(true);
  });

  it('renew fails for wrong token', () => {
    const dl = new DistributedLock();
    dl.tryAcquire('res', 'o');
    expect(dl.renew('res', 'wrong')).toBe(false);
  });

  it('lock expires after TTL', async () => {
    const dl = new DistributedLock(50);
    dl.tryAcquire('res', 'o');
    await new Promise((r) => setTimeout(r, 80));
    expect(dl.isLocked('res')).toBe(false);
  });

  it('can re-acquire after expiry', async () => {
    const dl = new DistributedLock(50);
    dl.tryAcquire('res', 'o');
    await new Promise((r) => setTimeout(r, 80));
    const r2 = dl.tryAcquire('res', 'o2');
    expect(r2.success).toBe(true);
  });
});

describe('DistributedLock — waiting acquire', () => {
  it('waits for lock to be released', async () => {
    const dl = new DistributedLock();
    const r1 = dl.tryAcquire('res', 'a');
    const promise = dl.acquire('res', 'b', 1000);
    setTimeout(() => dl.release('res', r1.token!), 50);
    const r2 = await promise;
    expect(r2.success).toBe(true);
  });

  it('times out if lock not released', async () => {
    const dl = new DistributedLock();
    dl.tryAcquire('res', 'a');
    const r = await dl.acquire('res', 'b', 50);
    expect(r.success).toBe(false);
    expect(r.reason).toBe('wait timeout');
  });
});

describe('DistributedLock — management', () => {
  it('forceRelease removes lock', () => {
    const dl = new DistributedLock();
    dl.tryAcquire('res', 'a');
    expect(dl.forceRelease('res')).toBe(true);
    expect(dl.isLocked('res')).toBe(false);
  });

  it('forceRelease returns false for unlocked', () => {
    const dl = new DistributedLock();
    expect(dl.forceRelease('nope')).toBe(false);
  });

  it('sweep removes expired', async () => {
    const dl = new DistributedLock(50);
    dl.tryAcquire('a', '1');
    dl.tryAcquire('b', '2');
    await new Promise((r) => setTimeout(r, 80));
    const swept = dl.sweep();
    expect(swept).toBe(2);
  });

  it('listLockedResources returns locked keys', () => {
    const dl = new DistributedLock();
    dl.tryAcquire('a', '1');
    dl.tryAcquire('b', '2');
    expect(dl.listLockedResources().sort()).toEqual(['a', 'b']);
  });

  it('getEntry returns lock info', () => {
    const dl = new DistributedLock();
    dl.tryAcquire('a', 'owner-1', 1000);
    const e = dl.getEntry('a');
    expect(e?.owner).toBe('owner-1');
    expect(e?.expiresAt).toBeGreaterThan(Date.now());
  });

  it('stats reports counts', () => {
    const dl = new DistributedLock();
    dl.tryAcquire('a', '1');
    expect(dl.stats().totalLocks).toBe(1);
  });
});
