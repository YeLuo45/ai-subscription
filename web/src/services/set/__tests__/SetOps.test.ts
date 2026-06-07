/**
 * SetOps.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { SetOps } from '../SetOps';

describe('SetOps — basic', () => {
  it('union', () => {
    expect(SetOps.union([1, 2, 3], [3, 4, 5]).sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('intersection', () => {
    expect(SetOps.intersection([1, 2, 3], [2, 3, 4])).toEqual([2, 3]);
  });

  it('difference', () => {
    expect(SetOps.difference([1, 2, 3], [2, 3])).toEqual([1]);
  });

  it('symmetricDifference', () => {
    expect(SetOps.symmetricDifference([1, 2], [2, 3]).sort()).toEqual([1, 3]);
  });
});

describe('SetOps — checks', () => {
  it('isSubset true', () => {
    expect(SetOps.isSubset([1, 2], [1, 2, 3])).toBe(true);
  });

  it('isSubset false', () => {
    expect(SetOps.isSubset([1, 4], [1, 2, 3])).toBe(false);
  });

  it('isSuperset', () => {
    expect(SetOps.isSuperset([1, 2, 3], [1, 2])).toBe(true);
  });

  it('isDisjoint', () => {
    expect(SetOps.isDisjoint([1, 2], [3, 4])).toBe(true);
    expect(SetOps.isDisjoint([1, 2], [2, 3])).toBe(false);
  });

  it('equals', () => {
    expect(SetOps.equals([1, 2], [2, 1])).toBe(true);
  });
});

describe('SetOps — util', () => {
  it('unique', () => {
    expect(SetOps.unique([1, 2, 2, 3])).toEqual([1, 2, 3]);
  });

  it('cartesian', () => {
    const r = SetOps.cartesian([1, 2], ['a', 'b']);
    expect(r.length).toBe(4);
  });
});
