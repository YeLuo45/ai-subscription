/**
 * Base62.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Base62 } from '../Base62';

describe('Base62 — encode/decode', () => {
  it('empty', () => {
    expect(Base62.encode(new Uint8Array(0))).toBe('');
    expect(Base62.decode('').length).toBe(0);
  });

  it('hello', () => {
    const e = Base62.encode('hello');
    const d = Base62.decode(e);
    expect(new TextDecoder().decode(d)).toBe('hello');
  });

  it('roundtrip', () => {
  const data = new Uint8Array([1, 2, 3, 255, 100, 50]);
  const e = Base62.encode(data);
  const d = Base62.decode(e);
  expect(Array.from(d)).toEqual([1, 2, 3, 255, 100, 50]);
  });
});

describe('Base62 — tryDecode', () => {
  it('valid', () => {
    expect(Base62.tryDecode('abc')).not.toBe(null);
  });

  it('invalid', () => {
    expect(Base62.tryDecode('!@#')).toBe(null);
  });
});

describe('Base62 — int', () => {
  it('encodeInt', () => {
    expect(Base62.encodeInt(0)).toBe('0');
    expect(Base62.encodeInt(35)).toBe('Z');
    expect(Base62.encodeInt(61)).toBe('z');
    expect(Base62.encodeInt(62)).toBe('10');
  });

  it('decodeInt', () => {
    expect(Base62.decodeInt('0')).toBe(0);
    expect(Base62.decodeInt('Z')).toBe(35);
    expect(Base62.decodeInt('10')).toBe(62);
  });

  it('roundtrip int', () => {
    expect(Base62.decodeInt(Base62.encodeInt(123456789))).toBe(123456789);
  });

  it('negative', () => {
    expect(() => Base62.encodeInt(-1)).toThrow();
  });
});
