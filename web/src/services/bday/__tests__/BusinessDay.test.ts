/**
 * BusinessDay.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { BusinessDay } from '../BusinessDay';

describe('BusinessDay — isBusinessDay', () => {
  it('weekday is business', () => {
    expect(BusinessDay.isBusinessDay(new Date(2024, 0, 1))).toBe(true); // Mon
  });

  it('weekend is not business', () => {
    expect(BusinessDay.isBusinessDay(new Date(2024, 0, 6))).toBe(false); // Sat
    expect(BusinessDay.isBusinessDay(new Date(2024, 0, 7))).toBe(false); // Sun
  });

  it('holiday is not business', () => {
    const holidays = new Set(['2024-01-01']);
    expect(BusinessDay.isBusinessDay(new Date(2024, 0, 1), holidays)).toBe(false);
  });
});

describe('BusinessDay — addBusinessDays', () => {
  it('add positive', () => {
    // 2024-01-01 (Mon) + 1 = 2024-01-02 (Tue)
    const r = BusinessDay.addBusinessDays(new Date(2024, 0, 1), 1);
    expect(r.getDate()).toBe(2);
  });

  it('add across weekend', () => {
    // 2024-01-05 (Fri) + 1 = 2024-01-08 (Mon)
    const r = BusinessDay.addBusinessDays(new Date(2024, 0, 5), 1);
    expect(r.getDate()).toBe(8);
  });

  it('add negative', () => {
    // 2024-01-02 (Tue) - 1 = 2024-01-01 (Mon)
    const r = BusinessDay.addBusinessDays(new Date(2024, 0, 2), -1);
    expect(r.getDate()).toBe(1);
  });
});

describe('BusinessDay — count', () => {
  it('count Mon-Fri', () => {
    // 2024-01-01 (Mon) to 2024-01-05 (Fri) = 5 business days
    expect(BusinessDay.countBusinessDays(new Date(2024, 0, 1), new Date(2024, 0, 5))).toBe(5);
  });

  it('count full week', () => {
    // 2024-01-01 (Mon) to 2024-01-07 (Sun) = 5
    expect(BusinessDay.countBusinessDays(new Date(2024, 0, 1), new Date(2024, 0, 7))).toBe(5);
  });
});

describe('BusinessDay — next/previous', () => {
  it('next business day', () => {
    // Fri -> Mon
    const r = BusinessDay.nextBusinessDay(new Date(2024, 0, 5));
    expect(r.getDate()).toBe(8);
  });

  it('previous business day', () => {
    // Mon -> Fri
    const r = BusinessDay.previousBusinessDay(new Date(2024, 0, 8));
    expect(r.getDate()).toBe(5);
  });
});

describe('BusinessDay — toKey', () => {
  it('formats correctly', () => {
    expect(BusinessDay.toKey(new Date(2024, 0, 5))).toBe('2024-01-05');
  });
});
