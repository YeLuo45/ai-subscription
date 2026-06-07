/**
 * Combinations.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Combinations } from '../Combinations';

describe('Combinations — of', () => {
  it('C(4,2)', () => {
    const r = Combinations.of([1, 2, 3, 4], 2);
    expect(r.length).toBe(6);
  });

  it('C(4,0)', () => {
    expect(Combinations.of([1, 2, 3, 4], 0).length).toBe(1);
  });

  it('C(4,4)', () => {
    expect(Combinations.of([1, 2, 3, 4], 4).length).toBe(1);
  });

  it('C(3,5) invalid', () => {
    expect(Combinations.of([1, 2, 3], 5).length).toBe(0);
  });
});

describe('Combinations — count', () => {
  it('C(5,2)', () => {
    expect(Combinations.count(5, 2)).toBe(10);
  });

  it('C(10,3)', () => {
    expect(Combinations.count(10, 3)).toBe(120);
  });

  it('C(0,0)', () => {
    expect(Combinations.count(0, 0)).toBe(1);
  });

  it('C(5,0)', () => {
    expect(Combinations.count(5, 0)).toBe(1);
  });
});

describe('Combinations — powerSet', () => {
  it('powerSet of 3', () => {
    expect(Combinations.powerSet([1, 2, 3]).length).toBe(8);
  });

  it('powerSet empty', () => {
    expect(Combinations.powerSet([]).length).toBe(1);
  });
});

describe('Combinations — repetition', () => {
  it('withRepetition', () => {
    const r = Combinations.withRepetition([1, 2], 3);
    expect(r.length).toBe(4);
  });
});
