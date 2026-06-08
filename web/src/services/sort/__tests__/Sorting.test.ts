/**
 * Sorting.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Sorting } from '../Sorting';

describe('Sorting — basic', () => {
  it('bubble', () => {
    expect(Sorting.bubble([3, 1, 4, 1, 5, 9, 2, 6])).toEqual([1, 1, 2, 3, 4, 5, 6, 9]);
  });

  it('selection', () => {
    expect(Sorting.selection([3, 1, 4, 1, 5])).toEqual([1, 1, 3, 4, 5]);
  });

  it('insertion', () => {
    expect(Sorting.insertion([3, 1, 4, 1, 5])).toEqual([1, 1, 3, 4, 5]);
  });

  it('empty', () => {
    expect(Sorting.merge([])).toEqual([]);
    expect(Sorting.quick([])).toEqual([]);
  });
});

describe('Sorting — recursive', () => {
  it('merge', () => {
    expect(Sorting.merge([3, 1, 4, 1, 5, 9, 2, 6])).toEqual([1, 1, 2, 3, 4, 5, 6, 9]);
  });

  it('quick', () => {
    expect(Sorting.quick([3, 1, 4, 1, 5, 9, 2, 6])).toEqual([1, 1, 2, 3, 4, 5, 6, 9]);
  });

  it('heap', () => {
    expect(Sorting.heap([3, 1, 4, 1, 5, 9, 2, 6])).toEqual([1, 1, 2, 3, 4, 5, 6, 9]);
  });
});

describe('Sorting — features', () => {
  it('reverse order', () => {
    expect(Sorting.merge([5, 4, 3, 2, 1])).toEqual([1, 2, 3, 4, 5]);
  });

  it('already sorted', () => {
    expect(Sorting.quick([1, 2, 3, 4, 5])).toEqual([1, 2, 3, 4, 5]);
  });

  it('duplicates', () => {
    expect(Sorting.heap([2, 2, 2, 1, 1])).toEqual([1, 1, 2, 2, 2]);
  });

  it('single element', () => {
    expect(Sorting.bubble([1])).toEqual([1]);
  });
});
