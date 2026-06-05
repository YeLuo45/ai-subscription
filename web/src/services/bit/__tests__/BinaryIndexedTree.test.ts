/**
 * BinaryIndexedTree.test.ts — Pure unit tests for Fenwick tree
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BinaryIndexedTree } from '../BinaryIndexedTree';

describe('BinaryIndexedTree — basic', () => {
  let bit: BinaryIndexedTree;
  beforeEach(() => { bit = new BinaryIndexedTree(10); });

  it('starts with all zeros', () => {
    expect(bit.prefixSum(5)).toBe(0);
    expect(bit.rangeSum(1, 10)).toBe(0);
  });

  it('updates single element', () => {
    bit.update(3, 5);
    expect(bit.rangeSum(1, 10)).toBe(5);
    expect(bit.rangeSum(3, 3)).toBe(5);
  });

  it('cumulative updates', () => {
    bit.update(1, 3);
    bit.update(2, 4);
    bit.update(3, 5);
    expect(bit.prefixSum(1)).toBe(3);
    expect(bit.prefixSum(2)).toBe(7);
    expect(bit.prefixSum(3)).toBe(12);
  });

  it('range sum', () => {
    for (let i = 1; i <= 10; i++) bit.update(i, i);
    expect(bit.rangeSum(1, 10)).toBe(55);
    expect(bit.rangeSum(3, 7)).toBe(3 + 4 + 5 + 6 + 7);
  });
});

describe('BinaryIndexedTree — from array', () => {
  it('builds from array', () => {
    const bit = BinaryIndexedTree.from([1, 2, 3, 4, 5]);
    expect(bit.prefixSum(5)).toBe(15);
    expect(bit.rangeSum(2, 4)).toBe(9);
  });

  it('build and update', () => {
    const bit = BinaryIndexedTree.from([1, 2, 3, 4, 5]);
    bit.update(3, 10); // 3 -> 13
    expect(bit.rangeSum(1, 5)).toBe(25);
  });
});

describe('BinaryIndexedTree — set', () => {
  it('set value', () => {
    const bit = BinaryIndexedTree.from([1, 2, 3, 4, 5]);
    bit.set(3, 100);
    expect(bit.rangeSum(1, 5)).toBe(112);
  });
});

describe('BinaryIndexedTree — lower bound', () => {
  it('finds lower bound', () => {
    const bit = BinaryIndexedTree.from([3, 4, 5, 6, 7, 8, 9, 10]);
    // Prefix sums: 3, 7, 12, 18, 25, 33, 42, 52
    expect(bit.lowerBound(1)).toBe(1);
    expect(bit.lowerBound(3)).toBe(1);
    expect(bit.lowerBound(5)).toBe(2);
    expect(bit.lowerBound(13)).toBe(4);
    expect(bit.lowerBound(100)).toBe(9); // beyond last
  });
});

describe('BinaryIndexedTree — inversion count', () => {
  it('counts inversions', () => {
    const arr = [3, 1, 2, 5, 4];
    // Inversions: (3,1), (3,2), (5,4) = 3
    const bit = new BinaryIndexedTree(arr.length);
    let inv = 0;
    for (let i = arr.length - 1; i >= 0; i--) {
      inv += bit.prefixSum(arr[i] - 1);
      bit.update(arr[i], 1);
    }
    expect(inv).toBe(3);
  });
});

describe('BinaryIndexedTree — error cases', () => {
  it('throws on out of range', () => {
    const bit = new BinaryIndexedTree(5);
    expect(() => bit.update(0, 1)).toThrow();
    expect(() => bit.update(6, 1)).toThrow();
  });
});
