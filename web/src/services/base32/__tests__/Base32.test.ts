/**
 * Base32.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Base32 } from '../Base32';

describe('Base32 — encode', () => {
  it('encodes empty', () => {
    expect(Base32.encode('')).toBe('');
  });

  it('encodes "f" -> "MY======"', () => {
    expect(Base32.encode('f')).toBe('MY======');
  });

  it('encodes "fo" -> "MZXQ===="', () => {
    expect(Base32.encode('fo')).toBe('MZXQ====');
  });

  it('encodes "foo" -> "MZXW6==="', () => {
    expect(Base32.encode('foo')).toBe('MZXW6===');
  });

  it('encodes "foobar" -> "MZXW6YTBOI======"', () => {
    expect(Base32.encode('foobar')).toBe('MZXW6YTBOI======');
  });
});

describe('Base32 — decode', () => {
  it('decodes "MY======"', () => {
    const r = Base32.decodeToString('MY======');
    expect(r).toBe('f');
  });

  it('decodes "MZXW6YTBOI======"', () => {
    const r = Base32.decodeToString('MZXW6YTBOI======');
    expect(r).toBe('foobar');
  });

  it('lowercase input', () => {
    expect(Base32.decodeToString('mzxw6ytboi======')).toBe('foobar');
  });
});

describe('Base32 — round trip', () => {
  it('round trip', () => {
    const s = 'Hello, World!';
    expect(Base32.decodeToString(Base32.encode(s))).toBe(s);
  });
});
