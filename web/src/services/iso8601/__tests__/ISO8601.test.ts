/**
 * ISO8601.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { ISO8601 } from '../ISO8601';

describe('ISO8601 — ordinal', () => {
  it('day 1', () => {
    expect(ISO8601.ordinalDay(new Date(Date.UTC(2024, 0, 1)))).toBe(1);
  });

  it('day 60', () => {
    expect(ISO8601.ordinalDay(new Date(Date.UTC(2024, 1, 29)))).toBe(60);
  });

  it('day 366 leap', () => {
    expect(ISO8601.ordinalDay(new Date(Date.UTC(2024, 11, 31)))).toBe(366);
  });
});

describe('ISO8601 — week', () => {
  it('week 1 of 2024', () => {
    // 2024-01-01 is Monday
    expect(ISO8601.weekNumber(new Date(Date.UTC(2024, 0, 1)))).toBe(1);
  });

  it('dayOfWeek Mon=1', () => {
    expect(ISO8601.dayOfWeek(new Date(Date.UTC(2024, 0, 1)))).toBe(1);
  });

  it('dayOfWeek Sun=7', () => {
    expect(ISO8601.dayOfWeek(new Date(Date.UTC(2024, 0, 7)))).toBe(7);
  });
});

describe('ISO8601 — week date', () => {
  it('formats', () => {
    expect(ISO8601.weekDate(new Date(Date.UTC(2024, 0, 1)))).toBe('2024-W01-1');
  });
});

describe('ISO8601 — ordinal date', () => {
  it('formats', () => {
    expect(ISO8601.ordinalDate(new Date(Date.UTC(2024, 0, 1)))).toBe('2024-001');
  });

  it('day 60', () => {
    expect(ISO8601.ordinalDate(new Date(Date.UTC(2024, 1, 29)))).toBe('2024-060');
  });
});

describe('ISO8601 — weeks in year', () => {
  it('2020 has 53 weeks', () => {
    expect(ISO8601.weeksInYear(2020)).toBe(53);
  });

  it('2024 has 52 weeks', () => {
    expect(ISO8601.weeksInYear(2024)).toBe(52);
  });
});
