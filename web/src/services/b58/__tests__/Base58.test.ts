/**
 * Base58.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Base58 } from '../Base58';

describe('Base58 — encode/decode', () => {
  it('empty', () => {
    expect(Base58.encode(new Uint8Array(0))).toBe('');
    expect(Base58.decode('').length).toBe(0);
  });

  it('Hello', () => {
    // "Hello" → "9Ajdvzr"
    expect(Base58.encode('Hello')).toBe('9Ajdvzr');
  });

  it('roundtrip', () => {
    const data = new Uint8Array([1, 2, 3, 4, 5, 0, 0, 0, 100]);
    const e = Base58.encode(data);
    const d = Base58.decode(e);
    expect(Array.from(d)).toEqual([1, 2, 3, 4, 5, 0, 0, 0, 100]);
  });

  it('leading zeros', () => {
    const data = new Uint8Array([0, 0, 0, 1, 2, 3]);
    const e = Base58.encode(data);
    expect(e.startsWith('111')).toBe(true);
    const d = Base58.decode(e);
    expect(Array.from(d)).toEqual([0, 0, 0, 1, 2, 3]);
  });
});

describe('Base58 — tryDecode', () => {
  it('valid', () => {
    expect(Base58.tryDecode('9Ajdvzr')).not.toBe(null);
  });

  it('invalid char (0)', () => {
    expect(Base58.tryDecode('0')).toBe(null);
  });

  it('invalid char (I)', () => {
    expect(Base58.tryDecode('I')).toBe(null);
  });

  it('invalid char (O)', () => {
    expect(Base58.tryDecode('O')).toBe(null);
  });
});

describe('Base58 — encodeCheck', () => {
  it('encodeCheck', () => {
    const e = Base58.encodeCheck('Hello');
    expect(e.length).toBeGreaterThan('9Ajdvzr'.length);
  });
});
