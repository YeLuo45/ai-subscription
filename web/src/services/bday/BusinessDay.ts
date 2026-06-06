/**
 * BusinessDay — business day calculations
 *
 * Inspired by: business-time npm
 *
 * - check if date is business day
 * - add/subtract business days
 * - count business days in range
 */

export class BusinessDay {
  /**
   * Is a business day (Mon-Fri, not in holidays)?
   */
  static isBusinessDay(date: Date, holidays: Set<string> = new Set()): boolean {
    const day = date.getDay();
    if (day === 0 || day === 6) return false;
    const key = this.toKey(date);
    return !holidays.has(key);
  }

  /**
   * Add N business days.
   */
  static addBusinessDays(date: Date, n: number, holidays: Set<string> = new Set()): Date {
    const d = new Date(date);
    const step = n >= 0 ? 1 : -1;
    let remaining = Math.abs(n);
    while (remaining > 0) {
      d.setDate(d.getDate() + step);
      if (this.isBusinessDay(d, holidays)) {
        remaining -= 1;
      }
    }
    return d;
  }

  /**
   * Count business days in a range.
   */
  static countBusinessDays(start: Date, end: Date, holidays: Set<string> = new Set()): number {
    let count = 0;
    const d = new Date(start);
    while (d.getTime() <= end.getTime()) {
      if (this.isBusinessDay(d, holidays)) count += 1;
      d.setDate(d.getDate() + 1);
    }
    return count;
  }

  /**
   * Get next business day.
   */
  static nextBusinessDay(date: Date, holidays: Set<string> = new Set()): Date {
    return this.addBusinessDays(date, 1, holidays);
  }

  /**
   * Get previous business day.
   */
  static previousBusinessDay(date: Date, holidays: Set<string> = new Set()): Date {
    return this.addBusinessDays(date, -1, holidays);
  }

  /**
   * Is weekend?
   */
  static isWeekend(date: Date): boolean {
    const d = date.getDay();
    return d === 0 || d === 6;
  }

  /**
   * Is weekday?
   */
  static isWeekday(date: Date): boolean {
    return !this.isWeekend(date);
  }

  /**
   * Convert date to YYYY-MM-DD key for Set lookup.
   */
  static toKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
