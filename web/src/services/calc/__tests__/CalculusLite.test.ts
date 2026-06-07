/**
 * CalculusLite.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { CalculusLite } from '../CalculusLite';

describe('CalculusLite — derivative', () => {
  it('derivative x^2', () => {
    // x^2 -> 2x
    expect(CalculusLite.derivative([0, 0, 1])).toEqual([0, 2]);
  });

  it('derivative constant', () => {
    // 5 -> 0
    expect(CalculusLite.derivative([5])).toEqual([]);
  });

  it('derivativeAt 3x^2 at x=2', () => {
    // d/dx 3x^2 = 6x -> 6*2 = 12
    expect(CalculusLite.derivativeAt([0, 0, 3], 2)).toBe(12);
  });
});

describe('CalculusLite — integral', () => {
  it('integral x^2', () => {
    // x^2 -> x^3/3
    const i = CalculusLite.integral([0, 0, 1]);
    expect(i[0]).toBe(0);
    expect(i[2]).toBe(0);
    expect(i[3]).toBeCloseTo(1 / 3, 10);
  });

  it('integralDefinite x^2 [0, 3]', () => {
    // 3^3/3 - 0 = 9
    expect(CalculusLite.integralDefinite([0, 0, 1], 0, 3)).toBeCloseTo(9, 10);
  });
});

describe('CalculusLite — critical', () => {
  it('critical of x^2 - 4x + 3', () => {
    // d/dx = 2x - 4, critical at x = 2
    expect(CalculusLite.criticalPoints([3, -4, 1])).toEqual([2]);
  });
});

describe('CalculusLite — limit', () => {
  it('limit sin(x)/x as x->0', () => {
    // -> 1
    expect(CalculusLite.limit((x) => Math.sin(x) / x, 0)).toBeCloseTo(1, 5);
  });
});

describe('CalculusLite — convergence', () => {
  it('converges 1/2^n', () => {
    expect(CalculusLite.converges((n) => 1 / Math.pow(2, n))).toBe(true);
  });

  it('diverges n', () => {
    expect(CalculusLite.converges((n) => n)).toBe(false);
  });
});

describe('CalculusLite — evaluate', () => {
  it('evaluate', () => {
    // 1 + 2x + 3x^2 at x=2 = 1 + 4 + 12 = 17
    expect(CalculusLite.evaluate([1, 2, 3], 2)).toBe(17);
  });
});
