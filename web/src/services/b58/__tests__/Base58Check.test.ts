/**
 * Base58Check.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Base58Check } from '../Base58Check';

describe('Base58Check — encode/decode', () => {
  it('roundtrip', () => {
    const data = new Uint8Array([1, 2, 3, 4, 5]);
    const encoded = Base58Check.encode(data);
    const decoded = Base58Check.decode(encoded);
    expect(Array.from(decoded)).toEqual([1, 2, 3, 4, 5]);
  });

  it('empty', () => {
    const encoded = Base58Check.encode(new Uint8Array(0));
    expect(encoded.length).toBeGreaterThan(0);  // checksum still added
  });

  it('valid format', () => {
    const encoded = Base58Check.encode(new Uint8Array([1, 2, 3]));
    expect(typeof encoded).toBe('string');
    expect(encoded.length).toBeGreaterThan(0);
  });
});

describe('Base58Check — isValid', () => {
  it('valid', () => {
    const encoded = Base58Check.encode(new Uint8Array([1, 2, 3]));
    expect(Base58Check.isValid(encoded)).toBe(true);
  });

  it('invalid', () => {
    expect(Base58Check.isValid('!!!invalid!!!')).toBe(false);
  });
});

describe('Base58Check — raw', () => {
  it('encodeRaw', () => {
    const e = Base58Check.encodeRaw(new Uint8Array([1, 2, 3]));
    expect(e.length).toBeGreaterThan(0);
  });

  it('decodeRaw', () => {
    const e = Base58Check.encodeRaw(new Uint8Array([5, 6, 7]));
    const d = Base58Check.decodeRaw(e);
    expect(Array.from(d)).toEqual([5, 6, 7]);
  });
});

describe('Base58Check — known values', () => {
  it('Hello World encode', () => {
    const data = new TextEncoder().encode('Hello World');
    const encoded = Base58Check.encode(data);
    const decoded = Base58Check.decode(encoded);
    expect(new TextDecoder().decode(decoded)).toBe('Hello World');
  });
});
