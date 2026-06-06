/**
 * DateIterator.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { DateIterator } from '../DateIterator';

describe('DateIterator — basic', () => {
  it('throws on step 0', () => {
    expect(() => new DateIterator(new Date(), new Date(), 0)).toThrow();
  });

  it('daily iteration', () => {
    const start = new Date(2024, 0, 1);
    const end = new Date(2024, 0, 4);
    const dates = Array.from(new DateIterator(start, end));
    expect(dates.length).toBe(4);
  });

  it('with step', () => {
    const start = new Date(2024, 0, 1);
    const end = new Date(2024, 0, 10);
    const dates = Array.from(new DateIterator(start, end, 3, 'day'));
    expect(dates.length).toBe(4);
  });

  it('reverse step', () => {
    const start = new Date(2024, 0, 10);
    const end = new Date(2024, 0, 1);
    const dates = Array.from(new DateIterator(start, end, -1, 'day'));
    expect(dates.length).toBe(10);
  });
});

describe('DateIterator — operations', () => {
  it('toArray', () => {
    const a = DateIterator.daily(new Date(2024, 0, 1), new Date(2024, 0, 3));
    expect(a.toArray().length).toBe(3);
  });

  it('count', () => {
    const a = DateIterator.daily(new Date(2024, 0, 1), new Date(2024, 0, 5));
    expect(a.count()).toBe(5);
  });

  it('filter weekdays', () => {
    const a = DateIterator.daily(new Date(2024, 0, 1), new Date(2024, 0, 7));
    const weekdays = a.filter((d: Date) => d.getDay() !== 0 && d.getDay() !== 6);
    expect(weekdays.length).toBe(5);
  });

  it('map to day of month', () => {
    const a = DateIterator.daily(new Date(2024, 0, 1), new Date(2024, 0, 3));
    const days = a.map((d: Date) => d.getDate());
    expect(days).toEqual([1, 2, 3]);
  });

  it('take', () => {
    const a = DateIterator.daily(new Date(2024, 0, 1), new Date(2024, 0, 10));
    expect(a.take(3).length).toBe(3);
  });
});

describe('DateIterator — static factories', () => {
  it('monthly', () => {
    const a = DateIterator.monthly(new Date(2024, 0, 1), new Date(2024, 5, 1));
    expect(a.count()).toBe(6);
  });

  it('yearly', () => {
    const a = DateIterator.yearly(new Date(2020, 0, 1), new Date(2025, 0, 1));
    expect(a.count()).toBe(6);
  });
});
