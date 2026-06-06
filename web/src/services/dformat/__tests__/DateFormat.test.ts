/**
 * DateFormat.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { DateFormat } from '../DateFormat';

describe('DateFormat — basic tokens', () => {
  const d = new Date(2024, 0, 5, 13, 4, 5, 123); // Fri Jan 5 2024 13:04:05.123

  it('YYYY', () => {
    expect(DateFormat.format(d, 'YYYY')).toBe('2024');
  });

  it('YY', () => {
    expect(DateFormat.format(d, 'YY')).toBe('24');
  });

  it('MM', () => {
    expect(DateFormat.format(d, 'MM')).toBe('01');
  });

  it('DD', () => {
    expect(DateFormat.format(d, 'DD')).toBe('05');
  });

  it('HH and hh', () => {
    expect(DateFormat.format(d, 'HH')).toBe('13');
    expect(DateFormat.format(d, 'hh')).toBe('01');
  });

  it('mm ss SSS', () => {
    expect(DateFormat.format(d, 'mm:ss.SSS')).toBe('04:05.123');
  });

  it('AM/PM', () => {
    expect(DateFormat.format(d, 'A')).toBe('PM');
    expect(DateFormat.format(d, 'a')).toBe('pm');
  });
});

describe('DateFormat — names', () => {
  const d = new Date(2024, 0, 5); // Jan 5
  it('MMM', () => {
    expect(DateFormat.format(d, 'MMM')).toBe('Jan');
  });
  it('MMMM', () => {
    expect(DateFormat.format(d, 'MMMM')).toBe('January');
  });
  it('DDD', () => {
    expect(DateFormat.format(d, 'DDD')).toBe('Fri');
  });
  it('DDDD', () => {
    expect(DateFormat.format(d, 'DDDD')).toBe('Friday');
  });
});

describe('DateFormat — helpers', () => {
  it('iso', () => {
    const d = new Date(2024, 0, 5, 13, 4, 5, 123);
    const s = DateFormat.iso(d);
    expect(s).toMatch(/^2024-01-05T/);
  });

  it('date', () => {
    const d = new Date(2024, 11, 31);
    expect(DateFormat.date(d)).toBe('2024-12-31');
  });

  it('time12', () => {
    const d = new Date(2024, 0, 5, 13, 0, 0);
    expect(DateFormat.time12(d)).toBe('01:00:00 PM');
  });
});

describe('DateFormat — utilities', () => {
  it('dayOfYear', () => {
    const d = new Date(2024, 0, 1);
    expect(DateFormat.dayOfYear(d)).toBe(1);
  });

  it('dayOfYear Dec 31 leap', () => {
    const d = new Date(2024, 11, 31);
    expect(DateFormat.dayOfYear(d)).toBe(366);
  });

  it('weekOfYear', () => {
    const d = new Date(2024, 0, 1); // Mon
    expect(DateFormat.weekOfYear(d)).toBe(1);
  });
});
