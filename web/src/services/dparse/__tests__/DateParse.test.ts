/**
 * DateParse.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { DateParse } from '../DateParse';

describe('DateParse — ISO 8601', () => {
  it('parses YYYY-MM-DD', () => {
    const d = DateParse.parseISO('2024-01-15');
    expect(d).not.toBe(null);
    expect(d!.getUTCFullYear()).toBe(2024);
  });

  it('parses YYYY-MM-DDTHH:mm:ss', () => {
    const d = DateParse.parseISO('2024-01-15T13:30:00');
    expect(d).not.toBe(null);
  });

  it('parses with Z', () => {
    const d = DateParse.parseISO('2024-01-15T13:30:00Z');
    expect(d).not.toBe(null);
  });

  it('parses with timezone offset', () => {
    const d = DateParse.parseISO('2024-01-15T13:30:00+08:00');
    expect(d).not.toBe(null);
  });

  it('rejects invalid month', () => {
    expect(DateParse.parseISO('2024-13-15')).toBe(null);
  });
});

describe('DateParse — RFC 2822', () => {
  it('parses RFC format', () => {
    const d = DateParse.parseRFC('Mon, 15 Jan 2024 13:30:00 GMT');
    expect(d).not.toBe(null);
    expect(d!.getUTCFullYear()).toBe(2024);
  });

  it('parses without weekday', () => {
    const d = DateParse.parseRFC('15 Jan 2024 13:30:00 UTC');
    expect(d).not.toBe(null);
  });

  it('rejects invalid month', () => {
    expect(DateParse.parseRFC('15 Foo 2024 13:30:00 GMT')).toBe(null);
  });
});

describe('DateParse — tryParse', () => {
  it('parses ISO', () => {
    expect(DateParse.tryParse('2024-01-15')).not.toBe(null);
  });

  it('parses RFC', () => {
    expect(DateParse.tryParse('Mon, 15 Jan 2024 13:30:00 GMT')).not.toBe(null);
  });

  it('returns null for invalid', () => {
    expect(DateParse.tryParse('not a date')).toBe(null);
  });

  it('rejects empty', () => {
    expect(DateParse.tryParse('')).toBe(null);
  });
});

describe('DateParse — parseOr', () => {
  it('uses fallback', () => {
    const fb = new Date(2020, 0, 1);
    const d = DateParse.parseOr('garbage', fb);
    expect(d).toBe(fb);
  });

  it('parses valid', () => {
    const d = DateParse.parseOr('2024-01-15', new Date(2020, 0, 1));
    expect(d.getUTCFullYear()).toBe(2024);
  });
});

describe('DateParse — isValid', () => {
  it('valid', () => {
    expect(DateParse.isValid('2024-01-15')).toBe(true);
  });

  it('invalid', () => {
    expect(DateParse.isValid('garbage')).toBe(false);
  });
});
