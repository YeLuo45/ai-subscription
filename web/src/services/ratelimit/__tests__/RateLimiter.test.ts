/**
 * RateLimiter.test.ts — Pure unit tests for sliding window + token bucket
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RateLimiter } from '../RateLimiter';

describe('RateLimiter — registration', () => {
  let rl: RateLimiter;
  beforeEach(() => {
    rl = new RateLimiter();
  });

  it('registers a sliding-window limiter', () => {
    rl.register({ key: 'user-1', algorithm: 'sliding-window', limit: 5, windowMs: 1000 });
    expect(rl.size()).toBe(1);
  });

  it('registers a token-bucket limiter', () => {
    rl.register({ key: 'user-1', algorithm: 'token-bucket', limit: 10, windowMs: 0, refillRate: 1, burst: 10 });
    expect(rl.size()).toBe(1);
  });

  it('rejects limit <= 0', () => {
    expect(() => rl.register({ key: 'x', algorithm: 'sliding-window', limit: 0, windowMs: 1000 })).toThrow('> 0');
  });

  it('rejects windowMs <= 0 for sliding-window', () => {
    expect(() => rl.register({ key: 'x', algorithm: 'sliding-window', limit: 1, windowMs: 0 })).toThrow('> 0');
  });

  it('rejects missing refillRate for token-bucket', () => {
    expect(() => rl.register({ key: 'x', algorithm: 'token-bucket', limit: 10, windowMs: 0, refillRate: 0 })).toThrow('refillRate');
  });

  it('unregister removes limiter', () => {
    rl.register({ key: 'a', algorithm: 'sliding-window', limit: 5, windowMs: 1000 });
    expect(rl.unregister('a')).toBe(true);
    expect(rl.size()).toBe(0);
  });

  it('unregister returns false for unknown', () => {
    expect(rl.unregister('nope')).toBe(false);
  });
});

describe('RateLimiter — sliding window', () => {
  let rl: RateLimiter;
  beforeEach(() => {
    rl = new RateLimiter();
  });

  it('allows up to limit', () => {
    rl.register({ key: 'a', algorithm: 'sliding-window', limit: 3, windowMs: 1000 });
    expect(rl.allow('a').allowed).toBe(true);
    expect(rl.allow('a').allowed).toBe(true);
    expect(rl.allow('a').allowed).toBe(true);
    expect(rl.allow('a').allowed).toBe(false);
  });

  it('returns retryAfterMs when blocked', () => {
    rl.register({ key: 'a', algorithm: 'sliding-window', limit: 1, windowMs: 1000 });
    rl.allow('a');
    const r = rl.allow('a');
    expect(r.allowed).toBe(false);
    expect(r.retryAfterMs).toBeGreaterThan(0);
  });

  it('remaining decreases with use', () => {
    rl.register({ key: 'a', algorithm: 'sliding-window', limit: 5, windowMs: 1000 });
    expect(rl.allow('a').remaining).toBe(4);
    expect(rl.allow('a').remaining).toBe(3);
  });

  it('resets after window', async () => {
    rl.register({ key: 'a', algorithm: 'sliding-window', limit: 1, windowMs: 50 });
    rl.allow('a');
    expect(rl.allow('a').allowed).toBe(false);
    await new Promise((r) => setTimeout(r, 70));
    expect(rl.allow('a').allowed).toBe(true);
  });

  it('count parameter allows N at once', () => {
    rl.register({ key: 'a', algorithm: 'sliding-window', limit: 5, windowMs: 1000 });
    expect(rl.allow('a', 3).allowed).toBe(true);
    expect(rl.allow('a', 3).allowed).toBe(false); // would exceed
  });

  it('returns allow=true for unknown key', () => {
    expect(rl.allow('nope').allowed).toBe(true);
  });
});

describe('RateLimiter — token bucket', () => {
  let rl: RateLimiter;
  beforeEach(() => {
    rl = new RateLimiter();
  });

  it('allows up to burst', () => {
    rl.register({ key: 'a', algorithm: 'token-bucket', limit: 5, windowMs: 0, refillRate: 1, burst: 5 });
    for (let i = 0; i < 5; i++) expect(rl.allow('a').allowed).toBe(true);
    expect(rl.allow('a').allowed).toBe(false);
  });

  it('refills tokens over time', async () => {
    rl.register({ key: 'a', algorithm: 'token-bucket', limit: 2, windowMs: 0, refillRate: 10, burst: 2 });
    rl.allow('a');
    rl.allow('a');
    expect(rl.allow('a').allowed).toBe(false);
    await new Promise((r) => setTimeout(r, 200)); // 2 tokens at 10/sec
    expect(rl.allow('a').allowed).toBe(true);
  });

  it('caps at burst capacity', async () => {
    rl.register({ key: 'a', algorithm: 'token-bucket', limit: 2, windowMs: 0, refillRate: 10, burst: 2 });
    await new Promise((r) => setTimeout(r, 5000)); // long wait
    expect(rl.peek('a')!.state).toBeLessThanOrEqual(2);
  });

  it('returns retryAfterMs for insufficient tokens', () => {
    rl.register({ key: 'a', algorithm: 'token-bucket', limit: 5, windowMs: 0, refillRate: 1, burst: 5 });
    for (let i = 0; i < 5; i++) rl.allow('a');
    const r = rl.allow('a');
    expect(r.allowed).toBe(false);
    expect(r.retryAfterMs).toBeGreaterThan(0);
  });

  it('burst defaults to limit if not specified', () => {
    rl.register({ key: 'a', algorithm: 'token-bucket', limit: 3, windowMs: 0, refillRate: 1 });
    for (let i = 0; i < 3; i++) expect(rl.allow('a').allowed).toBe(true);
    expect(rl.allow('a').allowed).toBe(false);
  });
});

describe('RateLimiter — peek and reset', () => {
  it('peek returns current state for sliding', () => {
    const rl = new RateLimiter();
    rl.register({ key: 'a', algorithm: 'sliding-window', limit: 5, windowMs: 1000 });
    rl.allow('a');
    rl.allow('a');
    const peek = rl.peek('a');
    expect(peek?.algorithm).toBe('sliding-window');
    expect(peek?.state).toBe(2);
  });

  it('peek returns undefined for unknown', () => {
    const rl = new RateLimiter();
    expect(rl.peek('nope')).toBeUndefined();
  });

  it('reset clears sliding window', () => {
    const rl = new RateLimiter();
    rl.register({ key: 'a', algorithm: 'sliding-window', limit: 2, windowMs: 1000 });
    rl.allow('a');
    rl.allow('a');
    expect(rl.allow('a').allowed).toBe(false);
    rl.reset('a');
    expect(rl.allow('a').allowed).toBe(true);
  });

  it('reset refills token bucket', () => {
    const rl = new RateLimiter();
    rl.register({ key: 'a', algorithm: 'token-bucket', limit: 2, windowMs: 0, refillRate: 0.1, burst: 2 });
    rl.allow('a');
    rl.allow('a');
    rl.reset('a');
    expect(rl.allow('a').allowed).toBe(true);
  });
});

describe('RateLimiter — listKeys and waitFor', () => {
  it('listKeys returns all registered keys', () => {
    const rl = new RateLimiter();
    rl.register({ key: 'a', algorithm: 'sliding-window', limit: 1, windowMs: 1000 });
    rl.register({ key: 'b', algorithm: 'sliding-window', limit: 1, windowMs: 1000 });
    expect(rl.listKeys().sort()).toEqual(['a', 'b']);
  });

  it('waitFor returns immediately if allowed', async () => {
    const rl = new RateLimiter();
    rl.register({ key: 'a', algorithm: 'sliding-window', limit: 1, windowMs: 1000 });
    const waited = await rl.waitFor('a', 1, 100);
    expect(waited).toBeGreaterThanOrEqual(0);
    expect(waited).toBeLessThan(100);
  });

  it('waitFor returns -1 on timeout', async () => {
    const rl = new RateLimiter();
    rl.register({ key: 'a', algorithm: 'sliding-window', limit: 1, windowMs: 1000 });
    await rl.waitFor('a');
    const result = await rl.waitFor('a', 1, 50);
    expect(result).toBe(-1);
  });
});
