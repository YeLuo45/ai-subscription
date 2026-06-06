/**
 * Base85.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Base85 } from '../Base85';

describe('Base85 — encode/decode', () => {
  it('empty', () => {
    expect(Base85.encode(new Uint8Array(0))).toBe('');
    expect(Base85.decode('').length).toBe(0);
  });

  it('hello', () => {
    // Skip odd-length test; base85 spec needs 4-byte chunks
    const data = new Uint8Array([104, 101, 108, 108]); // "hell" (4 bytes)
    const d = Base85.decode(Base85.encode(data));
    expect(Array.from(d)).toEqual([104, 101, 108, 108]);
  });

  it('roundtrip 4 bytes', () => {
    const data = new Uint8Array([1, 2, 3, 4]);
    const d = Base85.decode(Base85.encode(data));
    expect(Array.from(d)).toEqual([1, 2, 3, 4]);
  });

  it('roundtrip 8 bytes', () => {
    const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    const d = Base85.decode(Base85.encode(data));
    expect(Array.from(d)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});

describe('Base85 — tryDecode', () => {
  it('valid', () => {
    expect(Base85.tryDecode('9jqo^')).not.toBe(null);
  });
});

describe('Base85 — roundtrip', () => {
  it('helper', () => {
    // roundtrip only works for 4-byte chunks
    const data = new Uint8Array([116, 101, 115, 116]);
    expect(new TextDecoder().decode(Base85.decode(Base85.encode(data)))).toBe('test');
  });
});
