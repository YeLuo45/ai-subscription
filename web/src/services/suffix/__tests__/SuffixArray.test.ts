/**
 * SuffixArray.test.ts — Pure unit tests for suffix array
 */

import { describe, it, expect } from 'vitest';
import { SuffixArray } from '../SuffixArray';

describe('SuffixArray — build', () => {
  it('builds from text', () => {
    const sa = new SuffixArray('banana');
    const arr = sa.getArray();
    // Suffixes sorted: a, ana, anana, banana, na, nana
    // Positions: 5, 3, 1, 0, 4, 2
    expect(arr).toEqual([5, 3, 1, 0, 4, 2]);
  });

  it('empty text', () => {
    const sa = new SuffixArray('');
    expect(sa.getArray()).toEqual([]);
  });

  it('rebuild with new text', () => {
    const sa = new SuffixArray('abc');
    sa.build('xyz');
    expect(sa.suffixAt(0)).toBe('xyz');
  });
});

describe('SuffixArray — search', () => {
  it('finds single occurrence', () => {
    const sa = new SuffixArray('hello world');
    const r = sa.search('world');
    expect(r).toEqual([6]);
  });

  it('finds multiple occurrences', () => {
    const sa = new SuffixArray('aaaa');
    const r = sa.search('aa');
    expect(r.sort()).toEqual([0, 1, 2]);
  });

  it('returns empty for missing', () => {
    const sa = new SuffixArray('hello');
    expect(sa.search('xyz')).toEqual([]);
  });

  it('search empty pattern', () => {
    const sa = new SuffixArray('hello');
    expect(sa.search('')).toEqual([]);
  });
});

describe('SuffixArray — suffixAt', () => {
  it('returns suffix at index', () => {
    const sa = new SuffixArray('banana');
    expect(sa.suffixAt(0)).toBe('a');
    expect(sa.suffixAt(1)).toBe('ana');
    expect(sa.suffixAt(2)).toBe('anana');
  });
});

describe('SuffixArray — LRS', () => {
  it('finds longest repeated substring', () => {
    const sa = new SuffixArray('banana');
    const lrs = sa.longestRepeatedSubstring();
    expect(lrs.substring).toBe('ana');
    expect(lrs.length).toBe(3);
  });

  it('no repeat', () => {
    const sa = new SuffixArray('abc');
    const lrs = sa.longestRepeatedSubstring();
    expect(lrs.length).toBe(0);
  });

  it('finds LRS in longer text', () => {
    const sa = new SuffixArray('abracadabra');
    const lrs = sa.longestRepeatedSubstring();
    // 'abra' is the LRS with length 4
    expect(lrs.length).toBe(4);
  });
});

describe('SuffixArray — LCP', () => {
  it('LCP for banana', () => {
    const sa = new SuffixArray('banana');
    // SA: [5, 3, 1, 0, 4, 2]
    // Suffixes: a, ana, anana, banana, na, nana
    // LCPs: 1 (a is prefix of ana), 3, 0, 0, 2
    expect(sa.lcpArray()).toEqual([1, 3, 0, 0, 2]);
  });
});

describe('SuffixArray — size', () => {
  it('reports size', () => {
    const sa = new SuffixArray('hello');
    expect(sa.size()).toBeGreaterThan(0);
  });
});
