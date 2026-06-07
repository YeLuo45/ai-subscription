/**
 * EditDistance2.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { EditDistance2 } from '../EditDistance2';

describe('EditDistance2 — levenshtein', () => {
  it('identical', () => {
    expect(EditDistance2.levenshtein('abc', 'abc')).toBe(0);
  });

  it('one insert', () => {
    expect(EditDistance2.levenshtein('abc', 'abcd')).toBe(1);
  });

  it('one delete', () => {
    expect(EditDistance2.levenshtein('abcd', 'abc')).toBe(1);
  });

  it('one replace', () => {
    expect(EditDistance2.levenshtein('abc', 'axc')).toBe(1);
  });

  it('kitten -> sitting = 3', () => {
    expect(EditDistance2.levenshtein('kitten', 'sitting')).toBe(3);
  });

  it('empty', () => {
    expect(EditDistance2.levenshtein('', 'abc')).toBe(3);
  });
});

describe('EditDistance2 — damerau', () => {
  it('transposition', () => {
    expect(EditDistance2.damerau('ab', 'ba')).toBe(1);  // single transpose
  });

  it('no transposition needed', () => {
    expect(EditDistance2.damerau('abc', 'abc')).toBe(0);
  });

  it('replaces', () => {
    expect(EditDistance2.damerau('abc', 'def')).toBe(3);
  });
});

describe('EditDistance2 — hamming', () => {
  it('distance 3', () => {
    expect(EditDistance2.hamming('karolin', 'kathrin')).toBe(3);
  });

  it('identical', () => {
    expect(EditDistance2.hamming('abc', 'abc')).toBe(0);
  });

  it('different length', () => {
    expect(() => EditDistance2.hamming('abc', 'abcd')).toThrow();
  });
});

describe('EditDistance2 — jaro', () => {
  it('identical', () => {
    expect(EditDistance2.jaro('abc', 'abc')).toBe(1);
  });

  it('different', () => {
    expect(EditDistance2.jaro('abc', 'xyz')).toBe(0);
  });
});

describe('EditDistance2 — jaroWinkler', () => {
  it('prefix bonus', () => {
    const jw = EditDistance2.jaroWinkler('MARTHA', 'MARHTA');
    const j = EditDistance2.jaro('MARTHA', 'MARHTA');
    expect(jw).toBeGreaterThan(j);
  });

  it('identical', () => {
    expect(EditDistance2.jaroWinkler('abc', 'abc')).toBe(1);
  });
});

describe('EditDistance2 — osa', () => {
  it('identical', () => {
    expect(EditDistance2.osa('abc', 'abc')).toBe(0);
  });

  it('single replace', () => {
    expect(EditDistance2.osa('abc', 'axc')).toBe(1);
  });

  it('insert + delete', () => {
    expect(EditDistance2.osa('abc', 'abcd')).toBe(1);
  });
});
