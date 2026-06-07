/**
 * DeflateLite.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { DeflateLite } from '../DeflateLite';

describe('DeflateLite — basic', () => {
  it('empty', () => {
    const r = DeflateLite.roundtrip('');
    expect(r).toBe('');
  });

  it('single char', () => {
    expect(DeflateLite.roundtrip('a')).toBe('a');
  });

  it('short string', () => {
    expect(DeflateLite.roundtrip('hello')).toBe('hello');
  });

  it('long string', () => {
    const s = 'the quick brown fox jumps over the lazy dog';
    expect(DeflateLite.roundtrip(s)).toBe(s);
  });

  it('repeated pattern', () => {
    const s = 'abcabcabcabcabcabc';
    expect(DeflateLite.roundtrip(s)).toBe(s);
  });

  it('unicode', () => {
    const s = '你好世界 hello world';
    expect(DeflateLite.roundtrip(s)).toBe(s);
  });
});

describe('DeflateLite — ratio', () => {
  it('ratio < 1 for repeated', () => {
    expect(DeflateLite.ratio('a'.repeat(50))).toBeLessThan(1);
  });

  it('empty ratio', () => {
    expect(DeflateLite.ratio('')).toBe(0);
  });
});

describe('DeflateLite — size', () => {
  it('size', () => {
    const enc = DeflateLite.compress('hello');
    expect(DeflateLite.size(enc)).toBeGreaterThanOrEqual(0);
  });
});

describe('DeflateLite — pipeline', () => {
  it('returns tokens', () => {
    const enc = DeflateLite.compress('abcabc');
    expect(enc.tokens.length).toBeGreaterThan(0);
  });
});
