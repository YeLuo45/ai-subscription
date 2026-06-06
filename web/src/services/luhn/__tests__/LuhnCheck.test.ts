/**
 * LuhnCheck.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { LuhnCheck } from '../LuhnCheck';

describe('LuhnCheck — basic', () => {
  it('validates test visa', () => {
    expect(LuhnCheck.isValid('4111111111111111')).toBe(true);
  });

  it('rejects invalid', () => {
    expect(LuhnCheck.isValid('4111111111111112')).toBe(false);
  });

  it('handles spaces and dashes', () => {
    expect(LuhnCheck.isValid('4111-1111-1111-1111')).toBe(true);
  });

  it('rejects too short', () => {
    expect(LuhnCheck.isValid('1')).toBe(false);
  });
});

describe('LuhnCheck — compute', () => {
  it('computes check digit', () => {
    expect(LuhnCheck.compute('411111111111111')).toBe(1);
  });

  it('compute for IMEI', () => {
    // IMEI 14 digits + check digit. Compute(14-digit) should be 8.
    expect(LuhnCheck.compute('49015420323751')).toBe(8);
  });
});

describe('LuhnCheck — appendCheckDigit', () => {
  it('appends check digit', () => {
    const full = LuhnCheck.appendCheckDigit('411111111111111');
    expect(LuhnCheck.isValid(full)).toBe(true);
  });
});

describe('LuhnCheck — detectBrand', () => {
  it('detects visa', () => {
    expect(LuhnCheck.detectBrand('4111111111111111')).toBe('visa');
  });

  it('detects mastercard', () => {
    expect(LuhnCheck.detectBrand('5555555555554444')).toBe('mastercard');
  });

  it('detects amex', () => {
    expect(LuhnCheck.detectBrand('378282246310005')).toBe('amex');
  });

  it('detects discover', () => {
    expect(LuhnCheck.detectBrand('6011111111111117')).toBe('discover');
  });

  it('unknown brand', () => {
    expect(LuhnCheck.detectBrand('9999999999999995')).toBe('unknown');
  });
});
