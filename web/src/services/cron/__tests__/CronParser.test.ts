/**
 * CronParser.test.ts — Pure unit tests for cron parser
 */

import { describe, it, expect } from 'vitest';
import { CronParser } from '../CronParser';

describe('CronParser — basic', () => {
  it('parses * * * * *', () => {
    const r = new CronParser().parse('* * * * *');
    expect(r.minute.values.length).toBe(60);
    expect(r.hour.values.length).toBe(24);
  });

  it('parses specific minute', () => {
    const r = new CronParser().parse('30 * * * *');
    expect(r.minute.values).toEqual([30]);
  });

  it('parses specific hour', () => {
    const r = new CronParser().parse('0 14 * * *');
    expect(r.hour.values).toEqual([14]);
  });

  it('parses day of month', () => {
    const r = new CronParser().parse('0 0 15 * *');
    expect(r.dayOfMonth.values).toEqual([15]);
  });

  it('parses month', () => {
    const r = new CronParser().parse('0 0 1 6 *');
    expect(r.month.values).toEqual([6]);
  });

  it('parses day of week', () => {
    const r = new CronParser().parse('0 0 * * 0');
    expect(r.dayOfWeek.values).toEqual([0]);
  });
});

describe('CronParser — ranges', () => {
  it('range 1-5', () => {
    const r = new CronParser().parse('0 9-17 * * *');
    expect(r.hour.values).toEqual([9, 10, 11, 12, 13, 14, 15, 16, 17]);
  });
});

describe('CronParser — steps', () => {
  it('every 15 minutes', () => {
    const r = new CronParser().parse('*/15 * * * *');
    expect(r.minute.values).toEqual([0, 15, 30, 45]);
  });

  it('range with step', () => {
    const r = new CronParser().parse('0 9-17/2 * * *');
    expect(r.hour.values).toEqual([9, 11, 13, 15, 17]);
  });
});

describe('CronParser — lists', () => {
  it('comma list', () => {
    const r = new CronParser().parse('0,15,30,45 * * * *');
    expect(r.minute.values).toEqual([0, 15, 30, 45]);
  });
});

describe('CronParser — invalid', () => {
  it('rejects wrong field count', () => {
    expect(() => new CronParser().parse('* * *')).toThrow();
  });
});

describe('CronParser — matches', () => {
  it('matches specific time', () => {
    const p = new CronParser().parse('30 14 * * *');
    const d = new Date(2024, 0, 1, 14, 30, 0);
    expect(new CronParser().matches(p, d)).toBe(true);
  });

  it('does not match', () => {
    const p = new CronParser().parse('0 14 * * *');
    const d = new Date(2024, 0, 1, 15, 0, 0);
    expect(new CronParser().matches(p, d)).toBe(false);
  });
});
