/**
 * UnixTime.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { UnixTime } from '../UnixTime';

describe('UnixTime — basic', () => {
  it('now is positive', () => {
    expect(UnixTime.now()).toBeGreaterThan(0);
  });

  it('nowMs > now * 1000', () => {
    expect(UnixTime.nowMs()).toBeGreaterThan(UnixTime.now() * 1000 - 1000);
  });
});

describe('UnixTime — from/to', () => {
  it('fromDate/toDate round trip', () => {
    const d = new Date(2024, 0, 1);
    const s = UnixTime.fromDate(d);
    const d2 = UnixTime.toDate(s);
    expect(d2.getTime()).toBe(Math.floor(d.getTime() / 1000) * 1000);
  });

  it('fromDateMs/toDateFromMs', () => {
    const d = new Date(2024, 0, 1);
    const ms = UnixTime.fromDateMs(d);
    expect(UnixTime.toDateFromMs(ms)).toEqual(d);
  });
});

describe('UnixTime — arithmetic', () => {
  it('addSeconds', () => {
    expect(UnixTime.addSeconds(1000, 60)).toBe(1060);
  });

  it('addMinutes', () => {
    expect(UnixTime.addMinutes(1000, 5)).toBe(1300);
  });

  it('addHours', () => {
    expect(UnixTime.addHours(1000, 2)).toBe(8200);
  });

  it('addDays', () => {
    expect(UnixTime.addDays(0, 1)).toBe(86_400);
  });

  it('diff', () => {
    expect(UnixTime.diff(2000, 1000)).toBe(1000);
  });
});

describe('UnixTime — past/future', () => {
  it('past', () => {
    expect(UnixTime.isPast(UnixTime.now() - 1000)).toBe(true);
  });

  it('future', () => {
    expect(UnixTime.isFuture(UnixTime.now() + 1000)).toBe(true);
  });

  it('toHuman', () => {
    const h = UnixTime.toHuman(0);
    expect(h).toBe('1970-01-01T00:00:00.000Z');
  });
});
