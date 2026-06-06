/**
 * BackoffCalculator.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { BackoffCalculator } from '../BackoffCalculator';

describe('BackoffCalculator — constant', () => {
  it('returns same value', () => {
    const b = BackoffCalculator.constant(50);
    expect(b(1)).toBe(50);
    expect(b(5)).toBe(50);
  });
});

describe('BackoffCalculator — linear', () => {
  it('linear growth', () => {
    const b = BackoffCalculator.linear(10);
    expect(b(1)).toBe(10);
    expect(b(5)).toBe(50);
  });

  it('capped', () => {
    const b = BackoffCalculator.linear(10, 30);
    expect(b(5)).toBe(30);
  });
});

describe('BackoffCalculator — exponential', () => {
  it('exponential growth', () => {
    const b = BackoffCalculator.exponential(100);
    expect(b(1)).toBe(100);
    expect(b(2)).toBe(200);
    expect(b(3)).toBe(400);
  });

  it('capped', () => {
    const b = BackoffCalculator.exponential(100, 500);
    expect(b(10)).toBe(500);
  });
});

describe('BackoffCalculator — polynomial', () => {
  it('polynomial growth', () => {
    const b = BackoffCalculator.polynomial(2, 3);
    expect(b(1)).toBe(2);
    expect(b(2)).toBe(16);
    expect(b(3)).toBe(54);
  });
});

describe('BackoffCalculator — jitter', () => {
  it('full jitter in range', () => {
    const b = BackoffCalculator.fullJitter(1000);
    for (let i = 0; i < 10; i++) {
      const v = b(3);
      // exp(3) = 1000 * 2^2 = 4000
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(4000);
    }
  });

  it('equal jitter in range', () => {
    const b = BackoffCalculator.equalJitter(1000);
    for (let i = 0; i < 10; i++) {
      const v = b(3);
      // exp(3) = 4000, jitter range = [2000, 4000]
      expect(v).toBeGreaterThanOrEqual(2000);
      expect(v).toBeLessThanOrEqual(4000);
    }
  });

  it('decorrelated jitter', () => {
    const b = BackoffCalculator.decorrelatedJitter(100, 10_000);
    const v = b(1, 100);
    expect(v).toBeGreaterThanOrEqual(100);
    expect(v).toBeLessThanOrEqual(10_000);
  });
});

describe('BackoffCalculator — fibonacci', () => {
  it('fib growth', () => {
    const b = BackoffCalculator.fibonacci(10);
    expect(b(1)).toBe(10);
    expect(b(2)).toBe(10);
    expect(b(3)).toBe(20);
    expect(b(4)).toBe(30);
    expect(b(5)).toBe(50);
  });
});
