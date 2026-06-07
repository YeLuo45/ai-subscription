/**
 * WordBreak.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { WordBreak } from '../WordBreak';

describe('WordBreak — greedy', () => {
  it('fits in one line', () => {
    expect(WordBreak.greedy('hello world', 80)).toEqual(['hello world']);
  });

  it('wraps to two lines', () => {
    const r = WordBreak.greedy('the quick brown fox jumps over the lazy dog', 15);
    expect(r.length).toBeGreaterThan(1);
    for (const l of r) expect(l.length).toBeLessThanOrEqual(15);
  });

  it('preserves empty lines', () => {
    expect(WordBreak.greedy('a\n\nb', 10)).toEqual(['a', '', 'b']);
  });

  it('breaks long words', () => {
    const r = WordBreak.greedy('supercalifragilisticexpialidocious', 10);
    expect(r.length).toBeGreaterThan(1);
  });

  it('width 0 returns input', () => {
    expect(WordBreak.greedy('hello', 0)).toEqual(['hello']);
  });
});

describe('WordBreak — balanced', () => {
  it('returns array', () => {
    expect(Array.isArray(WordBreak.balanced('a b c d', 5))).toBe(true);
  });
});

describe('WordBreak — long word break', () => {
  it('inserts hyphens', () => {
    const r = WordBreak.breakLongWords('abcdefghij', 5, '-');
    expect(r).toBe('abcde-fghij');
  });

  it('short word untouched', () => {
    expect(WordBreak.breakLongWords('hi', 5)).toBe('hi');
  });
});

describe('WordBreak — softHyphen', () => {
  it('inserts soft hyphens', () => {
    const r = WordBreak.softHyphen('abcdefghij', 3);
    expect(r.length).toBeGreaterThan('abcdefghij'.length);
  });

  it('short word untouched', () => {
    expect(WordBreak.softHyphen('hi', 5)).toBe('hi');
  });
});

describe('WordBreak — counts', () => {
  it('wordCount', () => {
    expect(WordBreak.wordCount('hello world foo')).toBe(3);
  });

  it('wordCount empty', () => {
    expect(WordBreak.wordCount('')).toBe(0);
  });

  it('sentenceCount', () => {
    expect(WordBreak.sentenceCount('Hello. World! How?')).toBe(3);
  });
});

describe('WordBreak — chunking', () => {
  it('chunkByWords', () => {
    const r = WordBreak.chunkByWords('a b c d e', 2);
    expect(r).toEqual(['a b', 'c d', 'e']);
  });

  it('truncateWords', () => {
    expect(WordBreak.truncateWords('a b c d e', 3)).toBe('a b c...');
  });

  it('truncateWords short', () => {
    expect(WordBreak.truncateWords('a b', 5)).toBe('a b');
  });
});
