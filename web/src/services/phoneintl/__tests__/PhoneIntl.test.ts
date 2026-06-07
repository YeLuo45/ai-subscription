/**
 * PhoneIntl.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { PhoneIntl } from '../PhoneIntl';

describe('PhoneIntl — countries', () => {
  it('list', () => {
    const c = PhoneIntl.listCountries();
    expect(c.length).toBeGreaterThan(0);
  });

  it('find by ISO', () => {
    const c = PhoneIntl.findByISOCode('US');
    expect(c?.dial).toBe('1');
  });

  it('find by dial', () => {
    const c = PhoneIntl.findByDialCode('86');
    expect(c?.code).toBe('CN');
  });
});

describe('PhoneIntl — parse', () => {
  it('parseE164', () => {
    const r = PhoneIntl.parseE164('+14155551234');
    expect(r.country?.code).toBe('US');
    expect(r.national).toBe('4155551234');
  });

  it('parse CN', () => {
    const r = PhoneIntl.parseE164('+8613912345678');
    expect(r.country?.code).toBe('CN');
    expect(r.national).toBe('13912345678');
  });

  it('no plus', () => {
    const r = PhoneIntl.parseE164('1234567890');
    expect(r.country).toBeNull();
  });
});

describe('PhoneIntl — toE164', () => {
  it('US', () => {
    expect(PhoneIntl.toE164('5551234567', 'US')).toBe('+15551234567');
  });

  it('CN', () => {
    expect(PhoneIntl.toE164('13912345678', 'CN')).toBe('+8613912345678');
  });

  it('invalid country', () => {
    expect(() => PhoneIntl.toE164('123', 'XX')).toThrow();
  });
});

describe('PhoneIntl — validate', () => {
  it('valid US', () => {
    expect(PhoneIntl.isValid('+14155551234', 'US')).toBe(true);
  });

  it('invalid US wrong length', () => {
    expect(PhoneIntl.isValid('+1415555123', 'US')).toBe(false);
  });

  it('no plus', () => {
    expect(PhoneIntl.isValid('14155551234', 'US')).toBe(false);
  });

  it('wrong country', () => {
    expect(PhoneIntl.isValid('+15551234567', 'CN')).toBe(false);
  });
});

describe('PhoneIntl — detectCountry', () => {
  it('US', () => {
    expect(PhoneIntl.detectCountry('+14155551234')?.code).toBe('US');
  });
});

describe('PhoneIntl — isValidDialCode', () => {
  it('valid', () => {
    expect(PhoneIntl.isValidDialCode('1')).toBe(true);
  });

  it('invalid', () => {
    expect(PhoneIntl.isValidDialCode('999')).toBe(false);
  });
});
