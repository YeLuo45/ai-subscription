/**
 * HolidayCalendar.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { HolidayCalendar } from '../HolidayCalendar';

describe('HolidayCalendar — fixed', () => {
  it('US Independence Day', () => {
    const c = new HolidayCalendar('US');
    const holidays = c.getHolidaysInYear(2024);
    const july4 = holidays.find((h) => h.name === 'Independence Day');
    expect(july4?.date.getMonth()).toBe(6); // Jul
    expect(july4?.date.getDate()).toBe(4);
  });

  it('US Christmas', () => {
    const c = new HolidayCalendar('US');
    const holidays = c.getHolidaysInYear(2024);
    const xmas = holidays.find((h) => h.name === 'Christmas Day');
    expect(xmas?.date.getMonth()).toBe(11);
    expect(xmas?.date.getDate()).toBe(25);
  });
});

describe('HolidayCalendar — nth-weekday', () => {
  it('Thanksgiving 4th Thu of Nov 2024', () => {
    const c = new HolidayCalendar('US');
    const holidays = c.getHolidaysInYear(2024);
    const tg = holidays.find((h) => h.name === 'Thanksgiving');
    expect(tg?.date.getMonth()).toBe(10); // Nov
    expect(tg?.date.getDate()).toBe(28); // Nov 28 2024
  });

  it('Memorial Day last Mon of May 2024', () => {
    const c = new HolidayCalendar('US');
    const holidays = c.getHolidaysInYear(2024);
    const m = holidays.find((h) => h.name === 'Memorial Day');
    expect(m?.date.getMonth()).toBe(4);
    expect(m?.date.getDate()).toBe(27); // May 27 2024
  });
});

describe('HolidayCalendar — custom', () => {
  it('add custom', () => {
    const c = new HolidayCalendar('US');
    c.add({ name: 'Custom', type: 'fixed', month: 3, day: 15 });
    expect(c.getNames()).toContain('Custom');
  });

  it('isHoliday', () => {
    const c = new HolidayCalendar('US');
    expect(c.isHoliday(new Date(2024, 6, 4))).toBe(true);
    expect(c.isHoliday(new Date(2024, 6, 5))).toBe(false);
  });
});

describe('HolidayCalendar — toSet', () => {
  it('returns YYYY-MM-DD set', () => {
    const c = new HolidayCalendar('US');
    const set = c.toSet(2024);
    expect(set.has('2024-12-25')).toBe(true);
  });
});

describe('HolidayCalendar — countries', () => {
  it('CN has National Day', () => {
    const c = new HolidayCalendar('CN');
    const names = c.getNames();
    expect(names).toContain('National Day');
  });

  it('UK has Boxing Day', () => {
    const c = new HolidayCalendar('UK');
    const names = c.getNames();
    expect(names).toContain('Boxing Day');
  });

  it('unknown country is empty', () => {
    const c = new HolidayCalendar('XX');
    expect(c.getNames().length).toBe(0);
  });
});

describe('HolidayCalendar — setHolidays', () => {
  it('replaces all', () => {
    const c = new HolidayCalendar('US');
    c.setHolidays([{ name: 'Only', type: 'fixed', month: 6, day: 1 }]);
    expect(c.getNames()).toEqual(['Only']);
  });
});
