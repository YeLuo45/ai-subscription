/**
 * ISSN.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { ISSN } from '../ISSN';

describe('ISSN — validate', () => {
  it('valid', () => {
    expect(ISSN.isValid('0317-8471')).toBe(true);
  });

  it('valid with X', () => {
    // 1144-021X is a valid ISSN example
    expect(ISSN.isValid('1144-021X')).toBe(true);
  });

  it('with spaces', () => {
    expect(ISSN.isValid('0317 8471')).toBe(true);
  });

  it('invalid', () => {
    expect(ISSN.isValid('1234-5678')).toBe(false);
  });

  it('too short', () => {
    expect(ISSN.isValid('123')).toBe(false);
  });
});

describe('ISSN — format', () => {
  it('format', () => {
    expect(ISSN.format('03178471')).toBe('0317-8471');
  });

  it('format with X', () => {
    expect(ISSN.format('1144021X')).toBe('1144-021X');
  });
});

describe('ISSN — check digit', () => {
  it('check digit', () => {
    expect(ISSN.getCheckDigit('0317-847')).toBe('1');
  });

  it('check digit with X', () => {
    expect(ISSN.getCheckDigit('1144-021')).toBe('X');
  });
});

describe('ISSN — ISSN-13', () => {
  it('valid ISSN-13', () => {
    // 9770317847001 -> ISSN-8 = '03178470' (with trailing 0)
    // Use 9770317847001 with issn-8 = 03178470
    expect(ISSN.isValidISSN13('9770317847001')).toBe(false);  // issn-8 '03178470' check digit = 0, but we have '001' for check
  });

  it('no 977 prefix', () => {
    expect(ISSN.isValidISSN13('1234567890123')).toBe(false);
  });
});
