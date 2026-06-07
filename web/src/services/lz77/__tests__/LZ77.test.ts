/**
 * LZ77.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { LZ77 } from '../LZ77';

describe('LZ77 — basic', () => {
  it('empty', () => {
    const r = LZ77.compress('');
    expect(r).toEqual([]);
  });

  it('single char', () => {
    const r = LZ77.compress('a');
    expect(r.length).toBe(1);
  });

  it('roundtrip', () => {
    const s = 'hello world';
    expect(LZ77.roundtrip(s)).toBe(s);
  });

  it('repeated substring', () => {
    const s = 'abcabcabcabc';
    expect(LZ77.roundtrip(s)).toBe(s);
  });

  it('long repeated', () => {
    const s = 'a'.repeat(20);
    expect(LZ77.roundtrip(s)).toBe(s);
  });

  it('mixed', () => {
    const s = 'the quick brown fox jumps over the lazy dog';
    expect(LZ77.roundtrip(s)).toBe(s);
  });
});

describe('LZ77 — tokens', () => {
  it('repeated yields match', () => {
    const tokens = LZ77.compress('abcabc');
    const hasMatch = tokens.some((t) => t.length > 0);
    expect(hasMatch).toBe(true);
  });

  it('size', () => {
    const tokens = LZ77.compress('hello');
    expect(LZ77.size(tokens)).toBe(tokens.length);
  });
});

describe('LZ77 — ratio', () => {
  it('ratio empty', () => {
    expect(LZ77.ratio('')).toBe(0);
  });

  it('repeated has low ratio', () => {
    expect(LZ77.ratio('a'.repeat(20))).toBeLessThan(0.5);
  });
});
