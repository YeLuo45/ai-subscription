/**
 * DateRange.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { DateRange } from '../DateRange';

describe('DateRange — basic', () => {
  const a = new Date(2024, 0, 1);
  const b = new Date(2024, 0, 10);

  it('throws on invalid range', () => {
    expect(() => new DateRange(b, a)).toThrow();
  });

  it('durationMs', () => {
    const r = new DateRange(a, b);
    expect(r.durationMs).toBe(9 * 86_400_000);
  });

  it('durationDays', () => {
    const r = new DateRange(a, b);
    expect(r.durationDays).toBe(9);
  });

  it('isEmpty', () => {
    const r = new DateRange(a, a);
    expect(r.isEmpty).toBe(true);
  });
});

describe('DateRange — contains', () => {
  const r = new DateRange(new Date(2024, 0, 1), new Date(2024, 0, 10));

  it('contains within', () => {
    expect(r.contains(new Date(2024, 0, 5))).toBe(true);
  });

  it('contains start', () => {
    expect(r.contains(new Date(2024, 0, 1))).toBe(true);
  });

  it('contains end', () => {
    expect(r.contains(new Date(2024, 0, 10))).toBe(true);
  });

  it('does not contain before', () => {
    expect(r.contains(new Date(2023, 11, 31))).toBe(false);
  });

  it('does not contain after', () => {
    expect(r.contains(new Date(2024, 0, 11))).toBe(false);
  });
});

describe('DateRange — overlaps', () => {
  it('overlapping ranges', () => {
    const a = new DateRange(new Date(2024, 0, 1), new Date(2024, 0, 10));
    const b = new DateRange(new Date(2024, 0, 5), new Date(2024, 0, 15));
    expect(a.overlaps(b)).toBe(true);
  });

  it('non-overlapping ranges', () => {
    const a = new DateRange(new Date(2024, 0, 1), new Date(2024, 0, 5));
    const b = new DateRange(new Date(2024, 0, 6), new Date(2024, 0, 10));
    expect(a.overlaps(b)).toBe(false);
  });
});

describe('DateRange — intersect', () => {
  it('overlapping', () => {
    const a = new DateRange(new Date(2024, 0, 1), new Date(2024, 0, 10));
    const b = new DateRange(new Date(2024, 0, 5), new Date(2024, 0, 15));
    const i = a.intersect(b)!;
    expect(i.start.getDate()).toBe(5);
    expect(i.end.getDate()).toBe(10);
  });

  it('non-overlapping returns null', () => {
    const a = new DateRange(new Date(2024, 0, 1), new Date(2024, 0, 5));
    const b = new DateRange(new Date(2024, 0, 6), new Date(2024, 0, 10));
    expect(a.intersect(b)).toBe(null);
  });
});

describe('DateRange — split', () => {
  it('splits into chunks', () => {
    const a = new Date(2024, 0, 1);
    const b = new Date(2024, 0, 4);
    const r = new DateRange(a, b);
    const chunks = r.split(86_400_000);
    expect(chunks.length).toBe(3);
  });
});

describe('DateRange — subtract', () => {
  it('subtracts middle', () => {
    const a = new DateRange(new Date(2024, 0, 1), new Date(2024, 0, 10));
    const b = new DateRange(new Date(2024, 0, 4), new Date(2024, 0, 6));
    const r = a.subtract(b);
    expect(r.length).toBe(2);
  });
});
