/**
 * HashId.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { HashId } from '../HashId';

describe('HashId — encode', () => {
  it('single number', () => {
    const h = new HashId('salt');
    const encoded = h.encode([42]);
    expect(encoded.length).toBeGreaterThan(0);
  });

  it('multiple numbers', () => {
    const h = new HashId('salt');
    const encoded = h.encode([1, 2, 3]);
    expect(encoded.length).toBeGreaterThan(0);
  });

  it('empty', () => {
    const h = new HashId('salt');
    expect(h.encode([])).toBe('');
  });

  it('different salts', () => {
    const a = new HashId('salt1');
    const b = new HashId('salt2');
    expect(a.encode([42])).not.toBe(b.encode([42]));
  });

  it('minLength', () => {
    const h = new HashId('salt', 'abc123', 10);
    const encoded = h.encode([1]);
    expect(encoded.length).toBeGreaterThanOrEqual(10);
  });
});

describe('HashId — decode', () => {
  it('decode', () => {
    const h = new HashId('salt');
    const encoded = h.encode([42, 100]);
    const decoded = h.decode(encoded);
    expect(decoded.length).toBeGreaterThan(0);
  });

  it('empty', () => {
    const h = new HashId('salt');
    expect(h.decode('')).toEqual([]);
  });
});
