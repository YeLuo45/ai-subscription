/**
 * Base32.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Base32 } from '../Base32';

describe('Base32 — encode/decode', () => {
  it('empty', () => {
    expect(Base32.encode(new Uint8Array(0))).toBe('');
  });

  it('hello', () => {
    const e = Base32.encode('hello');
    expect(e.length).toBeGreaterThan(0);
  });

  it('roundtrip', () => {
    const data = new Uint8Array([1, 2, 3, 4, 5]);
    const e = Base32.encode(data);
    const d = Base32.decode(e);
    expect(Array.from(d)).toEqual([1, 2, 3, 4, 5]);
  });

  it('RFC test vector', () => {
    expect(Base32.encode('foo')).toBe('MZXW6===');
    expect(Base32.encode('foobar')).toBe('MZXW6YTBOI======');
  });

  it('decode foo', () => {
    expect(new TextDecoder().decode(Base32.decode('MZXW6==='))).toBe('foo');
  });
});

describe('Base32 — tryDecode', () => {
  it('valid', () => {
    const d = Base32.tryDecode('MZXW6YTBOI======');
    expect(d).not.toBe(null);
  });

  it('invalid', () => {
    expect(Base32.tryDecode('!!!')).toBe(null);
  });
});

describe('Base32 — extended', () => {
  it('encodeHex', () => {
    const e = Base32.encodeHex('foo');
    expect(e).toContain('=');
  });

  it('decodeHex', () => {
    const d = Base32.decodeHex('CO======');
    expect(d.length).toBe(1);
  });

  it('crockfordEncode', () => {
    const e = Base32.crockfordEncode('hi');
    expect(e).not.toContain('=');
  });
});

describe('Base32 — error', () => {
  it('invalid char throws', () => {
    expect(() => Base32.decode('MZXW6YT!')).toThrow();
  });
});
