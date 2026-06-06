/**
 * HammingDistance.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { HammingDistance } from '../HammingDistance';

describe('HammingDistance — strings', () => {
  it('identical', () => {
    expect(HammingDistance.compute('abc', 'abc')).toBe(0);
  });

  it('one diff', () => {
    expect(HammingDistance.compute('abc', 'abd')).toBe(1);
  });

  it('all diff', () => {
    expect(HammingDistance.compute('abc', 'xyz')).toBe(3);
  });

  it('throws on length mismatch', () => {
    expect(() => HammingDistance.compute('abc', 'ab')).toThrow();
  });

  it('tryCompute null', () => {
    expect(HammingDistance.tryCompute('abc', 'ab')).toBe(null);
  });
});

describe('HammingDistance — bits', () => {
  it('identical', () => {
    expect(HammingDistance.bits(0b1100, 0b1100)).toBe(0);
  });

  it('one bit', () => {
    expect(HammingDistance.bits(0b1100, 0b1101)).toBe(1);
  });

  it('all bits', () => {
    expect(HammingDistance.bits(0b0000, 0b1111)).toBe(4);
  });

  it('zero', () => {
    expect(HammingDistance.bits(0, 0)).toBe(0);
  });
});

describe('HammingDistance — bytes', () => {
  it('identical', () => {
    expect(HammingDistance.bytes([1, 2, 3], [1, 2, 3])).toBe(0);
  });

  it('Uint8Array', () => {
    expect(HammingDistance.bytes(new Uint8Array([0xFF]), new Uint8Array([0x00]))).toBe(8);
  });

  it('throws length mismatch', () => {
    expect(() => HammingDistance.bytes([1, 2], [1])).toThrow();
  });
});

describe('HammingDistance — similarity/normal', () => {
  it('similarity 1', () => {
    expect(HammingDistance.similarity('abc', 'abc')).toBe(1);
  });

  it('similarity 0', () => {
    expect(HammingDistance.similarity('abc', 'xyz')).toBe(0);
  });

  it('empty', () => {
    expect(HammingDistance.similarity('', '')).toBe(1);
  });

  it('normalized', () => {
    expect(HammingDistance.normalized('abc', 'abd')).toBeCloseTo(1 / 3, 5);
  });
});
