/**
 * PBKDF2.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { PBKDF2 } from '../PBKDF2';

describe('PBKDF2 — derive', () => {
  it('derives deterministic key', async () => {
    const k1 = await PBKDF2.deriveKey('password', 'salt', 1000, 32);
    const k2 = await PBKDF2.deriveKey('password', 'salt', 1000, 32);
    expect(Array.from(k1)).toEqual(Array.from(k2));
  });

  it('different passwords yield different keys', async () => {
    const k1 = await PBKDF2.deriveKey('password1', 'salt', 1000, 32);
    const k2 = await PBKDF2.deriveKey('password2', 'salt', 1000, 32);
    expect(Array.from(k1)).not.toEqual(Array.from(k2));
  });

  it('different salts yield different keys', async () => {
    const k1 = await PBKDF2.deriveKey('password', 'salt1', 1000, 32);
    const k2 = await PBKDF2.deriveKey('password', 'salt2', 1000, 32);
    expect(Array.from(k1)).not.toEqual(Array.from(k2));
  });

  it('correct key length', async () => {
    const k = await PBKDF2.deriveKey('p', 's', 1000, 16);
    expect(k.length).toBe(16);
  });
});

describe('PBKDF2 — hex', () => {
  it('hex output length', async () => {
    const h = await PBKDF2.deriveKeyHex('p', 's', 1000, 16);
    expect(h.length).toBe(32);
  });
});

describe('PBKDF2 — salt', () => {
  it('generate salt', () => {
    const s = PBKDF2.generateSalt(16);
    expect(s.length).toBe(16);
  });

  it('salts are different', () => {
    const s1 = PBKDF2.generateSaltHex(16);
    const s2 = PBKDF2.generateSaltHex(16);
    expect(s1).not.toBe(s2);
  });
});

describe('PBKDF2 — Uint8Array salt', () => {
  it('Uint8Array salt works', async () => {
    const salt = new Uint8Array([1, 2, 3, 4]);
    const k = await PBKDF2.deriveKey('p', salt, 1000, 16);
    expect(k.length).toBe(16);
  });
});
