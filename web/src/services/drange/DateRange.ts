/**
 * DateRange — date interval operations
 *
 * Inspired by: date-fns / moment
 *
 * Represents an interval [start, end) with checks and operations.
 */

export class DateRange {
  readonly start: Date;
  readonly end: Date;

  constructor(start: Date, end: Date) {
    if (end.getTime() < start.getTime()) {
      throw new Error('DateRange: end must be >= start');
    }
    this.start = new Date(start);
    this.end = new Date(end);
  }

  /**
   * Get duration in milliseconds.
   */
  get durationMs(): number {
    return this.end.getTime() - this.start.getTime();
  }

  /**
   * Get duration in days.
   */
  get durationDays(): number {
    return this.durationMs / 86_400_000;
  }

  /**
   * Check if a date is within range (inclusive).
   */
  contains(date: Date): boolean {
    return date.getTime() >= this.start.getTime() && date.getTime() <= this.end.getTime();
  }

  /**
   * Check if two ranges overlap.
   */
  overlaps(other: DateRange): boolean {
    return this.start.getTime() <= other.end.getTime() && other.start.getTime() <= this.end.getTime();
  }

  /**
   * Get intersection of two ranges.
   */
  intersect(other: DateRange): DateRange | null {
    const start = new Date(Math.max(this.start.getTime(), other.start.getTime()));
    const end = new Date(Math.min(this.end.getTime(), other.end.getTime()));
    if (end.getTime() < start.getTime()) return null;
    return new DateRange(start, end);
  }

  /**
   * Get union of two ranges (assumes overlap or adjacency).
   */
  union(other: DateRange): DateRange {
    const start = new Date(Math.min(this.start.getTime(), other.start.getTime()));
    const end = new Date(Math.max(this.end.getTime(), other.end.getTime()));
    return new DateRange(start, end);
  }

  /**
   * Subtract another range from this one.
   * Returns at most 2 ranges (left, right).
   */
  subtract(other: DateRange): DateRange[] {
    if (!this.overlaps(other)) return [this];
    const result: DateRange[] = [];
    if (other.start.getTime() > this.start.getTime()) {
      result.push(new DateRange(this.start, new Date(other.start.getTime() - 1)));
    }
    if (other.end.getTime() < this.end.getTime()) {
      result.push(new DateRange(new Date(other.end.getTime() + 1), this.end));
    }
    return result;
  }

  /**
   * Check if range is empty.
   */
  get isEmpty(): boolean {
    return this.start.getTime() === this.end.getTime();
  }

  /**
   * Check if range spans whole day.
   */
  get isFullDay(): boolean {
    const s = new Date(this.start);
    s.setHours(0, 0, 0, 0);
    const e = new Date(this.end);
    e.setHours(23, 59, 59, 999);
    return s.getTime() === this.start.getTime() && e.getTime() === this.end.getTime();
  }

  /**
   * Split range into chunks.
   */
  split(chunkMs: number): DateRange[] {
    if (chunkMs <= 0) throw new Error('chunkMs must be > 0');
    const result: DateRange[] = [];
    let cur = new Date(this.start);
    while (cur.getTime() < this.end.getTime()) {
      const next = new Date(Math.min(cur.getTime() + chunkMs, this.end.getTime()));
      result.push(new DateRange(cur, next));
      cur = next;
    }
    return result;
  }

  /**
   * Iterate over dates in range.
   */
  forEach(callback: (date: Date) => void): void {
    let cur = new Date(this.start);
    while (cur.getTime() <= this.end.getTime()) {
      callback(new Date(cur));
      cur = new Date(cur.getTime() + 86_400_000);
    }
  }

  /**
   * Format as string.
   */
  toString(): string {
    return `[${this.start.toISOString()}, ${this.end.toISOString()})`;
  }
}
