/**
 * CircuitBreaker.test.ts — Pure unit tests
 */

import { describe, it, expect, vi } from 'vitest';
import { CircuitBreaker, CircuitOpenError } from '../CircuitBreaker';

describe('CircuitBreaker — basic', () => {
  it('passes through success', async () => {
    const cb = new CircuitBreaker(async (x: number) => x * 2);
    expect(await cb.execute(5)).toBe(10);
  });

  it('starts closed', () => {
    const cb = new CircuitBreaker(async () => 'x');
    expect(cb.currentState).toBe('closed');
  });
});

describe('CircuitBreaker — open', () => {
  it('opens after threshold failures', async () => {
    const cb = new CircuitBreaker(async () => { throw new Error('fail'); }, { failureThreshold: 3 });
    for (let i = 0; i < 3; i++) {
      await expect(cb.execute()).rejects.toThrow('fail');
    }
    expect(cb.currentState).toBe('open');
  });

  it('fails fast when open', async () => {
    const cb = new CircuitBreaker(async () => { throw new Error('x'); }, { failureThreshold: 1, resetTimeoutMs: 1000 });
    await expect(cb.execute()).rejects.toThrow();
    await expect(cb.execute()).rejects.toThrow(CircuitOpenError);
  });
});

describe('CircuitBreaker — recovery', () => {
  it('half-open after reset', async () => {
    const cb = new CircuitBreaker(async () => { throw new Error('x'); }, { failureThreshold: 1, resetTimeoutMs: 50 });
    await expect(cb.execute()).rejects.toThrow();
    expect(cb.currentState).toBe('open');
    await new Promise((r) => setTimeout(r, 60));
    // Next call should try half-open
    const ok = new CircuitBreaker(async () => 'good', { failureThreshold: 1, resetTimeoutMs: 50 });
    await expect(ok.execute()).resolves.toBe('good');
  });
});

describe('CircuitBreaker — reset', () => {
  it('reset to closed', async () => {
    const cb = new CircuitBreaker(async () => { throw new Error('x'); }, { failureThreshold: 1 });
    await expect(cb.execute()).rejects.toThrow();
    cb.reset();
    expect(cb.currentState).toBe('closed');
  });
});

describe('CircuitBreaker — state callback', () => {
  it('calls onStateChange', async () => {
    const fn = vi.fn();
    const cb = new CircuitBreaker(async () => { throw new Error('x'); }, { failureThreshold: 1, onStateChange: fn });
    await expect(cb.execute()).rejects.toThrow();
    expect(fn).toHaveBeenCalledWith('open');
  });
});
