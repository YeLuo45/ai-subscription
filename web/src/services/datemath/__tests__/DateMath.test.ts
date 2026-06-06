/**
 * DateMath.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { DateMath } from '../DateMath';

describe('DateMath — add', () => {
  it('add days', () => {
    const d = new Date('2024-01-15T00:00:00Z');
    const r = DateMath.add(d, 5, 'day');
    expect(r.getUTCDate()).toBe(20);
  });

  it('add months', () => {
    const d = new Date('2024-01-15T00:00:00Z');
    const r = DateMath.add(d, 2, 'month');
    expect(r.getUTCMonth()).toBe(2);
  });

  it('add years', () => {
    const d = new Date('2024-01-15T00:00:00Z');
    const r = DateMath.add(d, 1, 'year');
    expect(r.getUTCFullYear()).toBe(2025);
  });

  it('subtract', () => {
    const d = new Date('2024-01-15T00:00:00Z');
    const r = DateMath.subtract(d, 5, 'day');
    expect(r.getUTCDate()).toBe(10);
  });
});

describe('DateMath — diff', () => {
  it('diff in days', () => {
    const a = new Date('2024-01-20T00:00:00Z');
    const b = new Date('2024-01-15T00:00:00Z');
    expect(DateMath.diff(a, b, 'day')).toBe(5);
  });

  it('diff in months', () => {
    const a = new Date('2024-04-15T00:00:00Z');
    const b = new Date('2024-01-15T00:00:00Z');
    expect(DateMath.diff(a, b, 'month')).toBe(3);
  });
});

describe('DateMath — start/end', () => {
  it('startOf day', () => {
    const d = new Date(2024, 0, 15, 12, 30, 45);
    const s = DateMath.startOf(d, 'day');
    expect(s.getHours()).toBe(0);
    expect(s.getMinutes()).toBe(0);
  });

  it('endOf day', () => {
    const d = new Date(2024, 0, 15, 12, 30, 45);
    const e = DateMath.endOf(d, 'day');
    expect(e.getHours()).toBe(23);
    expect(e.getMinutes()).toBe(59);
    expect(e.getSeconds()).toBe(59);
  });

  it('startOf month', () => {
    const d = new Date(2024, 5, 15);
    const s = DateMath.startOf(d, 'month');
    expect(s.getDate()).toBe(1);
  });
});

describe('DateMath — compare', () => {
  it('isBefore', () => {
    expect(DateMath.isBefore(new Date(2024, 0, 1), new Date(2024, 0, 2))).toBe(true);
  });

  it('isAfter', () => {
    expect(DateMath.isAfter(new Date(2024, 0, 2), new Date(2024, 0, 1))).toBe(true);
  });

  it('isEqual', () => {
    expect(DateMath.isEqual(new Date(2024, 0, 1), new Date(2024, 0, 1))).toBe(true);
  });
});

describe('DateMath — min/max', () => {
  it('min', () => {
    const r = DateMath.min(new Date(2024, 5, 1), new Date(2024, 0, 1), new Date(2024, 3, 1));
    expect(r.getMonth()).toBe(0);
  });

  it('max', () => {
    const r = DateMath.max(new Date(2024, 5, 1), new Date(2024, 0, 1), new Date(2024, 3, 1));
    expect(r.getMonth()).toBe(5);
  });
});

describe('DateMath — leap year', () => {
  it('is leap', () => {
    expect(DateMath.isLeapYear(2024)).toBe(true);
    expect(DateMath.isLeapYear(2023)).toBe(false);
    expect(DateMath.isLeapYear(2000)).toBe(true);
    expect(DateMath.isLeapYear(1900)).toBe(false);
  });

  it('daysInMonth', () => {
    expect(DateMath.daysInMonth(2024, 1)).toBe(29); // Feb leap
    expect(DateMath.daysInMonth(2023, 1)).toBe(28);
    expect(DateMath.daysInMonth(2024, 3)).toBe(30); // April
  });
});
