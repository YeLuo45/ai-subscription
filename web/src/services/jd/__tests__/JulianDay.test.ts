/**
 * JulianDay.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { JulianDay } from '../JulianDay';

describe('JulianDay — fromDate/toDate', () => {
  it('Unix epoch = 2440587.5', () => {
    expect(JulianDay.fromDate(new Date(0))).toBeCloseTo(2440587.5, 5);
  });

  it('J2000 ~ 2451545', () => {
    // J2000 epoch is 2000-01-01 12:00 TT, ~2451545.0
    expect(JulianDay.fromDate(new Date(2000, 0, 1, 12))).toBeCloseTo(2451545, 0);
  });

  it('round trip', () => {
    const d = new Date(2024, 0, 15);
    const jd = JulianDay.fromDate(d);
    const d2 = JulianDay.toDate(jd);
    expect(Math.abs(d.getTime() - d2.getTime())).toBeLessThan(1000);
  });
});

describe('JulianDay — MJD', () => {
  it('MJD of Unix epoch', () => {
    const mjd = JulianDay.modifiedJulianDay(new Date(0));
    expect(mjd).toBeCloseTo(40587, 3);
  });
});

describe('JulianDay — julian century', () => {
  it('J2000 century ~ 0', () => {
    expect(JulianDay.julianCentury(new Date(2000, 0, 1, 12))).toBeCloseTo(0, 3);
  });
});

describe('JulianDay — leap year', () => {
  it('2024 is Julian leap', () => {
    expect(JulianDay.isJulianLeapYear(2024)).toBe(true);
  });

  it('2023 is not Julian leap', () => {
    expect(JulianDay.isJulianLeapYear(2023)).toBe(false);
  });
});

describe('JulianDay — days in month', () => {
  it('Feb leap', () => {
    expect(JulianDay.daysInJulianMonth(2024, 2)).toBe(29);
  });

  it('Apr', () => {
    expect(JulianDay.daysInJulianMonth(2024, 4)).toBe(30);
  });
});
