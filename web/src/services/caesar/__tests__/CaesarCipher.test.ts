/**
 * CaesarCipher.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { CaesarCipher } from '../CaesarCipher';

describe('CaesarCipher — basic', () => {
  it('encrypts with shift 3', () => {
    expect(CaesarCipher.encrypt('hello', 3)).toBe('khoor');
  });

  it('decrypts with shift 3', () => {
    expect(CaesarCipher.decrypt('khoor', 3)).toBe('hello');
  });

  it('preserves case', () => {
    expect(CaesarCipher.encrypt('Hello', 3)).toBe('Khoor');
  });

  it('preserves non-letters', () => {
    expect(CaesarCipher.encrypt('Hello, World!', 3)).toBe('Khoor, Zruog!');
  });

  it('wrap-around', () => {
    expect(CaesarCipher.encrypt('xyz', 3)).toBe('abc');
  });

  it('shift 0 is identity', () => {
    expect(CaesarCipher.encrypt('hello', 0)).toBe('hello');
  });

  it('shift 26 is identity', () => {
    expect(CaesarCipher.encrypt('hello', 26)).toBe('hello');
  });

  it('negative shift', () => {
    expect(CaesarCipher.encrypt('khoor', -3)).toBe('hello');
  });
});

describe('CaesarCipher — brute force', () => {
  it('returns 26 candidates', () => {
    const r = CaesarCipher.bruteForce('khoor');
    expect(r.length).toBe(26);
    expect(r[3]).toBe('hello');
  });
});

describe('CaesarCipher — round trip', () => {
  it('encrypt then decrypt returns original', () => {
    const s = 'The quick brown fox';
    expect(CaesarCipher.decrypt(CaesarCipher.encrypt(s, 7), 7)).toBe(s);
  });
});
