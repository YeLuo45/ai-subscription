/**
 * IBAN.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { IBAN } from '../IBAN';

describe('IBAN — validate', () => {
  it('valid DE', () => {
    expect(IBAN.isValid('DE89370400440532013000')).toBe(true);
  });

  it('valid GB', () => {
    expect(IBAN.isValid('GB82WEST12345698765432')).toBe(true);
  });

  it('valid FR with spaces', () => {
    expect(IBAN.isValid('FR14 2004 1010 0505 0001 3M02 606')).toBe(true);
  });

  it('invalid checksum', () => {
    expect(IBAN.isValid('DE89370400440532013001')).toBe(false);
  });

  it('invalid length DE', () => {
    expect(IBAN.isValid('DE8937040044053201')).toBe(false);
  });
});

describe('IBAN — parts', () => {
  it('getCountry', () => {
    expect(IBAN.getCountry('DE89370400440532013000')).toBe('DE');
  });

  it('getCheckDigits', () => {
    expect(IBAN.getCheckDigits('DE89370400440532013000')).toBe('89');
  });
});

describe('IBAN — format/mask', () => {
  it('format', () => {
    expect(IBAN.format('DE89370400440532013000')).toBe('DE89 3704 0044 0532 0130 00');
  });

  it('mask', () => {
    expect(IBAN.mask('DE89370400440532013000')).toBe('DE****************3000');
  });
});

describe('IBAN — listCountries', () => {
  it('list', () => {
    const c = IBAN.listCountries();
    expect(c).toContain('DE');
    expect(c).toContain('GB');
  });
});
