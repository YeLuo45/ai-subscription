/**
 * RecurrenceRule.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { RecurrenceRule } from '../RecurrenceRule';

describe('RecurrenceRule — basic', () => {
  it('throws on invalid interval', () => {
    expect(() => new RecurrenceRule({ freq: 'daily', interval: 0 })).toThrow();
  });

  it('daily generates', () => {
    const r = RecurrenceRule.daily();
    const dates = r.generate(new Date(2024, 0, 1), 5);
    expect(dates.length).toBe(5);
    expect(dates[1].getDate()).toBe(2);
  });

  it('weekly generates', () => {
    const r = RecurrenceRule.weekly();
    const dates = r.generate(new Date(2024, 0, 1), 3);
    expect(dates[1].getDate()).toBe(8);
  });

  it('monthly generates', () => {
    const r = RecurrenceRule.monthly();
    const dates = r.generate(new Date(2024, 0, 1), 3);
    expect(dates[1].getMonth()).toBe(1);
  });

  it('yearly generates', () => {
    const r = RecurrenceRule.yearly();
    const dates = r.generate(new Date(2024, 0, 1), 3);
    expect(dates[2].getFullYear()).toBe(2026);
  });
});

describe('RecurrenceRule — interval', () => {
  it('every 3 days', () => {
    const r = RecurrenceRule.daily(3);
    const dates = r.generate(new Date(2024, 0, 1), 4);
    expect(dates[1].getDate()).toBe(4);
    expect(dates[2].getDate()).toBe(7);
  });
});

describe('RecurrenceRule — count', () => {
  it('count limits', () => {
    const r = RecurrenceRule.daily(1, 3);
    const dates = r.generate(new Date(2024, 0, 1), 100);
    expect(dates.length).toBe(3);
  });
});

describe('RecurrenceRule — until', () => {
  it('stops at until', () => {
    const r = new RecurrenceRule({ freq: 'daily', until: new Date(2024, 0, 5) });
    const dates = r.generate(new Date(2024, 0, 1), 100);
    expect(dates.length).toBe(5);
  });
});

describe('RecurrenceRule — matches', () => {
  it('matches occurrence', () => {
    const r = RecurrenceRule.daily();
    expect(r.matches(new Date(2024, 0, 5), new Date(2024, 0, 1))).toBe(true);
  });

  it('rejects non-occurrence', () => {
    const r = RecurrenceRule.daily(2);
    expect(r.matches(new Date(2024, 0, 2), new Date(2024, 0, 1))).toBe(false);
  });
});
