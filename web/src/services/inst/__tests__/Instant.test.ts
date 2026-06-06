/**
 * Instant.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Instant } from '../Instant';

describe('Instant — basic', () => {
  it('now is recent', () => {
    const i = Instant.now();
    expect(Math.abs(i.millis - Date.now())).toBeLessThan(1000);
  });

  it('EPOCH', () => {
    expect(Instant.EPOCH().millis).toBe(0);
  });

  it('fromDate', () => {
    const d = new Date(2024, 0, 1);
    const i = Instant.fromDate(d);
    expect(i.millis).toBe(d.getTime());
  });

  it('toDate', () => {
    const i = new Instant(1000, 0);
    expect(i.toDate().getTime()).toBe(1000);
  });
});

describe('Instant — arithmetic', () => {
  it('plusMs', () => {
    const r = new Instant(100, 0).plusMs(50);
    expect(r.millis).toBe(150);
  });

  it('plusSeconds', () => {
    const r = new Instant(0).plusSeconds(60);
    expect(r.millis).toBe(60_000);
  });

  it('plusMinutes', () => {
    const r = new Instant(0).plusMinutes(5);
    expect(r.millis).toBe(300_000);
  });

  it('plusHours', () => {
    const r = new Instant(0).plusHours(2);
    expect(r.millis).toBe(7_200_000);
  });

  it('plusDays', () => {
    const r = new Instant(0).plusDays(1);
    expect(r.millis).toBe(86_400_000);
  });
});

describe('Instant — compare', () => {
  it('isBefore/isAfter', () => {
    const a = new Instant(100);
    const b = new Instant(200);
    expect(a.isBefore(b)).toBe(true);
    expect(b.isAfter(a)).toBe(true);
  });

  it('compare equal', () => {
    const a = new Instant(100);
    const b = new Instant(100);
    expect(a.compare(b)).toBe(0);
  });

  it('diffMs', () => {
    const a = new Instant(200);
    const b = new Instant(100);
    expect(a.diffMs(b)).toBe(100);
  });
});

describe('Instant — epoch nanos', () => {
  it('toEpochNanos is bigint', () => {
    const i = new Instant(1000, 500);
    const ns = i.toEpochNanos();
    expect(typeof ns).toBe('bigint');
    expect(ns).toBe(1_000_000_500n);
  });
});
