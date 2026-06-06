/**
 * IBANValidator.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { IBANValidator } from '../IBANValidator';

describe('IBANValidator — basic', () => {
  it('validates German IBAN', () => {
    expect(IBANValidator.isValid('DE89370400440532013000')).toBe(true);
  });

  it('validates UK IBAN', () => {
    expect(IBANValidator.isValid('GB82 WEST 1234 5698 7654 32')).toBe(true);
  });

  it('validates French IBAN', () => {
    expect(IBANValidator.isValid('FR1420041010050500013M02606')).toBe(true);
  });

  it('rejects invalid', () => {
    expect(IBANValidator.isValid('DE00000000000000000000')).toBe(false);
  });

  it('rejects unknown country', () => {
    expect(IBANValidator.isValid('XX12 3456 7890')).toBe(false);
  });

  it('rejects too short', () => {
    expect(IBANValidator.isValid('DE1')).toBe(false);
  });

  it('rejects wrong length for country', () => {
    expect(IBANValidator.isValid('DE1234')).toBe(false);
  });
});

describe('IBANValidator — format', () => {
  it('formats with spaces', () => {
    expect(IBANValidator.format('DE89370400440532013000')).toBe('DE89 3704 0044 0532 0130 00');
  });
});

describe('IBANValidator — getCountry', () => {
  it('extracts country', () => {
    expect(IBANValidator.getCountry('DE89370400440532013000')).toBe('DE');
  });
});

describe('IBANValidator — computeCheckDigits', () => {
  it('computes check digits for DE', () => {
    const check = IBANValidator.computeCheckDigits('DE', '370400440532013000');
    expect(check).toBe('89');
  });
});
