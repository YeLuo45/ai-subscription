/**
 * ISO8601 — ISO 8601 calendar helpers
 *
 * Inspired by: ISO 8601 calendar week
 *
 * - Ordinal date (day of year)
 * - ISO week number
 * - ISO week date (year-Wweek-d)
 * - Week-based year
 */

export class ISO8601 {
  /**
   * Get ordinal day (1-366).
   */
  static ordinalDay(date: Date): number {
    const start = Date.UTC(date.getUTCFullYear(), 0, 0);
    return Math.floor((date.getTime() - start) / 86_400_000);
  }

  /**
   * Get ISO week number (1-53).
   */
  static weekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const dayNum = (d.getUTCDay() + 6) % 7;
    d.setUTCDate(d.getUTCDate() - dayNum + 3);
    const firstThursday = d.getTime();
    d.setUTCMonth(0, 1);
    if (d.getUTCDay() !== 4) {
      d.setUTCMonth(0, 1 + ((4 - d.getUTCDay()) + 7) % 7);
    }
    return 1 + Math.ceil((firstThursday - d.getTime()) / (7 * 86_400_000));
  }

  /**
   * Get week-based year (ISO 8601).
   */
  static weekYear(date: Date): number {
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const dayNum = (d.getUTCDay() + 6) % 7;
    d.setUTCDate(d.getUTCDate() - dayNum + 3);
    if (d.getUTCMonth() >= 11 && d.getUTCDate() >= 29) return d.getUTCFullYear() + 1;
    if (d.getUTCMonth() <= 1 && d.getUTCDate() <= 3) return d.getUTCFullYear() - 1;
    return d.getUTCFullYear();
  }

  /**
   * Get ISO day of week (1-7, Monday=1).
   */
  static dayOfWeek(date: Date): number {
    return (date.getUTCDay() + 6) % 7 + 1;
  }

  /**
   * Format as ISO 8601 week date: YYYY-Www-d.
   */
  static weekDate(date: Date): string {
    const y = this.weekYear(date);
    const w = String(this.weekNumber(date)).padStart(2, '0');
    const d = this.dayOfWeek(date);
    return `${y}-W${w}-${d}`;
  }

  /**
   * Format as ISO 8601 ordinal date: YYYY-DDD.
   */
  static ordinalDate(date: Date): string {
    const y = date.getUTCFullYear();
    const d = String(this.ordinalDay(date)).padStart(3, '0');
    return `${y}-${d}`;
  }

  /**
   * Format as ISO 8601 date+time with offset.
   */
  static dateTime(date: Date): string {
    return date.toISOString();
  }

  /**
   * Number of weeks in a year (52 or 53).
   */
  static weeksInYear(year: number): number {
    const p = new Date(Date.UTC(year, 11, 28));
    return this.weekNumber(p) === 53 ? 53 : 52;
  }
}
