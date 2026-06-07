/**
 * Currency.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Currency } from '../Currency';

describe('Currency — meta', () => {
  it('get meta', () => {
    const m = Currency.meta('USD');
    expect(m?.symbol).toBe('$');
  });

  it('unknown', () => {
    expect(Currency.meta('XYZ')).toBeNull();
  });

  it('isSupported', () => {
    expect(Currency.isSupported('USD')).toBe(true);
    expect(Currency.isSupported('XYZ')).toBe(false);
  });

  it('list', () => {
    const l = Currency.list();
    expect(l).toContain('USD');
    expect(l).toContain('EUR');
  });
});

describe('Currency — from/to decimal', () => {
  it('fromDecimal', () => {
    const m = Currency.fromDecimal(10.5, 'USD');
    expect(m.amount).toBe(1050);
    expect(m.currency).toBe('USD');
  });

  it('toDecimal', () => {
    const m = Currency.fromDecimal(10.5, 'USD');
    expect(Currency.toDecimal(m)).toBe(10.5);
  });

  it('JPY no decimals', () => {
    const m = Currency.fromDecimal(1000, 'JPY');
    expect(m.amount).toBe(1000);
  });

  it('unsupported', () => {
    expect(() => Currency.fromDecimal(10, 'XYZ')).toThrow();
  });
});

describe('Currency — math', () => {
  it('add', () => {
    const a = Currency.fromDecimal(10, 'USD');
    const b = Currency.fromDecimal(5, 'USD');
    expect(Currency.toDecimal(Currency.add(a, b))).toBe(15);
  });

  it('subtract', () => {
    const a = Currency.fromDecimal(10, 'USD');
    const b = Currency.fromDecimal(3, 'USD');
    expect(Currency.toDecimal(Currency.subtract(a, b))).toBe(7);
  });

  it('multiply', () => {
    const a = Currency.fromDecimal(10, 'USD');
    expect(Currency.toDecimal(Currency.multiply(a, 1.5))).toBe(15);
  });

  it('currency mismatch', () => {
    const a = Currency.fromDecimal(10, 'USD');
    const b = Currency.fromDecimal(5, 'EUR');
    expect(() => Currency.add(a, b)).toThrow();
  });
});

describe('Currency — format', () => {
  it('format USD', () => {
    const m = Currency.fromDecimal(1234.56, 'USD');
    const f = Currency.format(m, 'en-US');
    expect(f).toContain('1,234');
  });

  it('format JPY', () => {
    const m = Currency.fromDecimal(1000, 'JPY');
    const f = Currency.format(m, 'ja-JP');
    expect(f).toContain('1,000');
  });
});

describe('Currency — convert', () => {
  it('convert USD to EUR', () => {
    const m = Currency.fromDecimal(100, 'USD');
    const c = Currency.convert(m, 'EUR', 0.85);
    expect(c.currency).toBe('EUR');
    expect(Currency.toDecimal(c)).toBe(85);
  });
});
