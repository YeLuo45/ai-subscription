/**
 * Soundex.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Soundex } from '../Soundex';

describe('Soundex — encode', () => {
  it('Robert/Rupert', () => {
    expect(Soundex.encode('Robert')).toBe('R163');
    expect(Soundex.encode('Rupert')).toBe('R163');
  });

  it('Rubin', () => {
    expect(Soundex.encode('Rubin')).toBe('R150');
  });

  it('Ashcraft/Ashcroft match', () => {
    // Both should produce the same code (h/w skipped)
    expect(Soundex.encode('Ashcraft')).toBe(Soundex.encode('Ashcroft'));
  });

  it('Pfister', () => {
    expect(Soundex.encode('Pfister')).toBe('P236');
  });

  it('empty', () => {
    expect(Soundex.encode('')).toBe('');
  });

  it('non-alpha', () => {
    expect(Soundex.encode('123')).toBe('');
  });

  it('length 4 padded', () => {
    const s = Soundex.encode('A');
    expect(s.length).toBe(4);
  });
});

describe('Soundex — similar', () => {
  it('similar', () => {
    expect(Soundex.similar('Robert', 'Rupert')).toBe(true);
  });

  it('not similar', () => {
    expect(Soundex.similar('Robert', 'Smith')).toBe(false);
  });
});

describe('Soundex — distance', () => {
  it('identical', () => {
    expect(Soundex.distance('abc', 'abc')).toBe(0);
  });

  it('different', () => {
    expect(Soundex.distance('abc', 'xyz')).toBe(1);
  });
});

describe('Soundex — batch', () => {
  it('batch', () => {
    const r = Soundex.batch(['Robert', 'Rupert']);
    expect(r['Robert']).toBe('R163');
    expect(r['Rupert']).toBe('R163');
  });
});
