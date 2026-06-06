/**
 * DateComparator — multi-field date comparison
 *
 * Inspired by: Comparator / sort
 *
 * Compare by year, month, day, hour, etc. in any priority order.
 */

export type DateField = 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second' | 'millisecond' | 'weekday';

export class DateComparator {
  /**
   * Build comparator for a list of fields with direction.
   */
  static by(...fields: Array<{ field: DateField; direction?: 'asc' | 'desc' }>): (a: Date, b: Date) => number {
    return (a: Date, b: Date) => {
      for (const { field, direction = 'asc' } of fields) {
        const va = this.getField(a, field);
        const vb = this.getField(b, field);
        if (va < vb) return direction === 'asc' ? -1 : 1;
        if (va > vb) return direction === 'asc' ? 1 : -1;
      }
      return 0;
    };
  }

  /**
   * Sort array of dates in place.
   */
  static sort(dates: Date[], ...fields: Array<{ field: DateField; direction?: 'asc' | 'desc' }>): Date[] {
    const cmp = this.by(...fields);
    return dates.sort(cmp);
  }

  /**
   * Find min date by comparator.
   */
  static minBy(dates: Date[], ...fields: Array<{ field: DateField; direction?: 'asc' | 'desc' }>): Date | null {
    if (dates.length === 0) return null;
    const cmp = this.by(...fields);
    return dates.reduce((min, d) => (cmp(d, min) < 0 ? d : min));
  }

  /**
   * Find max date by comparator.
   */
  static maxBy(dates: Date[], ...fields: Array<{ field: DateField; direction?: 'asc' | 'desc' }>): Date | null {
    if (dates.length === 0) return null;
    const cmp = this.by(...fields);
    return dates.reduce((max, d) => (cmp(d, max) > 0 ? d : max));
  }

  /**
   * Group dates by a field.
   */
  static groupBy(dates: Date[], field: DateField): Map<number, Date[]> {
    const map = new Map<number, Date[]>();
    for (const d of dates) {
      const v = this.getField(d, field);
      if (!map.has(v)) map.set(v, []);
      map.get(v)!.push(d);
    }
    return map;
  }

  /**
   * Unique dates by field.
   */
  static uniqueBy(dates: Date[], field: DateField): Date[] {
    const seen = new Set<number>();
    const result: Date[] = [];
    for (const d of dates) {
      const v = this.getField(d, field);
      if (!seen.has(v)) {
        seen.add(v);
        result.push(d);
      }
    }
    return result;
  }

  private static getField(d: Date, field: DateField): number {
    switch (field) {
      case 'year': return d.getFullYear();
      case 'month': return d.getMonth();
      case 'day': return d.getDate();
      case 'hour': return d.getHours();
      case 'minute': return d.getMinutes();
      case 'second': return d.getSeconds();
      case 'millisecond': return d.getMilliseconds();
      case 'weekday': return d.getDay();
    }
  }
}
