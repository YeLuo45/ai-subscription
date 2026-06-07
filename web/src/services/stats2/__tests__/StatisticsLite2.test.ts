/**
 * StatisticsLite2.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { StatisticsLite2 } from '../StatisticsLite2';

describe('StatisticsLite2 — moments', () => {
  it('skewness symmetric', () => {
    expect(StatisticsLite2.skewness([1, 2, 3, 4, 5])).toBeCloseTo(0, 5);
  });

  it('kurtosis symmetric', () => {
    // uniform distribution has negative excess kurtosis
    const k = StatisticsLite2.kurtosis([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(k).toBeLessThan(0);
  });
});

describe('StatisticsLite2 — cov/var', () => {
  it('covariance linear', () => {
    // y = 2x -> cov = 2 * var(x)
    const x = [1, 2, 3, 4, 5];
    const y = x.map((v) => 2 * v);
    const varX = x.reduce((a, b) => a + (b - x.reduce((s, n) => s + n, 0) / x.length) ** 2, 0) / x.length;
    expect(StatisticsLite2.covariance(x, y)).toBeCloseTo(varX * 2, 5);
  });

  it('sample variance', () => {
    // sample var of [1,2,3,4,5] = 2.5
    expect(StatisticsLite2.varianceSample([1, 2, 3, 4, 5])).toBe(2.5);
  });

  it('sample covariance', () => {
    const x = [1, 2, 3, 4, 5];
    const y = x.map((v) => 2 * v);
    const c = StatisticsLite2.covarianceSample(x, y);
    expect(c).toBeCloseTo(StatisticsLite2.varianceSample(x) * 2, 5);
  });
});

describe('StatisticsLite2 — quartiles', () => {
  it('quartiles 1-10', () => {
    const q = StatisticsLite2.quartiles([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(q.q2).toBe(5.5);
  });

  it('iqr', () => {
    expect(StatisticsLite2.iqr([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])).toBe(4.5);
  });

  it('outliers', () => {
    const o = StatisticsLite2.outliers([1, 2, 3, 4, 5, 100]);
    expect(o).toContain(100);
  });
});

describe('StatisticsLite2 — normalize', () => {
  it('minMax', () => {
    const r = StatisticsLite2.minMax([1, 2, 3, 4, 5]);
    expect(r[0]).toBe(0);
    expect(r[4]).toBe(1);
  });

  it('minMax equal', () => {
    expect(StatisticsLite2.minMax([5, 5, 5])).toEqual([0, 0, 0]);
  });
});
