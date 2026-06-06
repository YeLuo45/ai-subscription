/**
 * HolidayCalendar — public holiday calendar
 *
 * Inspired by: date-holidays
 *
 * - Fixed-date holidays (Jan 1, Dec 25, etc.)
 * - Nth-weekday holidays (Thanksgiving = 4th Thu Nov)
 * - Custom holiday definitions
 */

import { BusinessDay } from '../bday/BusinessDay';

export interface HolidayDef {
  name: string;
  /** 'fixed' for MM-DD or 'nth-weekday' for ordinal+weekday+month */
  type: 'fixed' | 'nth-weekday';
  month: number; // 1-12
  day?: number; // 1-31 (for fixed)
  nth?: number; // 1-5 for nth-weekday
  weekday?: number; // 0-6 (for nth-weekday)
  offset?: number; // days after (positive) or before (negative)
}

const DEFAULTS: Record<string, HolidayDef[]> = {
  US: [
    { name: "New Year's Day", type: 'fixed', month: 1, day: 1 },
    { name: 'Independence Day', type: 'fixed', month: 7, day: 4 },
    { name: 'Veterans Day', type: 'fixed', month: 11, day: 11 },
    { name: 'Christmas Day', type: 'fixed', month: 12, day: 25 },
    { name: 'Thanksgiving', type: 'nth-weekday', month: 11, nth: 4, weekday: 4 },
    { name: 'Memorial Day', type: 'nth-weekday', month: 5, nth: -1, weekday: 1 }, // Last Mon May
    { name: 'Labor Day', type: 'nth-weekday', month: 9, nth: 1, weekday: 1 },
  ],
  CN: [
    { name: "New Year's Day", type: 'fixed', month: 1, day: 1 },
    { name: 'Labor Day', type: 'fixed', month: 5, day: 1 },
    { name: 'National Day', type: 'fixed', month: 10, day: 1 },
  ],
  UK: [
    { name: "New Year's Day", type: 'fixed', month: 1, day: 1 },
    { name: 'Christmas Day', type: 'fixed', month: 12, day: 25 },
    { name: 'Boxing Day', type: 'fixed', month: 12, day: 26 },
  ],
};

export class HolidayCalendar {
  private holidays: HolidayDef[];
  private extra: HolidayDef[];

  constructor(country: string = 'US') {
    this.holidays = DEFAULTS[country] ?? [];
    this.extra = [];
  }

  /**
   * Add custom holiday.
   */
  add(holiday: HolidayDef): this {
    this.extra.push(holiday);
    return this;
  }

  /**
   * Set holidays (replaces default).
   */
  setHolidays(holidays: HolidayDef[]): void {
    this.holidays = holidays;
  }

  /**
   * Get all holidays in a year.
   */
  getHolidaysInYear(year: number): Array<{ name: string; date: Date }> {
    const all = [...this.holidays, ...this.extra];
    return all
      .map((h) => {
        const d = this.computeDate(h, year);
        return d ? { name: h.name, date: d } : null;
      })
      .filter((x): x is { name: string; date: Date } => x !== null)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  /**
   * Get Set of holiday keys (YYYY-MM-DD) for BusinessDay integration.
   */
  toSet(year: number): Set<string> {
    const set = new Set<string>();
    for (const h of this.getHolidaysInYear(year)) {
      set.add(BusinessDay.toKey(h.date));
    }
    return set;
  }

  /**
   * Is a date a holiday?
   */
  isHoliday(date: Date): boolean {
    const key = BusinessDay.toKey(date);
    const all = [...this.holidays, ...this.extra];
    for (const h of all) {
      const d = this.computeDate(h, date.getFullYear());
      if (d && BusinessDay.toKey(d) === key) return true;
    }
    return false;
  }

  /**
   * Get list of holiday names.
   */
  getNames(): string[] {
    return [...this.holidays, ...this.extra].map((h) => h.name);
  }

  private computeDate(h: HolidayDef, year: number): Date | null {
    if (h.type === 'fixed' && h.day) {
      return new Date(year, h.month - 1, h.day);
    }
    if (h.type === 'nth-weekday' && h.nth !== undefined && h.weekday !== undefined) {
      return this.nthWeekday(year, h.month, h.nth, h.weekday);
    }
    return null;
  }

  private nthWeekday(year: number, month: number, nth: number, weekday: number): Date {
    if (nth > 0) {
      const first = new Date(year, month - 1, 1);
      const firstWeekday = first.getDay();
      let day = 1 + ((weekday - firstWeekday + 7) % 7);
      day += (nth - 1) * 7;
      return new Date(year, month - 1, day);
    } else {
      // Last weekday of month
      const last = new Date(year, month, 0);
      const lastDay = last.getDate();
      const lastWeekday = last.getDay();
      const day = lastDay - ((lastWeekday - weekday + 7) % 7);
      return new Date(year, month - 1, day);
    }
  }
}
