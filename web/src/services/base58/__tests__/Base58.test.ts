/**
 * Base58.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Base58 } from '../Base58';

describe('Base58 — encode', () => {
  it('empty', () => {
    expect(Base58.encode('')).toBe('');
  });

  it('encodes "Hello"', () => {
    // known: 'Hello' -> '9Ajdvzr'
    expect(Base58.encode('Hello')).toBe('9Ajdvzr');
  });

  it('preserves leading zeros', () => {
    const r = Base58.encode(new Uint8Array([0, 0, 1]));
    expect(r.startsWith('11')).toBe(true);
  });
});

describe('Base58 — decode', () => {
  it('decodes "9Ajdvzr"', () => {
    expect(Base58.decodeToString('9Ajdvzr')).toBe('Hello');
  });

  it('preserves leading zeros', () => {
    const r = Base58.decode('11z');
    expect(r[0]).toBe(0);
  });
});

describe('Base58 — round trip', () => {
  it('round trip', () => {
    const s = 'Hello, World! 123';
    expect(Base58.decodeToString(Base58.encode(s))).toBe(s);
  });

  it('binary round trip', () => {
    const b = new Uint8Array([1, 2, 3, 0, 0, 255, 128]);
    const r = Base58.decode(Base58.encode(b));
    expect(Array.from(r)).toEqual(Array.from(b));
  });
});

describe('Base58 — invalid', () => {
  it('throws on invalid char', () => {
    expect(() => Base58.decode('0OI')).toThrow();
  });
});
