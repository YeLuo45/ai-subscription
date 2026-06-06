/**
 * DateMath — date arithmetic helpers
 *
 * Inspired by: date-fns / moment.js
 *
 * Add/subtract units, start/end of period, diff.
 */

export type Unit = 'millisecond' | 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';

const MS_PER: Record<Unit, number> = {
  millisecond: 1,
  second: 1000,
  minute: 60_000,
  hour: 3_600_000,
  day: 86_400_000,
  week: 7 * 86_400_000,
  month: 0, // variable
  quarter: 0,
  year: 0,
};

export class DateMath {
  /**
   * Add N units to a date.
   */
  static add(date: Date, n: number, unit: Unit): Date {
    const d = new Date(date);
    if (unit === 'month' || unit === 'quarter' || unit === 'year') {
      const mult = unit === 'month' ? 1 : unit === 'quarter' ? 3 : 12;
      d.setMonth(d.getMonth() + n * mult);
    } else {
      d.setTime(d.getTime() + n * MS_PER[unit]);
    }
    return d;
  }

  /**
   * Subtract N units from a date.
   */
  static subtract(date: Date, n: number, unit: Unit): Date {
    return this.add(date, -n, unit);
  }

  /**
   * Difference in units (truncated to integer).
   */
  static diff(a: Date, b: Date, unit: Unit = 'day'): number {
    const ms = a.getTime() - b.getTime();
    if (unit === 'month' || unit === 'quarter' || unit === 'year') {
      const mult = unit === 'month' ? 1 : unit === 'quarter' ? 3 : 12;
      const aY = a.getFullYear();
      const bY = b.getFullYear();
      const aM = a.getMonth();
      const bM = b.getMonth();
      let months = (aY - bY) * 12 + (aM - bM);
      if (a.getDate() < b.getDate()) months -= 1;
      return Math.trunc(months / mult);
    }
    return Math.trunc(ms / MS_PER[unit]);
  }

  /**
   * Start of unit.
   */
  static startOf(date: Date, unit: Unit): Date {
    const d = new Date(date);
    switch (unit) {
      case 'year': d.setMonth(0, 1); d.setHours(0, 0, 0, 0); break;
      case 'quarter': {
        const q = Math.floor(d.getMonth() / 3) * 3;
        d.setMonth(q, 1); d.setHours(0, 0, 0, 0);
        break;
      }
      case 'month': d.setDate(1); d.setHours(0, 0, 0, 0); break;
      case 'week': {
        const day = d.getDay();
        d.setDate(d.getDate() - day);
        d.setHours(0, 0, 0, 0);
        break;
      }
      case 'day': d.setHours(0, 0, 0, 0); break;
      case 'hour': d.setMinutes(0, 0, 0); break;
      case 'minute': d.setSeconds(0, 0); break;
      case 'second': d.setMilliseconds(0); break;
      case 'millisecond': break;
    }
    return d;
  }

  /**
   * End of unit.
   */
  static endOf(date: Date, unit: Unit): Date {
    const d = this.startOf(date, unit);
    switch (unit) {
      case 'year': d.setFullYear(d.getFullYear() + 1); break;
      case 'quarter': d.setMonth(d.getMonth() + 3); break;
      case 'month': d.setMonth(d.getMonth() + 1); break;
      case 'week': d.setDate(d.getDate() + 7); break;
      case 'day': d.setHours(23, 59, 59, 999); break;
      case 'hour': d.setMinutes(59, 59, 999); break;
      case 'minute': d.setSeconds(59, 999); break;
      case 'second': d.setMilliseconds(999); break;
      case 'millisecond': break;
    }
    d.setTime(d.getTime() - 1);
    return d;
  }

  /**
   * Compare two dates.
   */
  static compare(a: Date, b: Date): number {
    return a.getTime() - b.getTime();
  }

  /**
   * Is a before b?
   */
  static isBefore(a: Date, b: Date): boolean {
    return a.getTime() < b.getTime();
  }

  /**
   * Is a after b?
   */
  static isAfter(a: Date, b: Date): boolean {
    return a.getTime() > b.getTime();
  }

  /**
   * Is a equal to b (by time)?
   */
  static isEqual(a: Date, b: Date): boolean {
    return a.getTime() === b.getTime();
  }

  /**
   * Min of dates.
   */
  static min(...dates: Date[]): Date {
    if (dates.length === 0) throw new Error('min() requires at least one date');
    return new Date(Math.min(...dates.map((d) => d.getTime())));
  }

  /**
   * Max of dates.
   */
  static max(...dates: Date[]): Date {
    if (dates.length === 0) throw new Error('max() requires at least one date');
    return new Date(Math.max(...dates.map((d) => d.getTime())));
  }

  /**
   * Is leap year?
   */
  static isLeapYear(year: number): boolean {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  }

  /**
   * Days in month.
   */
  static daysInMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate();
  }
}
