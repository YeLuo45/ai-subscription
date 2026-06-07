/**
 * PolynomialFit.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { PolynomialFit } from '../PolynomialFit';

describe('PolynomialFit — linear', () => {
  it('perfect linear y = 2x + 1', () => {
    const x = [1, 2, 3, 4, 5];
    const y = [3, 5, 7, 9, 11];
    const r = PolynomialFit.linear(x, y);
    expect(r.a).toBeCloseTo(2, 5);
    expect(r.b).toBeCloseTo(1, 5);
    expect(r.r2).toBeCloseTo(1, 5);
  });

  it('mismatch length', () => {
    expect(() => PolynomialFit.linear([1, 2], [1])).toThrow();
  });
});

describe('PolynomialFit — quadratic', () => {
  it('perfect y = x^2', () => {
    const x = [-2, -1, 0, 1, 2];
    const y = [4, 1, 0, 1, 4];
    const r = PolynomialFit.quadratic(x, y);
    expect(r.a).toBeCloseTo(1, 4);
    expect(r.b).toBeCloseTo(0, 4);
    expect(r.c).toBeCloseTo(0, 4);
  });

  it('not enough points', () => {
    expect(() => PolynomialFit.quadratic([1, 2], [1, 4])).toThrow();
  });
});

describe('PolynomialFit — mean', () => {
  it('mean', () => {
    expect(PolynomialFit.mean([1, 2, 3, 4, 5])).toBe(3);
  });
});
