/**
 * Metaphone.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Metaphone } from '../Metaphone';

describe('Metaphone — encode', () => {
  it('empty', () => {
    expect(Metaphone.encode('')).toBe('');
  });

  it('non-alpha', () => {
    expect(Metaphone.encode('123')).toBe('');
  });

  it('Thompson', () => {
    // Thompson → TMSN or 0MSN (TH→0)
    const code = Metaphone.encode('Thompson');
    expect(code.length).toBeGreaterThan(0);
  });

  it('deterministic', () => {
    expect(Metaphone.encode('hello')).toBe(Metaphone.encode('hello'));
  });

  it('Robert/Rupert similar', () => {
    // Both start with R
    expect(Metaphone.encode('Robert')[0]).toBe('R');
    expect(Metaphone.encode('Rupert')[0]).toBe('R');
  });
});

describe('Metaphone — similar', () => {
  it('identical', () => {
    expect(Metaphone.similar('hello', 'hello')).toBe(true);
  });

  it('different', () => {
    expect(Metaphone.similar('hello', 'xyz')).toBe(false);
  });

  it('case insensitive', () => {
    expect(Metaphone.similar('Hello', 'hello')).toBe(true);
  });
});

describe('Metaphone — common words', () => {
  it('phone', () => {
    const code = Metaphone.encode('phone');
    expect(code).toContain('F');
  });

  it('knight (silent K)', () => {
    // KN at start should drop K
    const code = Metaphone.encode('knight');
    expect(code[0]).not.toBe('K');
  });
});
