/**
 * UnixTime — Unix timestamp utilities
 *
 * Inspired by: unix-time / dayjs.unix
 *
 * Seconds-based and milliseconds-based timestamps.
 */

export class UnixTime {
  /**
   * Get current Unix timestamp in seconds.
   */
  static now(): number {
    return Math.floor(Date.now() / 1000);
  }

  /**
   * Get current Unix timestamp in milliseconds.
   */
  static nowMs(): number {
    return Date.now();
  }

  /**
   * Date to Unix seconds.
   */
  static fromDate(date: Date): number {
    return Math.floor(date.getTime() / 1000);
  }

  /**
   * Date to Unix milliseconds.
   */
  static fromDateMs(date: Date): number {
    return date.getTime();
  }

  /**
   * Unix seconds to Date.
   */
  static toDate(seconds: number): Date {
    return new Date(seconds * 1000);
  }

  /**
   * Unix milliseconds to Date.
   */
  static toDateFromMs(ms: number): Date {
    return new Date(ms);
  }

  /**
   * Format Unix seconds as human string.
   */
  static toHuman(seconds: number): string {
    const d = this.toDate(seconds);
    return d.toISOString();
  }

  /**
   * Add seconds to Unix time.
   */
  static addSeconds(seconds: number, n: number): number {
    return seconds + n;
  }

  /**
   * Add minutes to Unix time.
   */
  static addMinutes(seconds: number, n: number): number {
    return seconds + n * 60;
  }

  /**
   * Add hours to Unix time.
   */
  static addHours(seconds: number, n: number): number {
    return seconds + n * 3600;
  }

  /**
   * Add days to Unix time.
   */
  static addDays(seconds: number, n: number): number {
    return seconds + n * 86_400;
  }

  /**
   * Difference in seconds.
   */
  static diff(a: number, b: number): number {
    return a - b;
  }

  /**
   * Is in past?
   */
  static isPast(seconds: number): boolean {
    return seconds < this.now();
  }

  /**
   * Is in future?
   */
  static isFuture(seconds: number): boolean {
    return seconds > this.now();
  }
}
