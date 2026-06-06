/**
 * JulianDay — Julian Day Number conversion
 *
 * Inspired by: Astronomical Algorithms
 *
 * Convert between Gregorian date and Julian Day Number.
 * Also supports Modified Julian Day (MJD) and Julian Date.
 */

const J1970 = 2440588; // JD of Unix epoch (1970-01-01)
const J2000 = 2451545; // JD of J2000 epoch (2000-01-01)

export class JulianDay {
  /**
   * Convert Date to Julian Day Number.
   */
  static fromDate(date: Date): number {
    return date.getTime() / 86_400_000 - 0.5 + J1970;
  }

  /**
   * Convert Julian Day Number to Date.
   */
  static toDate(jd: number): Date {
    const ms = (jd + 0.5 - J1970) * 86_400_000;
    return new Date(ms);
  }

  /**
   * Get Modified Julian Day.
   */
  static modifiedJulianDay(date: Date): number {
    return this.fromDate(date) - 2400000.5;
  }

  /**
   * Get Julian century since J2000.
   */
  static julianCentury(date: Date): number {
    return (this.fromDate(date) - J2000) / 36525;
  }

  /**
   * Day of week from JD (0=Monday).
   */
  static dayOfWeek(jd: number): number {
    return Math.floor((jd + 1.5) % 7);
  }

  /**
   * Is leap year (Julian calendar).
   */
  static isJulianLeapYear(year: number): boolean {
    return year % 4 === 0;
  }

  /**
   * Days in Julian month.
   */
  static daysInJulianMonth(year: number, month: number): number {
    if (month === 2) return JulianDay.isJulianLeapYear(year) ? 29 : 28;
    return [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  }
}
