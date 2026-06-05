/**
 * RetryPolicy.test.ts — Pure unit tests for backoff strategies + jitter
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RetryPolicy } from '../RetryPolicy';

describe('RetryPolicy — backoff strategies', () => {
  it('exponential: 100, 200, 400, 800', () => {
    const rp = new RetryPolicy({ backoff: 'exponential', baseMs: 100, maxMs: 1_000_000, maxAttempts: 5, jitter: 'none' });
    expect(rp.nextDelay(1)).toBe(100);
    expect(rp.nextDelay(2)).toBe(200);
    expect(rp.nextDelay(3)).toBe(400);
    expect(rp.nextDelay(4)).toBe(800);
  });

  it('linear: 100, 200, 300, 400', () => {
    const rp = new RetryPolicy({ backoff: 'linear', baseMs: 100, maxMs: 1_000_000, maxAttempts: 5, jitter: 'none' });
    expect(rp.nextDelay(1)).toBe(100);
    expect(rp.nextDelay(2)).toBe(200);
    expect(rp.nextDelay(3)).toBe(300);
  });

  it('constant: always baseMs', () => {
    const rp = new RetryPolicy({ backoff: 'constant', baseMs: 50, maxMs: 1_000_000, maxAttempts: 5, jitter: 'none' });
    expect(rp.nextDelay(1)).toBe(50);
    expect(rp.nextDelay(3)).toBe(50);
  });

  it('fibonacci: 100, 100, 200, 300, 500', () => {
    const rp = new RetryPolicy({ backoff: 'fibonacci', baseMs: 100, maxMs: 1_000_000, maxAttempts: 5, jitter: 'none' });
    expect(rp.nextDelay(1)).toBe(100); // fib(1)=1
    expect(rp.nextDelay(2)).toBe(100); // fib(2)=1
    expect(rp.nextDelay(3)).toBe(200); // fib(3)=2
    expect(rp.nextDelay(4)).toBe(300); // fib(4)=3
  });

  it('caps at maxMs', () => {
    const rp = new RetryPolicy({ backoff: 'exponential', baseMs: 1000, maxMs: 5000, maxAttempts: 10, jitter: 'none' });
    expect(rp.nextDelay(10)).toBe(5000);
  });

  it('exponential with custom multiplier', () => {
    const rp = new RetryPolicy({ backoff: 'exponential', baseMs: 10, maxMs: 1_000_000, maxAttempts: 5, jitter: 'none', multiplier: 3 });
    expect(rp.nextDelay(1)).toBe(10);
    expect(rp.nextDelay(2)).toBe(30);
    expect(rp.nextDelay(3)).toBe(90);
  });
});

describe('RetryPolicy — jitter strategies', () => {
  it('none: returns exact delay', () => {
    const rp = new RetryPolicy({ backoff: 'exponential', baseMs: 100, maxMs: 1_000_000, maxAttempts: 3, jitter: 'none' });
    expect(rp.nextDelay(2)).toBe(200);
  });

  it('full: returns value in [0, delay]', () => {
    const rp = new RetryPolicy({ backoff: 'exponential', baseMs: 100, maxMs: 1_000_000, maxAttempts: 3, jitter: 'full' });
    for (let i = 0; i < 20; i++) {
      const d = rp.nextDelay(2);
      expect(d).toBeGreaterThanOrEqual(0);
      expect(d).toBeLessThanOrEqual(200);
    }
  });

  it('equal: returns value in [delay/2, delay]', () => {
    const rp = new RetryPolicy({ backoff: 'exponential', baseMs: 100, maxMs: 1_000_000, maxAttempts: 3, jitter: 'equal' });
    for (let i = 0; i < 20; i++) {
      const d = rp.nextDelay(2);
      expect(d).toBeGreaterThanOrEqual(100);
      expect(d).toBeLessThanOrEqual(200);
    }
  });

  it('decorrelated: returns positive random value', () => {
    const rp = new RetryPolicy({ backoff: 'exponential', baseMs: 100, maxMs: 1_000_000, maxAttempts: 3, jitter: 'decorrelated' });
    const d1 = rp.nextDelay(1);
    const d2 = rp.nextDelay(2);
    expect(d1).toBeGreaterThanOrEqual(0);
    expect(d2).toBeGreaterThanOrEqual(0);
  });
});

describe('RetryPolicy — execute', () => {
  it('returns success on first try', async () => {
    const rp = new RetryPolicy({ backoff: 'constant', baseMs: 1, maxMs: 10, maxAttempts: 3, jitter: 'none' });
    const result = await rp.execute(async () => 'ok');
    expect(result.success).toBe(true);
    expect(result.output).toBe('ok');
    expect(result.attempts).toBe(1);
    expect(result.delays.length).toBe(0);
  });

  it('retries on failure', async () => {
    const rp = new RetryPolicy({ backoff: 'constant', baseMs: 1, maxMs: 10, maxAttempts: 3, jitter: 'none' });
    let calls = 0;
    const result = await rp.execute(async () => {
      calls += 1;
      if (calls < 3) throw new Error('try again');
      return 'finally';
    });
    expect(result.success).toBe(true);
    expect(result.attempts).toBe(3);
    expect(result.delays.length).toBe(2);
  });

  it('returns failure after maxAttempts', async () => {
    const rp = new RetryPolicy({ backoff: 'constant', baseMs: 1, maxMs: 10, maxAttempts: 3, jitter: 'none' });
    const result = await rp.execute(async () => { throw new Error('always fail'); });
    expect(result.success).toBe(false);
    expect(result.attempts).toBe(3);
    expect(result.error).toBe('always fail');
  });

  it('respects isRetryable predicate', async () => {
    const rp = new RetryPolicy({
      backoff: 'constant', baseMs: 1, maxMs: 10, maxAttempts: 5, jitter: 'none',
      isRetryable: (err) => !(err instanceof Error && err.message === 'fatal'),
    });
    const result = await rp.execute(async () => {
      const e: Error = new Error('fatal'); throw e;
    });
    expect(result.success).toBe(false);
    expect(result.attempts).toBe(1);
  });

  it('records delays between retries', async () => {
    const rp = new RetryPolicy({ backoff: 'exponential', baseMs: 5, maxMs: 100, maxAttempts: 4, jitter: 'none' });
    const result = await rp.execute(async () => { throw new Error('x'); });
    expect(result.delays.length).toBe(3);
    expect(result.delays[0]).toBe(5);
    expect(result.delays[1]).toBe(10);
    expect(result.delays[2]).toBe(20);
  });
});

describe('RetryPolicy — config and reset', () => {
  it('setConfig updates config', () => {
    const rp = new RetryPolicy();
    rp.setConfig({ baseMs: 200 });
    expect(rp.getConfig().baseMs).toBe(200);
  });

  it('reset clears decorrelated jitter state', () => {
    const rp = new RetryPolicy({ jitter: 'decorrelated', baseMs: 10, maxMs: 100, maxAttempts: 3 });
    rp.nextDelay(1);
    rp.nextDelay(2);
    rp.reset();
    // After reset, previousDelay is 0; next call should start fresh
    const d = rp.nextDelay(1);
    expect(d).toBeGreaterThanOrEqual(0);
  });
});
