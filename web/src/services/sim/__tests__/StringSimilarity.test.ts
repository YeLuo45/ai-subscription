/**
 * StringSimilarity.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { StringSimilarity } from '../StringSimilarity';

describe('StringSimilarity — dice', () => {
  it('identical', () => {
    expect(StringSimilarity.dice('hello', 'hello')).toBe(1);
  });

  it('completely different', () => {
    expect(StringSimilarity.dice('abc', 'xyz')).toBe(0);
  });

  it('similar', () => {
    expect(StringSimilarity.dice('hello', 'helle')).toBeGreaterThan(0.5);
  });

  it('empty / short', () => {
    expect(StringSimilarity.dice('', 'hello')).toBe(0);
    expect(StringSimilarity.dice('a', 'b')).toBe(0);
  });
});

describe('StringSimilarity — jaccard', () => {
  it('identical', () => {
    expect(StringSimilarity.jaccard('hello', 'hello')).toBe(1);
  });

  it('completely different', () => {
    expect(StringSimilarity.jaccard('abc', 'xyz')).toBe(0);
  });

  it('overlap', () => {
    const j = StringSimilarity.jaccard('ab', 'bc');
    expect(j).toBeGreaterThan(0);
    expect(j).toBeLessThan(1);
  });

  it('both empty', () => {
    expect(StringSimilarity.jaccard('', '')).toBe(1);
  });
});

describe('StringSimilarity — cosine', () => {
  it('identical', () => {
    expect(StringSimilarity.cosine('hello', 'hello')).toBe(1);
  });

  it('empty', () => {
    expect(StringSimilarity.cosine('', 'hello')).toBe(0);
  });

  it('overlap', () => {
    const c = StringSimilarity.cosine('hello', 'help');
    expect(c).toBeGreaterThan(0);
    expect(c).toBeLessThan(1);
  });
});

describe('StringSimilarity — levenshtein', () => {
  it('identical', () => {
    expect(StringSimilarity.levenshtein('abc', 'abc')).toBe(0);
  });

  it('one edit', () => {
    expect(StringSimilarity.levenshtein('abc', 'abd')).toBe(1);
  });

  it('kitten/sitting', () => {
    expect(StringSimilarity.levenshtein('kitten', 'sitting')).toBe(3);
  });

  it('empty', () => {
    expect(StringSimilarity.levenshtein('', 'abc')).toBe(3);
  });

  it('levenshteinSim', () => {
    expect(StringSimilarity.levenshteinSim('abc', 'abc')).toBe(1);
    expect(StringSimilarity.levenshteinSim('abc', 'xyz')).toBeLessThan(1);
  });
});

describe('StringSimilarity — findBestMatch', () => {
  it('exact', () => {
    const r = StringSimilarity.findBestMatch('hello', ['world', 'hello', 'foo']);
    expect(r.match).toBe('hello');
  });

  it('partial', () => {
    const r = StringSimilarity.findBestMatch('hello', ['help', 'hell', 'world']);
    expect(['help', 'hell']).toContain(r.match);
  });
});
