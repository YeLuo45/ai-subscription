/**
 * RecurrenceRule — recurring event rule
 *
 * Inspired by: RFC 5545 RRULE (subset)
 *
 * Supports: daily, weekly, monthly, yearly with interval.
 */

export type Frequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export class RecurrenceRule {
  freq: Frequency;
  interval: number;
  count?: number;
  until?: Date;
  byWeekday?: number[];
  byMonthDay?: number[];

  constructor(opts: {
    freq: Frequency;
    interval?: number;
    count?: number;
    until?: Date;
    byWeekday?: number[];
    byMonthDay?: number[];
  }) {
    this.freq = opts.freq;
    this.interval = opts.interval ?? 1;
    if (this.interval < 1) throw new Error('interval must be >= 1');
    this.count = opts.count;
    this.until = opts.until;
    this.byWeekday = opts.byWeekday;
    this.byMonthDay = opts.byMonthDay;
  }

  /**
   * Generate N occurrences starting from start.
   */
  generate(start: Date, max: number = 100): Date[] {
    const result: Date[] = [];
    let current = new Date(start);
    result.push(new Date(current));
    let i = 1;
    while (i < max) {
      current = this.next(current);
      if (this.until && current.getTime() > this.until.getTime()) break;
      result.push(new Date(current));
      i += 1;
    }
    if (this.count) {
      return result.slice(0, this.count);
    }
    return result;
  }

  /**
   * Compute next occurrence after current.
   */
  next(current: Date): Date {
    const next = new Date(current);
    switch (this.freq) {
      case 'daily':
        next.setDate(next.getDate() + this.interval);
        break;
      case 'weekly':
        next.setDate(next.getDate() + 7 * this.interval);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + this.interval);
        break;
      case 'yearly':
        next.setFullYear(next.getFullYear() + this.interval);
        break;
    }
    return next;
  }

  /**
   * Check if a date matches the rule (within occurrence set).
   */
  matches(date: Date, start: Date): boolean {
    if (date.getTime() < start.getTime()) return false;
    if (this.until && date.getTime() > this.until.getTime()) return false;
    let current = new Date(start);
    while (current.getTime() <= date.getTime()) {
      if (current.getTime() === date.getTime()) return true;
      current = this.next(current);
      if (this.count) {
        // bounded search
        return false;
      }
    }
    return false;
  }

  /**
   * Static: daily every N days.
   */
  static daily(interval: number = 1, count?: number): RecurrenceRule {
    return new RecurrenceRule({ freq: 'daily', interval, count });
  }

  /**
   * Static: weekly every N weeks.
   */
  static weekly(interval: number = 1, count?: number): RecurrenceRule {
    return new RecurrenceRule({ freq: 'weekly', interval, count });
  }

  /**
   * Static: monthly every N months.
   */
  static monthly(interval: number = 1, count?: number): RecurrenceRule {
    return new RecurrenceRule({ freq: 'monthly', interval, count });
  }

  /**
   * Static: yearly every N years.
   */
  static yearly(interval: number = 1, count?: number): RecurrenceRule {
    return new RecurrenceRule({ freq: 'yearly', interval, count });
  }
}
