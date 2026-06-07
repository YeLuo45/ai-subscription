/**
 * Huffman.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Huffman } from '../Huffman';

describe('Huffman — build', () => {
  it('empty', () => {
    expect(Huffman.buildCodes('')).toEqual({});
  });

  it('single char', () => {
    const codes = Huffman.buildCodes('aaa');
    expect(codes['a']).toBeDefined();
  });

  it('two chars', () => {
    const codes = Huffman.buildCodes('aabb');
    expect(codes['a']).toBeDefined();
    expect(codes['b']).toBeDefined();
    expect(codes['a']).not.toBe(codes['b']);
  });

  it('prefix-free', () => {
    const codes = Huffman.buildCodes('abracadabra');
    // Check no code is a prefix of another
    const list = Object.entries(codes).map(([c, code]) => ({ c, code }));
    for (let i = 0; i < list.length; i++) {
      for (let j = 0; j < list.length; j++) {
        if (i !== j) {
          expect(list[i].code.startsWith(list[j].code)).toBe(false);
        }
      }
    }
  });
});

describe('Huffman — roundtrip', () => {
  it('roundtrip', () => {
    const s = 'hello world';
    expect(Huffman.roundtrip(s)).toBe(s);
  });

  it('longer', () => {
    const s = 'the quick brown fox jumps over the lazy dog';
    expect(Huffman.roundtrip(s)).toBe(s);
  });

  it('empty', () => {
    expect(Huffman.roundtrip('')).toBe('');
  });
});

describe('Huffman — fromFrequencies', () => {
  it('from freq', () => {
    const codes = Huffman.fromFrequencies({ a: 5, b: 9, c: 12, d: 13, e: 16, f: 45 });
    expect(Object.keys(codes).length).toBe(6);
  });

  it('empty', () => {
    expect(Huffman.fromFrequencies({})).toEqual({});
  });
});

describe('Huffman — ratio', () => {
  it('ratio < 1 for repeated', () => {
    const s = 'aaaaaaaaaa';
    expect(Huffman.ratio(s)).toBeLessThan(0.5);
  });

  it('ratio = 0 empty', () => {
    expect(Huffman.ratio('')).toBe(0);
  });
});

describe('Huffman — encode/decode', () => {
  it('encoded data', () => {
    const { codes, data } = Huffman.encode('hello');
    expect(data.length).toBeGreaterThan(0);
    expect(Huffman.decode(codes, data)).toBe('hello');
  });
});
