/**
 * Duration.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Duration } from '../Duration';

describe('Duration — parse', () => {
  it('basic', () => {
    const d = Duration.parse('P3Y6M4DT12H30M5S');
    expect(d.years).toBe(3);
    expect(d.months).toBe(6);
    expect(d.days).toBe(4);
    expect(d.hours).toBe(12);
    expect(d.minutes).toBe(30);
    expect(d.seconds).toBe(5);
  });

  it('weeks', () => {
    const d = Duration.parse('P2W');
    expect(d.weeks).toBe(2);
  });

  it('time only', () => {
    const d = Duration.parse('PT1H');
    expect(d.hours).toBe(1);
  });

  it('invalid', () => {
    expect(() => Duration.parse('invalid')).toThrow();
  });
});

describe('Duration — toSeconds', () => {
  it('1 hour', () => {
    const d = Duration.parse('PT1H');
    expect(Duration.toSeconds(d)).toBe(3600);
  });

  it('1 day + 1 hour', () => {
    const d = Duration.parse('P1DT1H');
    expect(Duration.toSeconds(d)).toBe(25 * 3600);
  });
});

describe('Duration — fromSeconds', () => {
  it('60 sec', () => {
    expect(Duration.fromSeconds(60)).toBe('PT1M');
  });

  it('1 day', () => {
    expect(Duration.fromSeconds(86400)).toBe('P1D');
  });

  it('1h 30m', () => {
    expect(Duration.fromSeconds(3600 + 30 * 60)).toBe('PT1H30M');
  });
});

describe('Duration — humanize', () => {
  it('humanize', () => {
    const d = Duration.parse('P1DT2H');
    expect(Duration.humanize(d)).toBe('1d 2h');
  });
});

describe('Duration — isValid', () => {
  it('valid', () => {
    expect(Duration.isValid('P1Y2M3DT4H5M6S')).toBe(true);
  });

  it('invalid empty', () => {
    expect(Duration.isValid('P')).toBe(false);
  });
});
