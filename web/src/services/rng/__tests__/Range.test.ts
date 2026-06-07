/**
 * Range.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Range } from '../Range';

describe('Range — create', () => {
  it('create', () => {
    expect(Range.create(0, 5)).toEqual([0, 1, 2, 3, 4]);
  });

  it('inclusive', () => {
    expect(Range.inclusive(1, 3)).toEqual([1, 2, 3]);
  });

  it('withStep', () => {
    expect(Range.withStep(0, 10, 2)).toEqual([0, 2, 4, 6, 8, 10]);
  });

  it('withStep negative', () => {
    expect(Range.withStep(10, 0, 2)).toEqual([10, 8, 6, 4, 2, 0]);
  });
});

describe('Range — ops', () => {
  it('contains', () => {
    expect(Range.contains({ start: 1, end: 10 }, 5)).toBe(true);
    expect(Range.contains({ start: 1, end: 10 }, 11)).toBe(false);
  });

  it('overlaps', () => {
    expect(Range.overlaps({ start: 1, end: 5 }, { start: 3, end: 7 })).toBe(true);
    expect(Range.overlaps({ start: 1, end: 5 }, { start: 6, end: 10 })).toBe(false);
  });

  it('intersection', () => {
    expect(Range.intersection({ start: 1, end: 5 }, { start: 3, end: 7 })).toEqual({ start: 3, end: 5 });
  });

  it('intersection empty', () => {
    expect(Range.intersection({ start: 1, end: 5 }, { start: 6, end: 10 })).toBeNull();
  });

  it('union', () => {
    expect(Range.union({ start: 1, end: 5 }, { start: 3, end: 7 })).toEqual({ start: 1, end: 7 });
  });

  it('length', () => {
    expect(Range.length({ start: 1, end: 5 })).toBe(4);
  });

  it('shift', () => {
    expect(Range.shift({ start: 1, end: 5 }, 10)).toEqual({ start: 11, end: 15 });
  });
});

describe('Range — subtract', () => {
  it('subtract overlap', () => {
    expect(Range.subtract({ start: 1, end: 10 }, { start: 3, end: 5 })).toEqual([
      { start: 1, end: 2 }, { start: 6, end: 10 },
    ]);
  });

  it('subtract full', () => {
    expect(Range.subtract({ start: 1, end: 5 }, { start: 1, end: 5 })).toEqual([]);
  });

  it('isValid', () => {
    expect(Range.isValid({ start: 1, end: 5 })).toBe(true);
    expect(Range.isValid({ start: 5, end: 1 })).toBe(false);
  });
});
