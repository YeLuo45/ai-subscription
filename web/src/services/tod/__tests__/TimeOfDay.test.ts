/**
 * TimeOfDay.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { TimeOfDay } from '../TimeOfDay';

describe('TimeOfDay — basic', () => {
  it('throws on invalid hour', () => {
    expect(() => new TimeOfDay(24)).toThrow();
  });

  it('throws on invalid minute', () => {
    expect(() => new TimeOfDay(0, 60)).toThrow();
  });

  it('toMs', () => {
    expect(new TimeOfDay(1, 0).toMs()).toBe(3_600_000);
  });

  it('toSeconds', () => {
    expect(new TimeOfDay(1, 0, 0).toSeconds()).toBe(3600);
  });
});

describe('TimeOfDay — arithmetic', () => {
  it('addMs', () => {
    const t = new TimeOfDay(0, 0, 0, 0).addMs(1000);
    expect(t.second).toBe(1);
  });

  it('addMinutes', () => {
    const t = new TimeOfDay(0, 0, 0).addMinutes(30);
    expect(t.minute).toBe(30);
  });

  it('addHours wraps', () => {
    const t = new TimeOfDay(23, 0, 0).addHours(2);
    expect(t.hour).toBe(1);
  });
});

describe('TimeOfDay — compare', () => {
  it('isBefore', () => {
    expect(new TimeOfDay(1).isBefore(new TimeOfDay(2))).toBe(true);
  });

  it('isAfter', () => {
    expect(new TimeOfDay(2).isAfter(new TimeOfDay(1))).toBe(true);
  });

  it('diffMs', () => {
    expect(new TimeOfDay(2).diffMs(new TimeOfDay(1))).toBe(3_600_000);
  });
});

describe('TimeOfDay — format', () => {
  it('toString', () => {
    expect(new TimeOfDay(13, 5, 9).toString()).toBe('13:05:09');
  });

  it('toStringWithMs', () => {
    expect(new TimeOfDay(13, 5, 9, 123).toStringWithMs()).toBe('13:05:09.123');
  });
});

describe('TimeOfDay — parse', () => {
  it('parses HH:mm', () => {
    const t = TimeOfDay.parse('13:05')!;
    expect(t.hour).toBe(13);
  });

  it('parses HH:mm:ss', () => {
    const t = TimeOfDay.parse('13:05:30')!;
    expect(t.second).toBe(30);
  });

  it('parses with ms', () => {
    const t = TimeOfDay.parse('13:05:30.500')!;
    expect(t.millisecond).toBe(500);
  });

  it('rejects invalid', () => {
    expect(TimeOfDay.parse('garbage')).toBe(null);
  });
});

describe('TimeOfDay — static', () => {
  it('fromMs', () => {
    const t = TimeOfDay.fromMs(3661_000);
    expect(t.hour).toBe(1);
    expect(t.minute).toBe(1);
    expect(t.second).toBe(1);
  });

  it('fromDate', () => {
    const t = TimeOfDay.fromDate(new Date(2024, 5, 1, 14, 30, 45));
    expect(t.hour).toBe(14);
  });

  it('midnight/noon', () => {
    expect(TimeOfDay.midnight().hour).toBe(0);
    expect(TimeOfDay.noon().hour).toBe(12);
  });
});
