/**
 * Currency2.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Currency2 } from '../Currency2';

describe('Currency2 — format', () => {
  it('format USD', () => {
    const s = Currency2.format(1234.5, 'USD');
    expect(s).toContain('1,234');
  });

  it('format JPY no decimals', () => {
    const s = Currency2.format(1000, 'JPY', 'ja-JP');
    expect(s).toContain('1,000');
  });

  it('format custom', () => {
    expect(Currency2.formatCustom(1234.56, 2, ',', '.')).toBe('1,234.56');
  });

  it('format custom European', () => {
    expect(Currency2.formatCustom(1234.56, 2, '.', ',')).toBe('1.234,56');
  });

  it('format negative', () => {
    expect(Currency2.formatCustom(-1234.56)).toBe('-1,234.56');
  });

  it('format integer', () => {
    expect(Currency2.formatCustom(1000)).toBe('1,000.00');
  });
});

describe('Currency2 — percent', () => {
  it('format percent', () => {
    expect(Currency2.formatPercent(0.5)).toBe('50.00%');
  });

  it('format percent 1 dec', () => {
    expect(Currency2.formatPercent(0.123, 1)).toBe('12.3%');
  });
});

describe('Currency2 — parse', () => {
  it('parse', () => {
    expect(Currency2.parse('$1,234.56')).toBe(1234.56);
  });

  it('parse negative', () => {
    expect(Currency2.parse('-$100.00')).toBe(-100);
  });
});

describe('Currency2 — compact', () => {
  it('compact 1K', () => {
    const s = Currency2.formatCompact(1500);
    expect(s).toContain('K');
  });

  it('compact 1M', () => {
    const s = Currency2.formatCompact(2_000_000);
    expect(s).toContain('M');
  });
});

describe('Currency2 — accounting', () => {
  it('positive', () => {
    const s = Currency2.formatAccounting(100);
    expect(s).not.toContain('(');
  });

  it('negative', () => {
    const s = Currency2.formatAccounting(-100);
    expect(s).toContain('(');
  });
});
