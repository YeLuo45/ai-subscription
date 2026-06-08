/**
 * BloomFilter.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { BloomFilter } from '../BloomFilter';

describe('BloomFilter — basic', () => {
  it('add/mightContain', () => {
    const bf = new BloomFilter(100, 3);
    bf.add('hello');
    expect(bf.mightContain('hello')).toBe(true);
  });

  it('mightContain missing', () => {
    const bf = new BloomFilter(100, 3);
    // No false positive expected for small filter
    expect(bf.mightContain('xyz')).toBe(false);
  });

  it('clear', () => {
    const bf = new BloomFilter(100, 3);
    bf.add('hello');
    bf.clear();
    expect(bf.mightContain('hello')).toBe(false);
  });
});

describe('BloomFilter — stats', () => {
  it('bitCount', () => {
    const bf = new BloomFilter(100, 3);
    bf.add('hello');
    expect(bf.bitCount()).toBeGreaterThan(0);
  });

  it('fillRatio', () => {
    const bf = new BloomFilter(100, 3);
    expect(bf.fillRatio()).toBe(0);
    bf.add('hello');
    expect(bf.fillRatio()).toBeGreaterThan(0);
  });

  it('multiple adds no false negatives', () => {
    const bf = new BloomFilter(1000, 5);
    const words = ['apple', 'banana', 'cherry', 'date', 'elderberry'];
    words.forEach((w) => bf.add(w));
    words.forEach((w) => expect(bf.mightContain(w)).toBe(true));
  });
});
