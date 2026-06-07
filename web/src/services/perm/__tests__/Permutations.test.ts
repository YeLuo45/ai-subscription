/**
 * Permutations.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Permutations } from '../Permutations';

describe('Permutations — all', () => {
  it('all of 3', () => {
    const r = Permutations.all([1, 2, 3]);
    expect(r.length).toBe(6);
  });

  it('all of 0', () => {
    expect(Permutations.all([]).length).toBe(1);
  });

  it('all of 1', () => {
    expect(Permutations.all([1]).length).toBe(1);
  });
});

describe('Permutations — ofLength', () => {
  it('length 2 of 4', () => {
    const r = Permutations.ofLength([1, 2, 3, 4], 2);
    expect(r.length).toBe(12);
  });

  it('length 0', () => {
    expect(Permutations.ofLength([1, 2], 0).length).toBe(1);
  });

  it('length > arr', () => {
    expect(Permutations.ofLength([1, 2], 3).length).toBe(0);
  });
});

describe('Permutations — count', () => {
  it('P(5,3)', () => {
    expect(Permutations.count(5, 3)).toBe(60);
  });

  it('P(5,5)', () => {
    expect(Permutations.count(5)).toBe(120);
  });

  it('P(5,0)', () => {
    expect(Permutations.count(5, 0)).toBe(1);
  });
});

describe('Permutations — next', () => {
  it('next [1,2,3]', () => {
    const a = [1, 2, 3];
    expect(Permutations.next(a)).toBe(true);
    expect(a).toEqual([1, 3, 2]);
  });

  it('iterate [1,2,3]', () => {
    const all = Permutations.iterate([1, 2, 3]);
    expect(all.length).toBe(6);
    expect(all[0]).toEqual([1, 2, 3]);
    expect(all[5]).toEqual([3, 2, 1]);
  });
});
