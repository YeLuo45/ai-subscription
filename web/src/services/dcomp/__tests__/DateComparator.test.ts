/**
 * DateComparator.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { DateComparator } from '../DateComparator';

describe('DateComparator — by', () => {
  it('compare by year asc', () => {
    const cmp = DateComparator.by({ field: 'year' });
    expect(cmp(new Date(2023, 0, 1), new Date(2024, 0, 1))).toBeLessThan(0);
  });

  it('compare by year desc', () => {
    const cmp = DateComparator.by({ field: 'year', direction: 'desc' });
    expect(cmp(new Date(2023, 0, 1), new Date(2024, 0, 1))).toBeGreaterThan(0);
  });

  it('multi-field: year then month', () => {
    const cmp = DateComparator.by({ field: 'year' }, { field: 'month' });
    const a = new Date(2024, 0, 1);
    const b = new Date(2024, 5, 1);
    expect(cmp(a, b)).toBeLessThan(0);
  });

  it('equal dates return 0', () => {
    const cmp = DateComparator.by({ field: 'year' });
    expect(cmp(new Date(2024, 0, 1), new Date(2024, 0, 1))).toBe(0);
  });
});

describe('DateComparator — sort', () => {
  it('sorts by year', () => {
    const dates = [new Date(2023, 0, 1), new Date(2024, 0, 1), new Date(2022, 0, 1)];
    DateComparator.sort(dates, { field: 'year' });
    expect(dates[0].getFullYear()).toBe(2022);
  });

  it('sorts by year desc', () => {
    const dates = [new Date(2023, 0, 1), new Date(2024, 0, 1), new Date(2022, 0, 1)];
    DateComparator.sort(dates, { field: 'year', direction: 'desc' });
    expect(dates[0].getFullYear()).toBe(2024);
  });
});

describe('DateComparator — min/max', () => {
  const dates = [new Date(2023, 0, 1), new Date(2024, 0, 1), new Date(2022, 0, 1)];

  it('minBy year', () => {
    expect(DateComparator.minBy(dates, { field: 'year' })!.getFullYear()).toBe(2022);
  });

  it('maxBy year', () => {
    expect(DateComparator.maxBy(dates, { field: 'year' })!.getFullYear()).toBe(2024);
  });

  it('minBy empty', () => {
    expect(DateComparator.minBy([], { field: 'year' })).toBe(null);
  });
});

describe('DateComparator — groupBy', () => {
  it('group by year', () => {
    const dates = [new Date(2023, 0, 1), new Date(2023, 5, 1), new Date(2024, 0, 1)];
    const groups = DateComparator.groupBy(dates, 'year');
    expect(groups.get(2023)?.length).toBe(2);
    expect(groups.get(2024)?.length).toBe(1);
  });
});

describe('DateComparator — uniqueBy', () => {
  it('unique by year', () => {
    const dates = [new Date(2023, 0, 1), new Date(2023, 5, 1), new Date(2024, 0, 1)];
    const uniq = DateComparator.uniqueBy(dates, 'year');
    expect(uniq.length).toBe(2);
  });
});
