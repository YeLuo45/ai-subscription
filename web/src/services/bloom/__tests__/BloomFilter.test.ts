/**
 * BloomFilter.test.ts — Pure unit tests for Bloom filter
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BloomFilter } from '../BloomFilter';

describe('BloomFilter — construction', () => {
  it('creates with default params', () => {
    const bf = new BloomFilter(1000, 0.01);
    const s = bf.stats();
    expect(s.size).toBeGreaterThan(0);
    expect(s.hashCount).toBeGreaterThan(0);
  });

  it('rejects invalid expectedItems', () => {
    expect(() => new BloomFilter(0, 0.01)).toThrow('> 0');
    expect(() => new BloomFilter(-1, 0.01)).toThrow('> 0');
  });

  it('rejects invalid falsePositiveRate', () => {
    expect(() => new BloomFilter(100, 0)).toThrow('(0, 1)');
    expect(() => new BloomFilter(100, 1)).toThrow('(0, 1)');
    expect(() => new BloomFilter(100, -0.5)).toThrow('(0, 1)');
  });

  it('larger size for lower FPR', () => {
    const bf1 = new BloomFilter(1000, 0.1);
    const bf2 = new BloomFilter(1000, 0.001);
    expect(bf2.stats().size).toBeGreaterThan(bf1.stats().size);
  });
});

describe('BloomFilter — add and mightContain', () => {
  let bf: BloomFilter;
  beforeEach(() => {
    bf = new BloomFilter(1000, 0.01);
  });

  it('returns true for added items', () => {
    bf.add('hello');
    expect(bf.mightContain('hello')).toBe(true);
  });

  it('returns false for items not added', () => {
    expect(bf.mightContain('nope')).toBe(false);
  });

  it('never yields false negatives', () => {
    for (let i = 0; i < 100; i++) {
      bf.add(`item-${i}`);
    }
    for (let i = 0; i < 100; i++) {
      expect(bf.mightContain(`item-${i}`)).toBe(true);
    }
  });

  it('low false positive rate for sparse set', () => {
    for (let i = 0; i < 100; i++) bf.add(`item-${i}`);
    let falsePositives = 0;
    for (let i = 100; i < 1100; i++) {
      if (bf.mightContain(`item-${i}`)) falsePositives += 1;
    }
    // Should be well below 5% for 1% target
    expect(falsePositives).toBeLessThan(50);
  });

  it('addAll adds many items', () => {
    bf.addAll(['a', 'b', 'c', 'd']);
    expect(bf.mightContain('a')).toBe(true);
    expect(bf.mightContain('d')).toBe(true);
    expect(bf.mightContain('e')).toBe(false);
  });

  it('containsAll returns array of bools', () => {
    bf.add('a');
    bf.add('b');
    expect(bf.containsAll(['a', 'b', 'c'])).toEqual([true, true, false]);
  });
});

describe('BloomFilter — statistics', () => {
  it('itemCount tracks adds', () => {
    const bf = new BloomFilter(1000, 0.01);
    bf.add('a');
    bf.add('b');
    expect(bf.stats().itemCount).toBe(2);
  });

  it('bitsSet grows with adds', () => {
    const bf = new BloomFilter(1000, 0.01);
    const before = bf.stats().bitsSet;
    for (let i = 0; i < 50; i++) bf.add(`item-${i}`);
    const after = bf.stats().bitsSet;
    expect(after).toBeGreaterThan(before);
  });

  it('fillRatio is between 0 and 1', () => {
    const bf = new BloomFilter(1000, 0.01);
    for (let i = 0; i < 50; i++) bf.add(`x-${i}`);
    const f = bf.stats().fillRatio;
    expect(f).toBeGreaterThan(0);
    expect(f).toBeLessThanOrEqual(1);
  });

  it('estimatedFPR is non-negative', () => {
    const bf = new BloomFilter(1000, 0.01);
    for (let i = 0; i < 50; i++) bf.add(`x-${i}`);
    expect(bf.stats().estimatedFPR).toBeGreaterThanOrEqual(0);
  });
});

describe('BloomFilter — serialization', () => {
  it('serializes and deserializes', () => {
    const bf = new BloomFilter(100, 0.01);
    for (let i = 0; i < 10; i++) bf.add(`item-${i}`);
    const s = bf.serialize();
    const s2 = bf.stats();
    const restored = BloomFilter.fromSerialized(s, s2.size, s2.hashCount, s2.itemCount);
    for (let i = 0; i < 10; i++) {
      expect(restored.mightContain(`item-${i}`)).toBe(true);
    }
  });
});
