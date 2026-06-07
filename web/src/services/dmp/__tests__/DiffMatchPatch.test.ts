/**
 * DiffMatchPatch.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { DiffMatchPatch } from '../DiffMatchPatch';

describe('DiffMatchPatch — basic', () => {
  it('identical', () => {
    const r = DiffMatchPatch.diff('abc', 'abc');
    expect(r[0].op).toBe('equal');
  });

  it('empty a', () => {
    const r = DiffMatchPatch.diff('', 'abc');
    expect(r[0].op).toBe('insert');
    expect(r[0].text).toBe('abc');
  });

  it('empty b', () => {
    const r = DiffMatchPatch.diff('abc', '');
    expect(r[0].op).toBe('delete');
    expect(r[0].text).toBe('abc');
  });

  it('single char diff', () => {
    const r = DiffMatchPatch.diff('abc', 'axc');
    expect(r.length).toBeGreaterThan(0);
    const stats = DiffMatchPatch.stats(r);
    expect(stats.delete + stats.insert).toBe(2);
  });
});

describe('DiffMatchPatch — stats', () => {
  it('counts', () => {
    const r = DiffMatchPatch.diff('hello', 'world');
    const s = DiffMatchPatch.stats(r);
    expect(s.insert + s.delete).toBeGreaterThan(0);
  });
});

describe('DiffMatchPatch — patch', () => {
  it('apply to reconstruct b', () => {
    const a = 'hello world';
    const b = 'hello there';
    const r = DiffMatchPatch.diff(a, b);
    expect(DiffMatchPatch.patch(a, r)).toBe(b);
  });

  it('apply to reconstruct a from b', () => {
    const a = 'hello world';
    const b = 'hello there';
    const r = DiffMatchPatch.diff(a, b);
    const reverse: typeof r = r.map((d) => ({ op: d.op === 'insert' ? 'delete' : d.op === 'delete' ? 'insert' : 'equal', text: d.text }));
    expect(DiffMatchPatch.patch(b, reverse)).toBe(a);
  });
});

describe('DiffMatchPatch — similarity', () => {
  it('identical = 1', () => {
    expect(DiffMatchPatch.similarity('abc', 'abc')).toBe(1);
  });

  it('different = less than 1', () => {
    expect(DiffMatchPatch.similarity('abc', 'xyz')).toBeLessThan(1);
  });

  it('empty = 1', () => {
    expect(DiffMatchPatch.similarity('', '')).toBe(1);
  });
});

describe('DiffMatchPatch — levenshtein', () => {
  it('identical = 0', () => {
    expect(DiffMatchPatch.levenshtein('abc', 'abc')).toBe(0);
  });

  it('one char diff', () => {
    expect(DiffMatchPatch.levenshtein('abc', 'axc')).toBe(2);
  });
});

describe('DiffMatchPatch — cleanup', () => {
  it('merge adjacent', () => {
    const r = DiffMatchPatch.diff('aabbcc', 'aacc');
    const cleaned = DiffMatchPatch.cleanupMerge(r);
    for (let i = 0; i < cleaned.length - 1; i++) {
      expect(cleaned[i].op).not.toBe(cleaned[i + 1].op);
    }
  });
});
