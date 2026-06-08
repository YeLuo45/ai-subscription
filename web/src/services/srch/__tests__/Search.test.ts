/**
 * Search.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Search } from '../Search';

describe('Search — linear', () => {
  it('find', () => {
    expect(Search.linear([1, 2, 3, 4, 5], 3)).toBe(2);
  });

  it('missing', () => {
    expect(Search.linear([1, 2, 3], 99)).toBe(-1);
  });
});

describe('Search — binary', () => {
  it('find', () => {
    expect(Search.binary([1, 2, 3, 4, 5], 3)).toBe(2);
  });

  it('missing', () => {
    expect(Search.binary([1, 2, 3, 4, 5], 99)).toBe(-1);
  });

  it('recursive', () => {
    expect(Search.binaryRecursive([1, 2, 3, 4, 5], 4)).toBe(3);
  });
});

describe('Search — bounds', () => {
  it('lowerBound', () => {
    expect(Search.lowerBound([1, 2, 4, 5, 6], 4)).toBe(2);
  });

  it('upperBound', () => {
    expect(Search.upperBound([1, 2, 4, 4, 4, 5], 4)).toBe(5);
  });

  it('findAll', () => {
    expect(Search.findAll([1, 2, 3, 3, 3, 4], 3)).toEqual([2, 3, 4]);
  });
});

describe('Search — variants', () => {
  it('jump', () => {
    expect(Search.jump([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 7)).toBe(6);
  });

  it('interpolation', () => {
    expect(Search.interpolation([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 7)).toBe(6);
  });

  it('interpolation missing', () => {
    expect(Search.interpolation([1, 2, 3, 4, 5], 99)).toBe(-1);
  });
});
