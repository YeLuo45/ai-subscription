/**
 * FenwickTree.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { FenwickTree } from '../FenwickTree';

describe('FenwickTree — basic', () => {
  it('fromArray', () => {
    const ft = FenwickTree.fromArray([1, 2, 3, 4, 5]);
    expect(ft.query(5)).toBe(15);
  });

  it('prefix sum', () => {
    const ft = FenwickTree.fromArray([1, 2, 3, 4, 5]);
    expect(ft.query(3)).toBe(6);
  });

  it('range query', () => {
    const ft = FenwickTree.fromArray([1, 2, 3, 4, 5]);
    expect(ft.rangeQuery(2, 4)).toBe(9);
  });
});

describe('FenwickTree — update', () => {
  it('point update', () => {
    const ft = FenwickTree.fromArray([1, 2, 3, 4, 5]);
    ft.update(3, 10); // arr[2] += 10
    expect(ft.query(3)).toBe(16);
  });

  it('multiple updates', () => {
    const ft = FenwickTree.fromArray([0, 0, 0, 0, 0]);
    ft.update(1, 1);
    ft.update(2, 2);
    ft.update(3, 3);
    expect(ft.query(3)).toBe(6);
  });
});

describe('FenwickTree — constructor', () => {
  it('empty size', () => {
    const ft = new FenwickTree(10);
    expect(ft.size()).toBe(10);
    expect(ft.query(10)).toBe(0);
  });
});
