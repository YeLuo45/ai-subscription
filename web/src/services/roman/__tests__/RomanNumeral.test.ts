/**
 * RomanNumeral.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { RomanNumeral } from '../RomanNumeral';

describe('RomanNumeral — toRoman', () => {
  it('1 -> I', () => {
    expect(RomanNumeral.toRoman(1)).toBe('I');
  });

  it('4 -> IV', () => {
    expect(RomanNumeral.toRoman(4)).toBe('IV');
  });

  it('9 -> IX', () => {
    expect(RomanNumeral.toRoman(9)).toBe('IX');
  });

  it('40 -> XL', () => {
    expect(RomanNumeral.toRoman(40)).toBe('XL');
  });

  it('90 -> XC', () => {
    expect(RomanNumeral.toRoman(90)).toBe('XC');
  });

  it('400 -> CD', () => {
    expect(RomanNumeral.toRoman(400)).toBe('CD');
  });

  it('900 -> CM', () => {
    expect(RomanNumeral.toRoman(900)).toBe('CM');
  });

  it('1994', () => {
    expect(RomanNumeral.toRoman(1994)).toBe('MCMXCIV');
  });

  it('3999', () => {
    expect(RomanNumeral.toRoman(3999)).toBe('MMMCMXCIX');
  });

  it('out of range', () => {
    expect(() => RomanNumeral.toRoman(0)).toThrow();
    expect(() => RomanNumeral.toRoman(4000)).toThrow();
  });
});

describe('RomanNumeral — fromRoman', () => {
  it('I -> 1', () => {
    expect(RomanNumeral.fromRoman('I')).toBe(1);
  });

  it('IV -> 4', () => {
    expect(RomanNumeral.fromRoman('IV')).toBe(4);
  });

  it('MCMXCIV -> 1994', () => {
    expect(RomanNumeral.fromRoman('MCMXCIV')).toBe(1994);
  });

  it('lowercase', () => {
    expect(RomanNumeral.fromRoman('iv')).toBe(4);
  });

  it('invalid', () => {
    expect(() => RomanNumeral.fromRoman('IIII')).toThrow();
  });
});

describe('RomanNumeral — util', () => {
  it('isValid', () => {
    expect(RomanNumeral.isValid('IV')).toBe(true);
    expect(RomanNumeral.isValid('IIII')).toBe(false);
  });

  it('getSymbols', () => {
    const s = RomanNumeral.getSymbols('MCMXCIV');
    expect(s.has('M')).toBe(true);
  });
});
