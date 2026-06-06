/**
 * Calendar.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Calendar } from '../Calendar';

describe('Calendar — getMonthGrid', () => {
  it('Jan 2024 grid', () => {
    const g = Calendar.getMonthGrid(2024, 0);
    expect(g.length).toBeGreaterThanOrEqual(4);
    expect(g[0].length).toBe(7);
  });

  it('first week contains day 1', () => {
    const g = Calendar.getMonthGrid(2024, 0);
    const allDays = g.flat();
    const firstOfMonth = allDays.find((c) => c.day === 1 && c.isCurrentMonth);
    expect(firstOfMonth).toBeDefined();
  });

  it('Feb 2024 (leap) has 29 days', () => {
    const g = Calendar.getMonthGrid(2024, 1);
    const allDays = g.flat();
    const last29 = allDays.find((c) => c.day === 29 && c.isCurrentMonth);
    expect(last29).toBeDefined();
  });

  it('other month days are marked isCurrentMonth=false', () => {
    const g = Calendar.getMonthGrid(2024, 0);
    const otherDays = g.flat().filter((c) => !c.isCurrentMonth);
    expect(otherDays.length).toBeGreaterThan(0);
  });
});

describe('Calendar — weekdayNames', () => {
  it('Sunday start short', () => {
    expect(Calendar.weekdayNames(0, 'short')[0]).toBe('Sun');
  });

  it('Monday start', () => {
    expect(Calendar.weekdayNames(1, 'short')[0]).toBe('Mon');
  });

  it('long format', () => {
    expect(Calendar.weekdayNames(0, 'long')[6]).toBe('Saturday');
  });
});

describe('Calendar — monthName', () => {
  it('long', () => {
    expect(Calendar.monthName(0, 'long')).toBe('January');
  });

  it('short', () => {
    expect(Calendar.monthName(11, 'short')).toBe('Dec');
  });
});

describe('Calendar — weeksInMonth', () => {
  it('returns 4-6', () => {
    const w = Calendar.weeksInMonth(2024, 0);
    expect(w).toBeGreaterThanOrEqual(4);
    expect(w).toBeLessThanOrEqual(6);
  });
});
