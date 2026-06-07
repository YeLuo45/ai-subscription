/**
 * StatisticsLite.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { StatisticsLite as S } from '../StatisticsLite';

describe('StatisticsLite — basic', () => {
  it('sum', () => {
    expect(S.sum([1, 2, 3, 4])).toBe(10);
  });

  it('mean', () => {
    expect(S.mean([1, 2, 3, 4])).toBe(2.5);
  });

  it('median odd', () => {
    expect(S.median([1, 2, 3, 4, 5])).toBe(3);
  });

  it('median even', () => {
    expect(S.median([1, 2, 3, 4])).toBe(2.5);
  });

  it('empty mean', () => {
    expect(S.mean([])).toBe(0);
  });
});

describe('StatisticsLite — mode', () => {
  it('single mode', () => {
    expect(S.mode([1, 2, 2, 3])).toEqual([2]);
  });

  it('multimodal', () => {
    const m = S.mode([1, 1, 2, 2]);
    expect(m.sort()).toEqual([1, 2]);
  });

  it('no mode', () => {
    expect(S.mode([1, 2, 3])).toEqual([]);
  });
});

describe('StatisticsLite — spread', () => {
  it('variance', () => {
    expect(S.variance([1, 2, 3, 4, 5])).toBeCloseTo(2, 5);
  });

  it('stdev', () => {
    expect(S.stdev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.0, 0);
  });
});

describe('StatisticsLite — summary', () => {
  it('summary', () => {
    const s = S.summary([1, 2, 3, 4, 5]);
    expect(s.min).toBe(1);
    expect(s.max).toBe(5);
    expect(s.count).toBe(5);
  });
});

describe('StatisticsLite — advanced', () => {
  it('percentile 50', () => {
    expect(S.percentile([1, 2, 3, 4, 5], 50)).toBe(3);
  });

  it('percentile 0', () => {
    expect(S.percentile([1, 2, 3, 4, 5], 0)).toBe(1);
  });

  it('zscore', () => {
    const z = S.zscore([1, 2, 3, 4, 5]);
    expect(z.length).toBe(5);
  });

  it('correlation', () => {
    expect(S.correlation([1, 2, 3, 4], [2, 4, 6, 8])).toBeCloseTo(1, 5);
  });

  it('correlation negative', () => {
    expect(S.correlation([1, 2, 3, 4], [4, 3, 2, 1])).toBeCloseTo(-1, 5);
  });
});
