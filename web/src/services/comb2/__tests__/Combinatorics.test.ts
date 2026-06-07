/**
 * Combinatorics.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Combinatorics } from '../Combinatorics';

describe('Combinatorics — basic', () => {
  it('factorial', () => {
    expect(Combinatorics.factorial(5)).toBe(120);
  });

  it('perm', () => {
    expect(Combinatorics.perm(5, 2)).toBe(20);
  });

  it('comb', () => {
    expect(Combinatorics.comb(5, 2)).toBe(10);
  });
});

describe('Combinatorics — multinomial', () => {
  it('multinomial', () => {
    // 6! / (2! 2! 2!) = 720 / 8 = 90
    expect(Combinatorics.multinomial(6, [2, 2, 2])).toBe(90);
  });
});

describe('Combinatorics — special', () => {
  it('catalan 0', () => {
    expect(Combinatorics.catalan(0)).toBe(1);
  });

  it('catalan 3', () => {
    expect(Combinatorics.catalan(3)).toBe(5);
  });

  it('catalan 5', () => {
    expect(Combinatorics.catalan(5)).toBe(42);
  });

  it('stirling2 S(3,2)', () => {
    expect(Combinatorics.stirling2(3, 2)).toBe(3);
  });

  it('bell B(3)', () => {
    expect(Combinatorics.bell(3)).toBe(5);
  });

  it('derangement 3', () => {
    // !3 = 2
    expect(Combinatorics.derangement(3)).toBe(2);
  });

  it('derangement 4', () => {
    // !4 = 9
    expect(Combinatorics.derangement(4)).toBe(9);
  });
});

describe('Combinatorics — partitions', () => {
  it('partitions 4', () => {
    // 4 = 4, 3+1, 2+2, 2+1+1, 1+1+1+1 -> 5
    expect(Combinatorics.partitions(4)).toBe(5);
  });

  it('partitions 5', () => {
    expect(Combinatorics.partitions(5)).toBe(7);
  });
});
