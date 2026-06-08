/**
 * StringAlgo.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { StringAlgo } from '../StringAlgo';

describe('StringAlgo — KMP', () => {
  it('kmp basic', () => {
    expect(StringAlgo.kmp('ababcabab', 'abab')).toEqual([0, 5]);
  });

  it('kmp no match', () => {
    expect(StringAlgo.kmp('hello', 'xyz')).toEqual([]);
  });

  it('kmp overlapping', () => {
    expect(StringAlgo.kmp('aaaaa', 'aa')).toEqual([0, 1, 2, 3]);
  });
});

describe('StringAlgo — RabinKarp', () => {
  it('basic', () => {
    expect(StringAlgo.rabinKarp('ababcabab', 'abab')).toEqual([0, 5]);
  });

  it('no match', () => {
    expect(StringAlgo.rabinKarp('hello', 'world')).toEqual([]);
  });

  it('single char', () => {
    expect(StringAlgo.rabinKarp('abcabc', 'c')).toEqual([2, 5]);
  });
});

describe('StringAlgo — Z-array', () => {
  it('z', () => {
    expect(StringAlgo.zArray('aabxaab')).toEqual([0, 1, 0, 0, 3, 1, 0]);
  });

  it('z all same', () => {
    expect(StringAlgo.zArray('aaaa')).toEqual([0, 3, 2, 1]);
  });
});

describe('StringAlgo — palindrome', () => {
  it('longest palindrome', () => {
    expect(StringAlgo.longestPalindrome('babad')).toBe('bab');
  });

  it('longest palindrome even', () => {
    expect(StringAlgo.longestPalindrome('cbbd')).toBe('bb');
  });

  it('manacher', () => {
    expect(StringAlgo.longestPalindromeManacher('babad')).toBe('bab');
  });
});
