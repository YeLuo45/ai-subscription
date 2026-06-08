/**
 * DP.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { DP } from '../DP';

describe('DP — basic', () => {
  it('fib 10', () => {
    expect(DP.fib(10)).toBe(55);
  });

  it('climbStairs', () => {
    expect(DP.climbStairs(5)).toBe(8);
  });

  it('maxSubarray', () => {
    expect(DP.maxSubarray([-2, 1, -3, 4, -1, 2, 1, -5, 4])).toBe(6);
  });
});

describe('DP — strings', () => {
  it('lcs', () => {
    expect(DP.lcs('abcde', 'ace')).toBe(3);
  });

  it('editDistance', () => {
    expect(DP.editDistance('kitten', 'sitting')).toBe(3);
  });
});

describe('DP — sequences', () => {
  it('lis', () => {
    expect(DP.lis([10, 9, 2, 5, 3, 7, 101, 18])).toBe(4);
  });
});

describe('DP — knapsack/coin', () => {
  it('knapsack', () => {
    // 3 items, capacity 5
    // weights [2, 3, 4], values [3, 4, 5]
    // Best: 3+4 = 7 (weight 5)
    expect(DP.knapsack([2, 3, 4], [3, 4, 5], 5)).toBe(7);
  });

  it('coinChange min', () => {
    expect(DP.coinChange([1, 2, 5], 11)).toBe(3);
  });

  it('coinChangeWays', () => {
    // amount 5, coins [1,2,5] -> 4 ways
    expect(DP.coinChangeWays([1, 2, 5], 5)).toBe(4);
  });

  it('coinChange impossible', () => {
    expect(DP.coinChange([2], 3)).toBe(-1);
  });
});
