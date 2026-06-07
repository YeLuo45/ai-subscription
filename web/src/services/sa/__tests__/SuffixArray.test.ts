/**
 * SuffixArray.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { SuffixArray } from '../SuffixArray';

describe('SuffixArray — build', () => {
  it('builds sorted suffixes', () => {
    const sa = new SuffixArray();
    sa.build('banana');
    const arr = sa.array;
    expect(arr.length).toBe(6);
    for (let i = 0; i < arr.length; i++) {
      const suf = 'banana'.slice(arr[i]);
      if (i > 0) {
        const prev = 'banana'.slice(arr[i - 1]);
        expect(suf >= prev).toBe(true);
      }
    }
  });
});

describe('SuffixArray — findAll', () => {
  it('finds all occurrences', () => {
    const sa = new SuffixArray();
    sa.build('abcabc');
    const r = sa.findAll('abc');
    expect(r).toEqual([0, 3]);
  });

  it('finds no match', () => {
    const sa = new SuffixArray();
    sa.build('abc');
    expect(sa.findAll('xyz')).toEqual([]);
  });

  it('finds single char', () => {
    const sa = new SuffixArray();
    sa.build('aab');
    const r = sa.findAll('a');
    expect(r).toEqual([0, 1]);
  });
});

describe('SuffixArray — count/contains', () => {
  it('count', () => {
    const sa = new SuffixArray();
    sa.build('aaaa');
    expect(sa.count('a')).toBe(4);
  });

  it('contains', () => {
    const sa = new SuffixArray();
    sa.build('hello');
    expect(sa.contains('ell')).toBe(true);
    expect(sa.contains('xyz')).toBe(false);
  });
});

describe('SuffixArray — LRS', () => {
  it('longest repeated substring', () => {
    const sa = new SuffixArray();
    sa.build('banana');
    const r = sa.longestRepeatedSubstring();
    expect(['ana', 'na']).toContain(r.text);
  });

  it('no repetition', () => {
    const sa = new SuffixArray();
    sa.build('abc');
    expect(sa.longestRepeatedSubstring().length).toBe(0);
  });
});

describe('SuffixArray — empty', () => {
  it('empty text', () => {
    const sa = new SuffixArray();
    sa.build('');
    expect(sa.findAll('x')).toEqual([]);
  });
});
