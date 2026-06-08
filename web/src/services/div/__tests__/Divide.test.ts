/**
 * Divide.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Divide } from '../Divide';

describe('Divide — max subarray', () => {
  it('basic', () => {
    expect(Divide.maxSubarray([-2, 1, -3, 4, -1, 2, 1, -5, 4])).toBe(6);
  });

  it('all negative', () => {
    expect(Divide.maxSubarray([-3, -1, -2])).toBe(-1);
  });

  it('single', () => {
    expect(Divide.maxSubarray([5])).toBe(5);
  });
});

describe('Divide — closest pair', () => {
  it('basic', () => {
    expect(Divide.closestPair([
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 5, y: 5 }, { x: 3, y: 3 },
    ])).toBe(1);
  });
});

describe('Divide — power', () => {
  it('basic', () => {
    expect(Divide.power(2, 10)).toBe(1024);
  });

  it('zero', () => {
    expect(Divide.power(2, 0)).toBe(1);
  });

  it('negative exp', () => {
    expect(Divide.power(2, -1)).toBe(0.5);
  });
});

describe('Divide — matMul', () => {
  it('basic', () => {
    const r = Divide.matMul([[1, 2], [3, 4]], [[5, 6], [7, 8]]);
    expect(r[0][0]).toBe(19);
    expect(r[1][1]).toBe(50);
  });
});

describe('Divide — skyline', () => {
  it('simple', () => {
    const s = Divide.skyline([[2, 9, 10], [3, 7, 15], [5, 12, 12]]);
    expect(s.length).toBeGreaterThan(0);
  });
});
