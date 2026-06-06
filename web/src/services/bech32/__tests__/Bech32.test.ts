/**
 * Bech32.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Bech32 } from '../Bech32';

describe('Bech32 — encode', () => {
  it('encodes empty data', () => {
    // BIP-173 test vector: A12UEL5L with empty data
    const addr = Bech32.encode('a', []);
    expect(addr).toBe('a12uel5l');
  });

  it('BC1 prefix', () => {
    const addr = Bech32.encode('bc', [0, 1, 2, 3]);
    expect(addr.startsWith('bc1')).toBe(true);
  });
});

describe('Bech32 — decode', () => {
  it('decodes valid address', () => {
    const r = Bech32.decode('a12uel5l');
    expect(r?.hrp).toBe('a');
    expect(r?.data.length).toBe(0);
  });

  it('rejects invalid checksum', () => {
    expect(Bech32.decode('a12uel5m')).toBe(null);
  });

  it('rejects invalid char', () => {
    expect(Bech32.decode('a1bpbp')).toBe(null);
  });

  it('rejects empty', () => {
    expect(Bech32.decode('')).toBe(null);
  });
});

describe('Bech32 — round trip', () => {
  it('round trip', () => {
    const hrp = 'bc';
    const data = [0, 1, 2, 3, 4, 5];
    const r = Bech32.decode(Bech32.encode(hrp, data));
    expect(r?.hrp).toBe(hrp);
    expect(r?.data).toEqual(data);
  });
});
