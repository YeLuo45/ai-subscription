/**
 * Rot13.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Rot13 } from '../Rot13';

describe('Rot13 — basic', () => {
  it('transforms "hello"', () => {
    expect(Rot13.transform('hello')).toBe('uryyb');
  });

  it('is self-inverse', () => {
    const s = 'Hello, World!';
    expect(Rot13.transform(Rot13.transform(s))).toBe(s);
  });

  it('preserves case', () => {
    expect(Rot13.transform('AbC')).toBe('NoP');
  });

  it('preserves non-letters', () => {
    expect(Rot13.transform('Hello, 123!')).toBe('Uryyb, 123!');
  });

  it('numbers are unchanged', () => {
    expect(Rot13.transform('abc 123 def')).toBe('nop 123 qrs');
  });
});

describe('Rot13 — encode/decode', () => {
  it('encode = decode', () => {
    expect(Rot13.encode('foo')).toBe(Rot13.decode('foo'));
  });
});
