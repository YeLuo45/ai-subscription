/**
 * Trigram.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Trigram } from '../Trigram';

describe('Trigram — extract', () => {
  it('basic', () => {
    expect(Trigram.extract('abcd')).toEqual(['abc', 'bcd']);
  });

  it('three chars', () => {
    expect(Trigram.extract('abc')).toEqual(['abc']);
  });

  it('too short', () => {
    expect(Trigram.extract('ab')).toEqual([]);
  });

  it('empty', () => {
    expect(Trigram.extract('')).toEqual([]);
  });
});

describe('Trigram — set', () => {
  it('unique', () => {
    const s = Trigram.set('abcabc');
    expect(s.size).toBe(3); // abc, bca, cab
  });
});

describe('Trigram — similarity', () => {
  it('identical', () => {
    expect(Trigram.similarity('hello', 'hello')).toBe(1);
  });

  it('similar', () => {
    expect(Trigram.similarity('hello', 'helo')).toBeGreaterThan(0);
  });

  it('different', () => {
    expect(Trigram.similarity('hello', 'xyz')).toBe(0);
  });

  it('too short', () => {
    expect(Trigram.similarity('ab', 'ab')).toBe(1);
  });
});

describe('Trigram — distance', () => {
  it('identical', () => {
    expect(Trigram.distance('abc', 'abc')).toBe(0);
  });

  it('different', () => {
    expect(Trigram.distance('abc', 'xyz')).toBe(1);
  });
});

describe('Trigram — findBestMatch', () => {
  it('best', () => {
    const r = Trigram.findBestMatch('hello', ['help', 'world', 'hell']);
    expect(r.match).toBe('hell');
  });
});
