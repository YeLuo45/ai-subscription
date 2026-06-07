/**
 * Phone.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Phone } from '../Phone';

describe('Phone — digits', () => {
  it('strip non-digits', () => {
    expect(Phone.digits('(555) 123-4567')).toBe('5551234567');
  });

  it('plus and dashes', () => {
    expect(Phone.digits('+1-555-123-4567')).toBe('15551234567');
  });
});

describe('Phone — validation', () => {
  it('valid 10-digit', () => {
    expect(Phone.isValid('5551234567')).toBe(true);
  });

  it('valid 11-digit', () => {
    expect(Phone.isValid('15551234567')).toBe(true);
  });

  it('invalid too short', () => {
    expect(Phone.isValid('12345')).toBe(false);
  });

  it('invalid too long', () => {
    expect(Phone.isValid('12345678901234567')).toBe(false);
  });

  it('invalid starts with 0', () => {
    expect(Phone.isValid('0123456789')).toBe(false);
  });
});

describe('Phone — format', () => {
  it('formatUS 10-digit', () => {
    expect(Phone.formatUS('5551234567')).toBe('(555) 123-4567');
  });

  it('formatUS 11-digit', () => {
    expect(Phone.formatUS('15551234567')).toBe('+1 (555) 123-4567');
  });

  it('formatE164', () => {
    expect(Phone.formatE164('5551234567')).toBe('+15551234567');
  });
});

describe('Phone — country code', () => {
  it('US', () => {
    expect(Phone.getCountryCode('15551234567')).toBe('1');
  });

  it('UK', () => {
    expect(Phone.getCountryCode('441234567890')).toBe('44');
  });

  it('CN', () => {
    expect(Phone.getCountryCode('8613912345678')).toBe('86');
  });
});

describe('Phone — mask', () => {
  it('mask 4 visible', () => {
    const m = Phone.mask('5551234567', 4);
    expect(m).toContain('4567');
  });
});

describe('Phone — area code', () => {
  it('US area code', () => {
    expect(Phone.areaCode('5551234567')).toBe('555');
  });

  it('isValidUSAreaCode', () => {
    expect(Phone.isValidUSAreaCode('212')).toBe(true);
    expect(Phone.isValidUSAreaCode('911')).toBe(false);
  });
});

