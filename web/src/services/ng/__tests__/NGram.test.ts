/**
 * NGram.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { NGram } from '../NGram';

describe('NGram — words', () => {
  it('bigrams', () => {
    expect(NGram.words('the quick brown fox', 2)).toEqual([
      ['the', 'quick'],
      ['quick', 'brown'],
      ['brown', 'fox'],
    ]);
  });

  it('trigrams', () => {
    expect(NGram.words('a b c d', 3)).toEqual([
      ['a', 'b', 'c'],
      ['b', 'c', 'd'],
    ]);
  });

  it('too short', () => {
    expect(NGram.words('a b', 3)).toEqual([]);
  });

  it('empty', () => {
    expect(NGram.words('', 2)).toEqual([]);
  });
});

describe('NGram — chars', () => {
  it('bigrams', () => {
    expect(NGram.chars('abcd', 2)).toEqual(['ab', 'bc', 'cd']);
  });

  it('trigrams', () => {
    expect(NGram.chars('abcde', 3)).toEqual(['abc', 'bcd', 'cde']);
  });

  it('too short', () => {
    expect(NGram.chars('ab', 3)).toEqual([]);
  });
});

describe('NGram — padded', () => {
  it('padded bigrams', () => {
    const r = NGram.paddedWords('a b', 2);
    expect(r[0]).toEqual(['<PAD>', 'a']);
    expect(r[r.length - 1][1]).toBe('<PAD>');
  });
});

describe('NGram — unique', () => {
  it('unique', () => {
    const input = [['a', 'b'], ['a', 'b'], ['b', 'c']];
    expect(NGram.unique(input)).toEqual([['a', 'b'], ['b', 'c']]);
  });
});

describe('NGram — frequencies', () => {
  it('count', () => {
    const freq = NGram.frequencies([['a', 'b'], ['a', 'b'], ['b', 'c']]);
    expect(freq.get('a\u0001b')).toBe(2);
    expect(freq.get('b\u0001c')).toBe(1);
  });
});
