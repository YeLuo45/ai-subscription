/**
 * VigenereCipher.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { VigenereCipher } from '../VigenereCipher';

describe('VigenereCipher — basic', () => {
  it('encrypts with key', () => {
    expect(VigenereCipher.encrypt('ATTACKATDAWN', 'LEMON')).toBe('LXFOPVEFRNHR');
  });

  it('decrypts with key', () => {
    expect(VigenereCipher.decrypt('LXFOPVEFRNHR', 'LEMON')).toBe('ATTACKATDAWN');
  });

  it('preserves case', () => {
    const e = VigenereCipher.encrypt('Hello', 'ABC');
    const d = VigenereCipher.decrypt(e, 'ABC');
    expect(d).toBe('Hello');
  });

  it('preserves non-letters and skips key', () => {
    const e = VigenereCipher.encrypt('Hello, World!', 'KEY');
    expect(e).toBe('Rijvs, Uyvjn!');
  });

  it('lowercase key', () => {
    expect(VigenereCipher.encrypt('ATTACK', 'lemon')).toBe('LXFOPV');
  });
});

describe('VigenereCipher — round trip', () => {
  it('round trip', () => {
    const s = 'The quick brown fox';
    expect(VigenereCipher.decrypt(VigenereCipher.encrypt(s, 'KEY'), 'KEY')).toBe(s);
  });
});

describe('VigenereCipher — edge cases', () => {
  it('empty key', () => {
    expect(VigenereCipher.encrypt('hello', '')).toBe('hello');
  });

  it('empty text', () => {
    expect(VigenereCipher.encrypt('', 'KEY')).toBe('');
  });
});
