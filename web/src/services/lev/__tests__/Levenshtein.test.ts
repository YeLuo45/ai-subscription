/**
 * Levenshtein.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Levenshtein } from '../Levenshtein';

describe('Levenshtein — distance', () => {
  it('identical', () => {
    expect(Levenshtein.distance('abc', 'abc')).toBe(0);
  });

  it('one substitution', () => {
    expect(Levenshtein.distance('abc', 'abd')).toBe(1);
  });

  it('kitten/sitting = 3', () => {
    expect(Levenshtein.distance('kitten', 'sitting')).toBe(3);
  });

  it('empty', () => {
    expect(Levenshtein.distance('', 'abc')).toBe(3);
    expect(Levenshtein.distance('abc', '')).toBe(3);
  });

  it('completely different', () => {
    expect(Levenshtein.distance('abc', 'xyz')).toBe(3);
  });
});

describe('Levenshtein — damerau', () => {
  it('transposition 1', () => {
    expect(Levenshtein.damerau('ab', 'ba')).toBe(1);
  });

  it('no transposition classic', () => {
    expect(Levenshtein.damerau('kitten', 'sitting')).toBe(3);
  });

  it('CA-ABC transpositions', () => {
    // CA → ABC: insert B between, distance 2
    expect(Levenshtein.damerau('CA', 'ABC')).toBeGreaterThanOrEqual(2);
  });
});

describe('Levenshtein — similarity', () => {
  it('identical', () => {
    expect(Levenshtein.similarity('abc', 'abc')).toBe(1);
  });

  it('empty both', () => {
    expect(Levenshtein.similarity('', '')).toBe(1);
  });

  it('partial', () => {
    const s = Levenshtein.similarity('abc', 'abd');
    expect(s).toBeGreaterThan(0);
    expect(s).toBeLessThan(1);
  });
});

describe('Levenshtein — within', () => {
  it('within 1', () => {
    expect(Levenshtein.within('abc', 'abd', 1)).toBe(true);
  });

  it('not within 1', () => {
    expect(Levenshtein.within('abc', 'xyz', 1)).toBe(false);
  });

  it('length diff', () => {
    expect(Levenshtein.within('a', 'abcdef', 2)).toBe(false);
  });
});

describe('Levenshtein — backtrace', () => {
  it('match all', () => {
    const ops = Levenshtein.backtrace('abc', 'abc');
    expect(ops.every((o) => o.op === 'match')).toBe(true);
  });

  it('substitution', () => {
    const ops = Levenshtein.backtrace('abc', 'abd');
    expect(ops.some((o) => o.op === 'substitute')).toBe(true);
  });

  it('insert', () => {
    const ops = Levenshtein.backtrace('abc', 'abcd');
    expect(ops.some((o) => o.op === 'insert')).toBe(true);
  });

  it('delete', () => {
    const ops = Levenshtein.backtrace('abcd', 'abc');
    expect(ops.some((o) => o.op === 'delete')).toBe(true);
  });
});
