/**
 * Greedy.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Greedy } from '../Greedy';

describe('Greedy — activity selection', () => {
  it('basic', () => {
    const r = Greedy.activitySelection([1, 3, 0, 5, 8, 5], [2, 4, 6, 7, 9, 9]);
    expect(r.length).toBe(4);
  });

  it('no activity', () => {
    expect(Greedy.activitySelection([], [])).toEqual([]);
  });
});

describe('Greedy — coin', () => {
  it('coin change 41', () => {
    expect(Greedy.coinChangeGreedy(41).reduce((a, b) => a + b, 0)).toBe(41);
  });

  it('coin change 0', () => {
    expect(Greedy.coinChangeGreedy(0)).toEqual([]);
  });
});

describe('Greedy — jump game', () => {
  it('can jump', () => {
    expect(Greedy.canJump([2, 3, 1, 1, 4])).toBe(true);
  });

  it('cannot jump', () => {
    expect(Greedy.canJump([3, 2, 1, 0, 4])).toBe(false);
  });
});

describe('Greedy — scheduling', () => {
  it('min platforms', () => {
    expect(Greedy.minPlatforms([900, 940, 950, 1100, 1500, 1800], [910, 1200, 1120, 1130, 1900, 2000])).toBe(3);
  });
});

describe('Greedy — knapsack', () => {
  it('fractional', () => {
    // values 60,100,120 / weights 10,20,30, capacity 50
    // ratios: 6, 5, 4 -> take all of 0 and 1, then 2/3 of 2
    // 60 + 100 + 120*2/3 = 60+100+80 = 240
    expect(Greedy.fractionalKnapsack([10, 20, 30], [60, 100, 120], 50)).toBeCloseTo(240, 5);
  });
});

describe('Greedy — cookies', () => {
  it('basic', () => {
    expect(Greedy.findContentChildren([1, 2, 3], [1, 1])).toBe(1);
  });

  it('all fed', () => {
    expect(Greedy.findContentChildren([1, 2], [1, 2, 3])).toBe(2);
  });
});
