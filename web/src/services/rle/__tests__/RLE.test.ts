/**
 * RLE.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { RLE } from '../RLE';

describe('RLE — string basic', () => {
  it('empty', () => {
    expect(RLE.encode('')).toBe('');
  });

  it('single char', () => {
    expect(RLE.encode('a')).toBe('a');
  });

  it('no runs', () => {
    expect(RLE.encode('abcd')).toBe('abcd');
  });

  it('simple run', () => {
    expect(RLE.encode('aaab')).toBe('3ab');
  });

  it('long run', () => {
    expect(RLE.encode('aaaaaaaaaa')).toBe('10a');
  });

  it('mixed', () => {
    expect(RLE.encode('aaabbc')).toBe('3a2bc');
  });
});

describe('RLE — decode', () => {
  it('decode basic', () => {
    expect(RLE.decode('3ab')).toBe('aaab');
  });

  it('decode mixed', () => {
    expect(RLE.decode('3a2bc')).toBe('aaabbc');
  });

  it('decode no counts', () => {
    expect(RLE.decode('abc')).toBe('abc');
  });

  it('roundtrip', () => {
    const s = 'aaabbbcccdddeee';
    expect(RLE.decode(RLE.encode(s))).toBe(s);
  });
});

describe('RLE — bytes', () => {
  it('encode bytes', () => {
    const bytes = Uint8Array.from([1, 1, 1, 2, 3, 3]);
    const enc = RLE.encodeBytes(bytes);
    expect(Array.from(enc)).toEqual([3, 1, 2, 2, 3]);
  });

  it('decode bytes', () => {
    const bytes = Uint8Array.from([3, 1, 2, 2, 3]);
    const dec = RLE.decodeBytes(bytes);
    expect(Array.from(dec)).toEqual([3, 1, 2, 2, 3]);
  });
});

describe('RLE — ratio/compressibility', () => {
  it('ratio', () => {
    const enc = RLE.encode('aaaaaaaaaa');
    expect(RLE.ratio('aaaaaaaaaa', enc)).toBeCloseTo(3 / 10, 5);
  });

  it('isCompressible', () => {
    expect(RLE.isCompressible('aaaaaaaaaa')).toBe(true);
    expect(RLE.isCompressible('abcdef')).toBe(false);
  });
});
