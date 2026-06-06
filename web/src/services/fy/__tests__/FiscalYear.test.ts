/**
 * FiscalYear.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { FiscalYear } from '../FiscalYear';

describe('FiscalYear — calendar (startMonth=1)', () => {
  it('getYear', () => {
    expect(FiscalYear.getYear(new Date(2024, 5, 1))).toBe(2024);
  });

  it('getQuarter', () => {
    expect(FiscalYear.getQuarter(new Date(2024, 0, 1))).toBe(1);
    expect(FiscalYear.getQuarter(new Date(2024, 5, 1))).toBe(2);
    expect(FiscalYear.getQuarter(new Date(2024, 6, 1))).toBe(3);
    expect(FiscalYear.getQuarter(new Date(2024, 9, 1))).toBe(4);
  });
});

describe('FiscalYear — UK (startMonth=4) starts Apr', () => {
  it('Apr 2024 is FY-starting-2024', () => {
    expect(FiscalYear.getYear(new Date(2024, 3, 1), 4)).toBe(2024);
  });

  it('Mar 2024 is FY-starting-2023', () => {
    expect(FiscalYear.getYear(new Date(2024, 2, 31), 4)).toBe(2023);
  });

  it('May 2024 is Q1 of UK FY (Apr-Jun)', () => {
    const d = new Date(2024, 4, 15);
    expect(FiscalYear.getQuarter(d, 4)).toBe(1);
  });

  it('Jul 2024 is Q2 of UK FY', () => {
    const d = new Date(2024, 6, 1);
    expect(FiscalYear.getQuarter(d, 4)).toBe(2);
  });
});

describe('FiscalYear — US Fed (startMonth=10) starts Oct', () => {
  it('Oct 2024 is FY-starting-2024', () => {
    expect(FiscalYear.getYear(new Date(2024, 9, 1), 10)).toBe(2024);
  });

  it('Sep 2024 is FY-starting-2023', () => {
    expect(FiscalYear.getYear(new Date(2024, 8, 30), 10)).toBe(2023);
  });
});

describe('FiscalYear — boundaries', () => {
  it('getStart calendar', () => {
    const s = FiscalYear.getStart(2024, 1);
    expect(s.getFullYear()).toBe(2024);
    expect(s.getMonth()).toBe(0);
  });

  it('getStart UK FY-starting-2024', () => {
    const s = FiscalYear.getStart(2024, 4);
    expect(s.getFullYear()).toBe(2024);
    expect(s.getMonth()).toBe(3);
  });

  it('getEnd UK FY-starting-2024 = Mar 31 2025', () => {
    const e = FiscalYear.getEnd(2024, 4);
    expect(e.getFullYear()).toBe(2025);
    expect(e.getMonth()).toBe(2);
    expect(e.getDate()).toBe(31);
  });
});

describe('FiscalYear — labels', () => {
  it('short label', () => {
    expect(FiscalYear.getLabel(new Date(2024, 5, 1), 1, 'short')).toBe('FY24');
  });

  it('long label', () => {
    expect(FiscalYear.getLabel(new Date(2024, 5, 1), 1, 'long')).toBe('FY2024');
  });
});

describe('FiscalYear — quarter start/end', () => {
  it('quarter start Q2 = Apr', () => {
    const d = new Date(2024, 4, 15); // May
    const qs = FiscalYear.getQuarterStart(d);
    expect(qs.getMonth()).toBe(3);
  });

  it('quarter end Q2 = Jun 30', () => {
    const d = new Date(2024, 4, 15);
    const qe = FiscalYear.getQuarterEnd(d);
    expect(qe.getMonth()).toBe(5); // Jun
    expect(qe.getDate()).toBe(30);
  });
});

describe('FiscalYear — years in range', () => {
  it('range spanning 2 years', () => {
    const years = FiscalYear.getYearsInRange(new Date(2023, 6, 1), new Date(2024, 5, 1));
    expect(years).toEqual([2023, 2024]);
  });
});
