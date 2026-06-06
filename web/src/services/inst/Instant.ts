/**
 * Instant — high-resolution time point
 *
 * Inspired by: java.time.Instant
 *
 * Time point with nanosecond precision stored as ms + ns offset.
 */

export class Instant {
  readonly millis: number;
  readonly nanos: number;

  constructor(millis: number = 0, nanos: number = 0) {
    this.millis = millis;
    this.nanos = nanos;
  }

  /**
   * Current instant.
   */
  static now(): Instant {
    const ms = Date.now();
    return new Instant(ms, 0);
  }

  /**
   * From Date.
   */
  static fromDate(date: Date): Instant {
    return new Instant(date.getTime(), 0);
  }

  /**
   * From epoch milliseconds.
   */
  static fromEpochMs(ms: number): Instant {
    return new Instant(ms, 0);
  }

  /**
   * To Date.
   */
  toDate(): Date {
    return new Date(this.millis);
  }

  /**
   * Total milliseconds.
   */
  toEpochMs(): number {
    return this.millis;
  }

  /**
   * Total nanoseconds (approximate).
   */
  toEpochNanos(): bigint {
    return BigInt(this.millis) * 1_000_000n + BigInt(this.nanos);
  }

  /**
   * Plus milliseconds.
   */
  plusMs(ms: number): Instant {
    return new Instant(this.millis + ms, this.nanos);
  }

  /**
   * Plus seconds.
   */
  plusSeconds(s: number): Instant {
    return this.plusMs(s * 1000);
  }

  /**
   * Plus minutes.
   */
  plusMinutes(m: number): Instant {
    return this.plusMs(m * 60_000);
  }

  /**
   * Plus hours.
   */
  plusHours(h: number): Instant {
    return this.plusMs(h * 3_600_000);
  }

  /**
   * Plus days.
   */
  plusDays(d: number): Instant {
    return this.plusMs(d * 86_400_000);
  }

  /**
   * Difference in milliseconds.
   */
  diffMs(other: Instant): number {
    return this.millis - other.millis;
  }

  /**
   * Compare two instants.
   */
  compare(other: Instant): number {
    if (this.millis !== other.millis) return this.millis - other.millis;
    return this.nanos - other.nanos;
  }

  /**
   * Is before?
   */
  isBefore(other: Instant): boolean {
    return this.compare(other) < 0;
  }

  /**
   * Is after?
   */
  isAfter(other: Instant): boolean {
    return this.compare(other) > 0;
  }

  /**
   * Epoch.
   */
  static EPOCH(): Instant {
    return new Instant(0, 0);
  }
}
