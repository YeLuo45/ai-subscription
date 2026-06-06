/**
 * CronParser — 5-field cron expression parser
 *
 * Inspired by: cron-parser, croner
 *
 * Standard 5-field cron: minute hour day-of-month month day-of-week
 * Supports:
 *   - * (any)
 *   - specific values: 5
 *   - ranges: 1-5
 *   - steps: * / 5, 1-10 / 2
 *   - lists: 1,3,5
 *   - special: L (last), ? (no specific)
 */

export interface CronField {
  values: number[];
  raw: string;
}

export interface ParsedCron {
  minute: CronField;
  hour: CronField;
  dayOfMonth: CronField;
  month: CronField;
  dayOfWeek: CronField;
  raw: string;
}

export class CronParser {
  private static readonly FIELD_RANGES: Array<[number, number]> = [
    [0, 59],   // minute
    [0, 23],   // hour
    [1, 31],   // day of month
    [1, 12],   // month
    [0, 6],    // day of week (Sunday=0)
  ];

  parse(expression: string): ParsedCron {
    const parts = expression.trim().split(/\s+/);
    if (parts.length !== 5) {
      throw new Error(`Expected 5 fields, got ${parts.length}`);
    }
    return {
      minute: this.parseField(parts[0], 0),
      hour: this.parseField(parts[1], 1),
      dayOfMonth: this.parseField(parts[2], 2),
      month: this.parseField(parts[3], 3),
      dayOfWeek: this.parseField(parts[4], 4),
      raw: expression,
    };
  }

  private parseField(spec: string, fieldIdx: number): CronField {
    const [min, max] = CronParser.FIELD_RANGES[fieldIdx];
    const values = new Set<number>();
    for (const part of spec.split(',')) {
      const expanded = this.expandPart(part, min, max);
      for (const v of expanded) values.add(v);
    }
    return { values: Array.from(values).sort((a, b) => a - b), raw: spec };
  }

  private expandPart(part: string, min: number, max: number): number[] {
    if (part === '*') {
      return this.range(min, max, 1);
    }
    if (part === '?') {
      return [min];
    }
    const stepMatch = part.match(/^(.+)\/(\d+)$/);
    if (stepMatch) {
      const step = parseInt(stepMatch[2], 10);
      const base = stepMatch[1];
      const range = base === '*' ? [min, max] : this.parseRange(base, min, max);
      return this.range(range[0], range[1], step);
    }
    if (part.includes('-')) {
      const range = this.parseRange(part, min, max);
      return this.range(range[0], range[1], 1);
    }
    const n = parseInt(part, 10);
    if (!isNaN(n) && n >= min && n <= max) {
      return [n];
    }
    return [];
  }

  private parseRange(part: string, min: number, max: number): [number, number] {
    const [a, b] = part.split('-').map((s) => parseInt(s, 10));
    return [a, b];
  }

  private range(min: number, max: number, step: number): number[] {
    const out: number[] = [];
    for (let i = min; i <= max; i += step) out.push(i);
    return out;
  }

  /**
   * Check if a given date matches the cron expression.
   */
  matches(parsed: ParsedCron, date: Date): boolean {
    return (
      parsed.minute.values.includes(date.getMinutes()) &&
      parsed.hour.values.includes(date.getHours()) &&
      parsed.dayOfMonth.values.includes(date.getDate()) &&
      parsed.month.values.includes(date.getMonth() + 1) &&
      parsed.dayOfWeek.values.includes(date.getDay())
    );
  }

  /**
   * Get next N matching dates after a given date.
   */
  next(parsed: ParsedCron, after: Date, count: number = 1): Date[] {
    const out: Date[] = [];
    const d = new Date(after.getTime() + 60_000);
    d.setSeconds(0, 0);
    let attempts = 0;
    while (out.length < count && attempts < 366 * 24 * 60) {
      if (this.matches(parsed, d)) {
        out.push(new Date(d));
      }
      d.setMinutes(d.getMinutes() + 1);
      attempts += 1;
    }
    return out;
  }
}
