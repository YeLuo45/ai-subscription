/**
 * CronParser — simplified cron expression parser
 *
 * Inspired by: cron-parser / node-cron
 *
 * Format: minute hour dayOfMonth month dayOfWeek
 */

const FIELD_RANGES: Array<[number, number]> = [
  [0, 59], // minute
  [0, 23], // hour
  [1, 31], // day of month
  [1, 12], // month
  [0, 6],  // day of week
];

export class CronParser {
  /**
   * Parse cron expression into field values.
   */
  static parse(expr: string): {
    minute: number[]; hour: number[]; dayOfMonth: number[]; month: number[]; dayOfWeek: number[];
  } {
    const parts = expr.trim().split(/\s+/);
    if (parts.length !== 5) throw new Error('Cron must have 5 fields');
    return {
      minute: CronParser._parseField(parts[0], 0),
      hour: CronParser._parseField(parts[1], 1),
      dayOfMonth: CronParser._parseField(parts[2], 2),
      month: CronParser._parseField(parts[3], 3),
      dayOfWeek: CronParser._parseField(parts[4], 4),
    };
  }

  /**
   * Check if cron expression is valid.
   */
  static isValid(expr: string): boolean {
    try { CronParser.parse(expr); return true; } catch { return false; }
  }

  /**
   * Get next execution time.
   */
  static next(expr: string, from: Date = new Date()): Date | null {
    const fields = CronParser.parse(expr);
    const next = new Date(from.getTime() + 60_000);
    next.setSeconds(0, 0);
    for (let i = 0; i < 366 * 24 * 60; i++) {
      if (
        fields.minute.includes(next.getMinutes()) &&
        fields.hour.includes(next.getHours()) &&
        fields.dayOfMonth.includes(next.getDate()) &&
        fields.month.includes(next.getMonth() + 1) &&
        fields.dayOfWeek.includes(next.getDay())
      ) {
        return next;
      }
      next.setMinutes(next.getMinutes() + 1);
    }
    return null;
  }

  /**
   * Describe cron expression in English.
   */
  static describe(expr: string): string {
    const f = CronParser.parse(expr);
    return `Every ${f.minute.length === 1 ? f.minute[0] : `${f.minute.length} mins`} at ${f.hour.length === 1 ? f.hour[0] + ':00' : `${f.hour.length} hours`}`;
  }

  private static _parseField(value: string, fieldIdx: number): number[] {
    const [min, max] = FIELD_RANGES[fieldIdx];
    const values = new Set<number>();
    for (const part of value.split(',')) {
      if (part === '*') {
        for (let i = min; i <= max; i++) values.add(i);
      } else if (part.includes('/')) {
        const [range, step] = part.split('/');
        const stepN = parseInt(step, 10);
        const [start, end] = range === '*' ? [min, max] : (() => {
          const [a, b] = range.split('-').map((x) => parseInt(x, 10));
          return [a, b ?? max];
        })();
        for (let i = start; i <= end; i += stepN) values.add(i);
      } else if (part.includes('-')) {
        const [a, b] = part.split('-').map((x) => parseInt(x, 10));
        for (let i = a; i <= b; i++) values.add(i);
      } else {
        values.add(parseInt(part, 10));
      }
    }
    return Array.from(values).sort((a, b) => a - b);
  }
}
