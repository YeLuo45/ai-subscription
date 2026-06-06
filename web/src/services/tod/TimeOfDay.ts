/**
 * TimeOfDay — time within a day
 *
 * Inspired by: java.time.LocalTime
 *
 * Hours, minutes, seconds, milliseconds.
 */

export class TimeOfDay {
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
  readonly millisecond: number;

  constructor(hour: number = 0, minute: number = 0, second: number = 0, millisecond: number = 0) {
    if (hour < 0 || hour > 23) throw new Error('hour must be 0-23');
    if (minute < 0 || minute > 59) throw new Error('minute must be 0-59');
    if (second < 0 || second > 59) throw new Error('second must be 0-59');
    if (millisecond < 0 || millisecond > 999) throw new Error('millisecond must be 0-999');
    this.hour = hour;
    this.minute = minute;
    this.second = second;
    this.millisecond = millisecond;
  }

  /**
   * Total milliseconds since midnight.
   */
  toMs(): number {
    return this.hour * 3_600_000 + this.minute * 60_000 + this.second * 1000 + this.millisecond;
  }

  /**
   * Total seconds since midnight.
   */
  toSeconds(): number {
    return this.hour * 3600 + this.minute * 60 + this.second;
  }

  /**
   * Add milliseconds.
   */
  addMs(ms: number): TimeOfDay {
    const total = (this.toMs() + ms + 86_400_000) % 86_400_000;
    return TimeOfDay.fromMs(total);
  }

  /**
   * Add seconds.
   */
  addSeconds(s: number): TimeOfDay {
    return this.addMs(s * 1000);
  }

  /**
   * Add minutes.
   */
  addMinutes(m: number): TimeOfDay {
    return this.addMs(m * 60_000);
  }

  /**
   * Add hours.
   */
  addHours(h: number): TimeOfDay {
    return this.addMs(h * 3_600_000);
  }

  /**
   * Difference in milliseconds.
   */
  diffMs(other: TimeOfDay): number {
    return this.toMs() - other.toMs();
  }

  /**
   * Compare two times.
   */
  compare(other: TimeOfDay): number {
    return this.toMs() - other.toMs();
  }

  /**
   * Is before?
   */
  isBefore(other: TimeOfDay): boolean {
    return this.toMs() < other.toMs();
  }

  /**
   * Is after?
   */
  isAfter(other: TimeOfDay): boolean {
    return this.toMs() > other.toMs();
  }

  /**
   * Format as HH:mm:ss.
   */
  toString(): string {
    return `${String(this.hour).padStart(2, '0')}:${String(this.minute).padStart(2, '0')}:${String(this.second).padStart(2, '0')}`;
  }

  /**
   * Format with milliseconds.
   */
  toStringWithMs(): string {
    return `${this.toString()}.${String(this.millisecond).padStart(3, '0')}`;
  }

  /**
   * From total milliseconds.
   */
  static fromMs(ms: number): TimeOfDay {
    const m = ((ms % 86_400_000) + 86_400_000) % 86_400_000;
    const h = Math.floor(m / 3_600_000);
    const mn = Math.floor((m % 3_600_000) / 60_000);
    const s = Math.floor((m % 60_000) / 1000);
    const ms2 = m % 1000;
    return new TimeOfDay(h, mn, s, ms2);
  }

  /**
   * From Date.
   */
  static fromDate(date: Date): TimeOfDay {
    return new TimeOfDay(date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds());
  }

  /**
   * Parse "HH:mm:ss" or "HH:mm".
   */
  static parse(s: string): TimeOfDay | null {
    const m = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/);
    if (!m) return null;
    const h = parseInt(m[1], 10);
    const mn = parseInt(m[2], 10);
    const s2 = m[3] ? parseInt(m[3], 10) : 0;
    const ms = m[4] ? parseInt(m[4].padEnd(3, '0'), 10) : 0;
    try {
      return new TimeOfDay(h, mn, s2, ms);
    } catch {
      return null;
    }
  }

  /**
   * Now.
   */
  static now(): TimeOfDay {
    return TimeOfDay.fromDate(new Date());
  }

  /**
   * Midnight.
   */
  static midnight(): TimeOfDay {
    return new TimeOfDay(0, 0, 0, 0);
  }

  /**
   * Noon.
   */
  static noon(): TimeOfDay {
    return new TimeOfDay(12, 0, 0, 0);
  }
}
