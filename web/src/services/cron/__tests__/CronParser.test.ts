/**
 * CronParser.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { CronParser } from '../CronParser';

describe('CronParser — parse', () => {
  it('every minute', () => {
    const f = CronParser.parse('* * * * *');
    expect(f.minute.length).toBe(60);
    expect(f.hour.length).toBe(24);
  });

  it('specific minute', () => {
    const f = CronParser.parse('30 12 * * *');
    expect(f.minute).toEqual([30]);
    expect(f.hour).toEqual([12]);
  });

  it('range', () => {
    const f = CronParser.parse('0 9-17 * * *');
    expect(f.hour.length).toBe(9);
  });

  it('step', () => {
    const f = CronParser.parse('*/15 * * * *');
    expect(f.minute).toEqual([0, 15, 30, 45]);
  });

  it('list', () => {
    const f = CronParser.parse('0 9,12,18 * * *');
    expect(f.hour).toEqual([9, 12, 18]);
  });
});

describe('CronParser — validate', () => {
  it('valid', () => {
    expect(CronParser.isValid('0 12 * * *')).toBe(true);
  });

  it('invalid', () => {
    expect(CronParser.isValid('invalid')).toBe(false);
  });
});

describe('CronParser — next', () => {
  it('next at 12:00', () => {
    const from = new Date('2026-01-01T11:59:00');
    const n = CronParser.next('0 12 * * *', from);
    expect(n?.getHours()).toBe(12);
    expect(n?.getMinutes()).toBe(0);
  });

  it('next every minute', () => {
    const from = new Date('2026-01-01T11:00:00');
    const n = CronParser.next('* * * * *', from);
    expect(n).not.toBeNull();
  });
});

describe('CronParser — describe', () => {
  it('describe', () => {
    const s = CronParser.describe('0 12 * * *');
    expect(s).toContain('12');
  });
});
