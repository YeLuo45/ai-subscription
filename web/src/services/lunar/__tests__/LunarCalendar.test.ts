/**
 * LunarCalendar.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { LunarCalendar } from '../LunarCalendar';

describe('LunarCalendar — toLunar', () => {
  it('converts 2024-02-10 (Spring Festival)', () => {
    const l = LunarCalendar.toLunar(new Date(2024, 1, 10));
    expect(l).not.toBe(null);
    expect(l!.year).toBe(2024);
  });

  it('returns null out of range', () => {
    expect(LunarCalendar.toLunar(new Date(2019, 0, 1))).toBe(null);
    expect(LunarCalendar.toLunar(new Date(2031, 0, 1))).toBe(null);
  });

  it('lunar month in 1-12', () => {
    const l = LunarCalendar.toLunar(new Date(2024, 5, 1))!;
    expect(l.month).toBeGreaterThanOrEqual(1);
    expect(l.month).toBeLessThanOrEqual(12);
  });
});

describe('LunarCalendar — toChineseString', () => {
  it('formats', () => {
    const s = LunarCalendar.toChineseString(new Date(2024, 1, 10));
    expect(s).toMatch(/^农历/);
  });
});

describe('LunarCalendar — leap year', () => {
  it('isLunarLeapYear', () => {
    // 2020 has leap month 4
    expect(LunarCalendar.isLunarLeapYear(2020)).toBe(true);
    // 2021 no leap
    expect(LunarCalendar.isLunarLeapYear(2021)).toBe(false);
  });

  it('daysInLunarYear', () => {
    const d1 = LunarCalendar.daysInLunarYear(2020);
    const d2 = LunarCalendar.daysInLunarYear(2021);
    expect(d1).toBeGreaterThanOrEqual(354);
    expect(d2).toBeGreaterThanOrEqual(354);
  });
});

describe('LunarCalendar — zodiac', () => {
  it('2024 is Dragon', () => {
    // (2024-4) % 12 = 4 → 龙
    expect(LunarCalendar.zodiac(2024)).toBe('龙');
  });

  it('2020 is Rat', () => {
    expect(LunarCalendar.zodiac(2020)).toBe('鼠');
  });
});

describe('LunarCalendar — ganZhi', () => {
  it('2024 is 甲辰', () => {
    expect(LunarCalendar.ganZhi(2024)).toBe('甲辰');
  });
});
