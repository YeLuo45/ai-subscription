/**
 * FiscalYear — fiscal year calculations
 *
 * Inspired by: financial year (Apr-Mar UK, Oct-Sep US Fed)
 *
 * - Start month (1-12)
 * - Quarter calculation
 * - Year boundaries
 */

export class FiscalYear {
  /**
   * Get fiscal year for a date.
   * @param startMonth 1-12, default 1 (Jan)
   */
  static getYear(date: Date, startMonth: number = 1): number {
    if (startMonth === 1) return date.getFullYear();
    const m = date.getMonth() + 1; // 1-12
    if (m >= startMonth) return date.getFullYear();
    return date.getFullYear() - 1;
  }

  /**
   * Get fiscal quarter (1-4).
   */
  static getQuarter(date: Date, startMonth: number = 1): number {
    const m = date.getMonth() + 1;
    const adjusted = ((m - startMonth) + 12) % 12;
    return Math.floor(adjusted / 3) + 1;
  }

  /**
   * Get fiscal year start date.
   * `year` is the calendar year the FY starts in.
   */
  static getStart(year: number, startMonth: number = 1): Date {
    return new Date(year, startMonth - 1, 1);
  }

  /**
   * Get fiscal year end date.
   * FY ends one day before the start of next FY.
   */
  static getEnd(year: number, startMonth: number = 1): Date {
    const s = this.getStart(year, startMonth);
    return new Date(s.getFullYear() + 1, s.getMonth(), 0, 23, 59, 59, 999);
  }

  /**
   * Get fiscal year label like "FY24" or "FY2024".
   */
  static getLabel(date: Date, startMonth: number = 1, format: 'short' | 'long' = 'short'): string {
    const y = this.getYear(date, startMonth);
    if (format === 'long') return `FY${y}`;
    return `FY${y % 100 < 10 ? '0' + (y % 100) : y % 100}`;
  }

  /**
   * Get all fiscal years overlapping with a date range.
   */
  static getYearsInRange(start: Date, end: Date, startMonth: number = 1): number[] {
    const startFY = this.getYear(start, startMonth);
    const endFY = this.getYear(end, startMonth);
    const years: number[] = [];
    for (let y = startFY; y <= endFY; y++) years.push(y);
    return years;
  }

  /**
   * Get quarter start date.
   */
  static getQuarterStart(date: Date, startMonth: number = 1): Date {
    const q = this.getQuarter(date, startMonth);
    const fyStart = this.getStart(this.getYear(date, startMonth), startMonth);
    return new Date(fyStart.getFullYear(), fyStart.getMonth() + (q - 1) * 3, 1);
  }

  /**
   * Get quarter end date.
   */
  static getQuarterEnd(date: Date, startMonth: number = 1): Date {
    const qs = this.getQuarterStart(date, startMonth);
    return new Date(qs.getFullYear(), qs.getMonth() + 3, 0, 23, 59, 59, 999);
  }
}
