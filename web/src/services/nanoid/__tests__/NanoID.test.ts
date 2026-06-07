/**
 * NanoID.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { NanoID } from '../NanoID';

describe('NanoID — generate', () => {
  it('default 21', () => {
    const id = NanoID.generate();
    expect(id.length).toBe(21);
  });

  it('custom size', () => {
    const id = NanoID.generate(10);
    expect(id.length).toBe(10);
  });

  it('unique', () => {
    const a = NanoID.generate();
    const b = NanoID.generate();
    expect(a).not.toBe(b);
  });
});

describe('NanoID — variants', () => {
  it('urlSafe', () => {
    const id = NanoID.urlSafe(10);
    expect(id.length).toBe(10);
  });

  it('alphanumeric', () => {
    const id = NanoID.alphanumeric(10);
    expect(id.length).toBe(10);
    expect(/^[A-Za-z0-9]+$/.test(id)).toBe(true);
  });

  it('hex', () => {
    const id = NanoID.hex(10);
    expect(id.length).toBe(10);
    expect(/^[0-9a-f]+$/.test(id)).toBe(true);
  });
});

describe('NanoID — custom', () => {
  it('customSize', () => {
    const id = NanoID.customSize(5, 'abc');
    expect(id.length).toBe(5);
    for (const c of id) {
      expect('abc').toContain(c);
    }
  });
});

describe('NanoID — validate', () => {
  it('valid', () => {
    const id = NanoID.generate();
    expect(NanoID.isValid(id)).toBe(true);
  });

  it('invalid char', () => {
    expect(NanoID.isValid('hello world!')).toBe(false);
  });
});
