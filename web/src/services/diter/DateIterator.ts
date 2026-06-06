/**
 * DateIterator — iterates dates with step
 *
 * Inspired by: Python datetime iteration
 *
 * Yields dates from start to end with configurable step.
 */

import type { Unit } from '../datemath/DateMath';
import { DateMath } from '../datemath/DateMath';

export class DateIterator implements Iterable<Date> {
  private start: Date;
  private end: Date;
  private step: number;
  private unit: Unit;

  constructor(start: Date, end: Date, step: number = 1, unit: Unit = 'day') {
    if (step === 0) throw new Error('step cannot be 0');
    this.start = new Date(start);
    this.end = new Date(end);
    this.step = step;
    this.unit = unit;
  }

  /**
   * Make iterator iterable.
   */
  *[Symbol.iterator](): Iterator<Date> {
    let current = new Date(this.start);
    if (this.step > 0) {
      while (current.getTime() <= this.end.getTime()) {
        yield new Date(current);
        current = DateMath.add(current, this.step, this.unit);
      }
    } else {
      while (current.getTime() >= this.end.getTime()) {
        yield new Date(current);
        current = DateMath.add(current, this.step, this.unit);
      }
    }
  }

  /**
   * Collect to array.
   */
  toArray(): Date[] {
    return Array.from(this);
  }

  /**
   * Get count of dates.
   */
  count(): number {
    let c = 0;
    for (const _ of this) c += 1;
    return c;
  }

  /**
   * Filter dates.
   */
  filter(pred: (date: Date) => boolean): Date[] {
    const result: Date[] = [];
    for (const d of this) {
      if (pred(d)) result.push(d);
    }
    return result;
  }

  /**
   * Map dates to other values.
   */
  map<R>(fn: (date: Date) => R): R[] {
    const result: R[] = [];
    for (const d of this) result.push(fn(d));
    return result;
  }

  /**
   * Get first N dates.
   */
  take(n: number): Date[] {
    const result: Date[] = [];
    let i = 0;
    for (const d of this) {
      if (i >= n) break;
      result.push(d);
      i += 1;
    }
    return result;
  }

  /**
   * Iterate daily.
   */
  static daily(start: Date, end: Date, step: number = 1): DateIterator {
    return new DateIterator(start, end, step, 'day');
  }

  /**
   * Iterate monthly.
   */
  static monthly(start: Date, end: Date, step: number = 1): DateIterator {
    return new DateIterator(start, end, step, 'month');
  }

  /**
   * Iterate yearly.
   */
  static yearly(start: Date, end: Date, step: number = 1): DateIterator {
    return new DateIterator(start, end, step, 'year');
  }
}
