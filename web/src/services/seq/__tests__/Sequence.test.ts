/**
 * Sequence.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Sequence } from '../Sequence';

describe('Sequence — arithmetic', () => {
  it('generate', () => {
    expect(Sequence.arithmetic(1, 2, 5)).toEqual([1, 3, 5, 7, 9]);
  });

  it('sum', () => {
    expect(Sequence.arithmeticSum(1, 1, 10)).toBe(55);
  });

  it('nth', () => {
    expect(Sequence.arithmeticNth(1, 2, 5)).toBe(9);
  });
});

describe('Sequence — geometric', () => {
  it('generate', () => {
    expect(Sequence.geometric(2, 3, 4)).toEqual([2, 6, 18, 54]);
  });

  it('sum', () => {
    expect(Sequence.geometricSum(1, 2, 4)).toBe(15);
  });

  it('sum inf', () => {
    expect(Sequence.geometricSumInf(1, 0.5)).toBe(2);
  });

  it('sum inf divergent', () => {
    expect(Sequence.geometricSumInf(1, 2)).toBeNull();
  });

  it('nth', () => {
    expect(Sequence.geometricNth(2, 3, 4)).toBe(54);
  });
});

describe('Sequence — special', () => {
  it('fibonacci 5', () => {
    expect(Sequence.fibonacci(5)).toEqual([0, 1, 1, 2, 3]);
  });

  it('fibonacci 8', () => {
    expect(Sequence.fibonacci(8)).toEqual([0, 1, 1, 2, 3, 5, 8, 13]);
  });

  it('triangular', () => {
    expect(Sequence.triangular(4)).toEqual([1, 3, 6, 10]);
  });

  it('squares', () => {
    expect(Sequence.squares(4)).toEqual([1, 4, 9, 16]);
  });
});
