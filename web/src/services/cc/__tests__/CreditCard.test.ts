/**
 * CreditCard.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { CreditCard } from '../CreditCard';

describe('CreditCard — Luhn', () => {
  it('valid Visa', () => {
    expect(CreditCard.luhnCheck('4242424242424242')).toBe(true);
  });

  it('valid Amex', () => {
    expect(CreditCard.luhnCheck('378282246310005')).toBe(true);
  });

  it('invalid', () => {
    expect(CreditCard.luhnCheck('1234567890123456')).toBe(false);
  });

  it('with spaces', () => {
    expect(CreditCard.luhnCheck('4242 4242 4242 4242')).toBe(true);
  });
});

describe('CreditCard — detectType', () => {
  it('Visa', () => {
    expect(CreditCard.detectType('4242424242424242')).toBe('Visa');
  });

  it('Mastercard', () => {
    expect(CreditCard.detectType('5555555555554444')).toBe('Mastercard');
  });

  it('Amex', () => {
    expect(CreditCard.detectType('378282246310005')).toBe('American Express');
  });

  it('Discover', () => {
    expect(CreditCard.detectType('6011111111111117')).toBe('Discover');
  });

  it('unknown', () => {
    expect(CreditCard.detectType('0000000000000000')).toBeNull();
  });
});

describe('CreditCard — isValid', () => {
  it('valid', () => {
    expect(CreditCard.isValid('4242424242424242')).toBe(true);
  });

  it('invalid luhn', () => {
    expect(CreditCard.isValid('4242424242424241')).toBe(false);
  });

  it('too short', () => {
    expect(CreditCard.isValid('123')).toBe(false);
  });
});

describe('CreditCard — format', () => {
  it('format Visa', () => {
    expect(CreditCard.format('4242424242424242')).toBe('4242 4242 4242 4242');
  });

  it('format Amex', () => {
    expect(CreditCard.format('378282246310005')).toBe('3782 822463 10005');
  });
});

describe('CreditCard — mask', () => {
  it('mask 4', () => {
    expect(CreditCard.mask('4242424242424242')).toBe('************4242');
  });
});

describe('CreditCard — CVV/expiry', () => {
  it('valid CVV 3', () => {
    expect(CreditCard.isValidCVV('123')).toBe(true);
  });

  it('valid CVV 4 Amex', () => {
    expect(CreditCard.isValidCVV('1234', 'American Express')).toBe(true);
  });

  it('invalid CVV', () => {
    expect(CreditCard.isValidCVV('12')).toBe(false);
  });

  it('valid expiry', () => {
    expect(CreditCard.isValidExpiry('12/30')).toBe(true);
  });

  it('invalid month', () => {
    expect(CreditCard.isValidExpiry('13/30')).toBe(false);
  });
});

describe('CreditCard — listTypes', () => {
  it('list', () => {
    const types = CreditCard.listTypes();
    expect(types).toContain('Visa');
    expect(types).toContain('Mastercard');
  });
});
