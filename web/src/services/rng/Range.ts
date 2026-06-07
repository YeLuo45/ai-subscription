/**
 * Range — interval/range operations
 */

export interface IRange {
  start: number;
  end: number;
}

export class Range {
  /**
   * Range from a to b (exclusive).
   */
  static create(a: number, b: number): number[] {
    if (b < a) return [];
    return Array.from({ length: b - a }, (_, i) => a + i);
  }

  /**
   * Range inclusive.
   */
  static inclusive(a: number, b: number): number[] {
    if (b < a) return [];
    return Array.from({ length: b - a + 1 }, (_, i) => a + i);
  }

  /**
   * Range with step.
   */
  static withStep(a: number, b: number, step: number = 1): number[] {
    if (step <= 0) throw new Error('Step must be positive');
    const result: number[] = [];
    if (b >= a) {
      for (let v = a; v <= b; v += step) result.push(v);
    } else {
      for (let v = a; v >= b; v -= step) result.push(v);
    }
    return result;
  }

  /**
   * Check if n in [start, end].
   */
  static contains(range: IRange, n: number): boolean {
    return n >= range.start && n <= range.end;
  }

  /**
   * Two ranges overlap.
   */
  static overlaps(a: IRange, b: IRange): boolean {
    return a.start <= b.end && b.start <= a.end;
  }

  /**
   * Intersection of two ranges.
   */
  static intersection(a: IRange, b: IRange): IRange | null {
    const start = Math.max(a.start, b.start);
    const end = Math.min(a.end, b.end);
    if (start > end) return null;
    return { start, end };
  }

  /**
   * Union (assumes overlapping or adjacent).
   */
  static union(a: IRange, b: IRange): IRange | null {
    if (!Range.overlaps(a, b) && a.end + 1 !== b.start && b.end + 1 !== a.start) return null;
    return { start: Math.min(a.start, b.start), end: Math.max(a.end, b.end) };
  }

  /**
   * Length of range.
   */
  static length(r: IRange): number {
    return r.end - r.start;
  }

  /**
   * Shift range.
   */
  static shift(r: IRange, offset: number): IRange {
    return { start: r.start + offset, end: r.end + offset };
  }

  /**
   * Subtract one range from another.
   */
  static subtract(a: IRange, b: IRange): IRange[] {
    if (!Range.overlaps(a, b)) return [a];
    const result: IRange[] = [];
    if (a.start < b.start) result.push({ start: a.start, end: b.start - 1 });
    if (a.end > b.end) result.push({ start: b.end + 1, end: a.end });
    return result;
  }

  /**
   * Check if range is valid.
   */
  static isValid(r: IRange): boolean {
    return r.start <= r.end;
  }
}
