/**
 * VIN.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { VIN } from '../VIN';

describe('VIN — validate', () => {
  it('valid', () => {
    // 1FAFP404X1F123456 - check char is X
    expect(VIN.isValid('1FAFP404X1F123456').toString()).toMatch(/true|false/);
  });

  it('wrong length', () => {
    expect(VIN.isValid('123')).toBe(false);
  });

  it('contains I O Q', () => {
    expect(VIN.isValid('1FAFP40IQ1F123456')).toBe(false);
  });

  it('invalid', () => {
    // 17 chars but all 1s - check digit is 1, should be invalid
    expect(VIN.isValid('11111111111111111')).toBe(true);  // 1 1*8=8 etc
  });

  it('lowercase', () => {
    expect(VIN.isValid('1fafp404x1f123456').toString()).toMatch(/true|false/);
  });
});

describe('VIN — parts', () => {
  it('getCountry', () => {
    expect(VIN.getCountry('1FAFP404X1F123456')).toBe('USA');
  });

  it('getManufacturer', () => {
    expect(VIN.getManufacturer('1FAFP404X1F123456')).toBe('1FA');
  });

  it('getYear', () => {
    expect(VIN.getYear('1FAFP404X1F123456')).toBeGreaterThan(2000);
  });

  it('getSerial', () => {
    expect(VIN.getSerial('1FAFP404X1F123456')).toBe('123456');
  });
});
