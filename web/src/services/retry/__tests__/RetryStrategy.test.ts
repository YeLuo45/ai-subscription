/**
 * RetryStrategy.test.ts — Pure unit tests
 */

import { describe, it, expect, vi } from 'vitest';
import { RetryStrategy, backoff } from '../RetryStrategy';

describe('RetryStrategy — basic', () => {
  it('returns on first success', async () => {
    const r = await RetryStrategy.run(async () => 42);
    expect(r).toBe(42);
  });

  it('retries on failure', async () => {
    let attempts = 0;
    const r = await RetryStrategy.run(async () => {
      attempts += 1;
      if (attempts < 3) throw new Error('fail');
      return 'ok';
    }, { maxAttempts: 5, backoff: backoff.fixed(1) });
    expect(r).toBe('ok');
    expect(attempts).toBe(3);
  });

  it('throws after max attempts', async () => {
    await expect(RetryStrategy.run(async () => { throw new Error('always'); }, {
      maxAttempts: 2,
      backoff: backoff.fixed(1),
    })).rejects.toThrow('always');
  });
});

describe('RetryStrategy — shouldRetry', () => {
  it('skips retry when predicate returns false', async () => {
    let attempts = 0;
    await expect(RetryStrategy.run(async () => {
      attempts += 1;
      throw new Error('x');
    }, {
      maxAttempts: 5,
      backoff: backoff.fixed(1),
      shouldRetry: () => false,
    })).rejects.toThrow('x');
    expect(attempts).toBe(1);
  });
});

describe('RetryStrategy — onRetry', () => {
  it('calls onRetry', async () => {
    const fn = vi.fn();
    await expect(RetryStrategy.run(async () => { throw new Error('x'); }, {
      maxAttempts: 2,
      backoff: backoff.fixed(1),
      onRetry: fn,
    })).rejects.toThrow();
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('RetryStrategy — backoff', () => {
  it('fixed backoff', () => {
    const b = backoff.fixed(50);
    expect(b(1)).toBe(50);
    expect(b(2)).toBe(50);
  });

  it('linear backoff', () => {
    const b = backoff.linear(10);
    expect(b(1)).toBe(10);
    expect(b(5)).toBe(50);
  });

  it('exponential backoff', () => {
    const b = backoff.exponential(100, 10_000);
    expect(b(1)).toBe(100);
    expect(b(2)).toBe(200);
    expect(b(3)).toBe(400);
  });

  it('exponential capped', () => {
    const b = backoff.exponential(100, 500);
    expect(b(10)).toBe(500);
  });
});

describe('RetryStrategy — timeout', () => {
  it('times out', async () => {
    await expect(RetryStrategy.run(async () => {
      await new Promise((r) => setTimeout(r, 100));
      return 'ok';
    }, { timeoutMs: 10, maxAttempts: 1 })).rejects.toThrow('Retry timeout');
  });
});
