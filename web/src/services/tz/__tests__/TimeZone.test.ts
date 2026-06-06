/**
 * TimeZone.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { TimeZone } from '../TimeZone';

describe('TimeZone — offset', () => {
  it('UTC offset is 0', () => {
    const d = new Date(2024, 0, 1);
    expect(TimeZone.getOffsetMinutes(d, 'UTC')).toBe(0);
  });

  it('Shanghai offset is +480', () => {
    const d = new Date(2024, 0, 1);
    expect(TimeZone.getOffsetMinutes(d, 'Asia/Shanghai')).toBe(480);
  });

  it('NY offset varies (winter EST -300)', () => {
    const d = new Date(2024, 0, 1);
    expect(TimeZone.getOffsetMinutes(d, 'America/New_York')).toBe(-300);
  });

  it('NY offset varies (summer EDT -240)', () => {
    const d = new Date(2024, 6, 1);
    expect(TimeZone.getOffsetMinutes(d, 'America/New_York')).toBe(-240);
  });
});

describe('TimeZone — offset string', () => {
  it('UTC +00:00', () => {
    expect(TimeZone.getOffsetString(new Date(2024, 0, 1), 'UTC')).toBe('+00:00');
  });

  it('Shanghai +08:00', () => {
    expect(TimeZone.getOffsetString(new Date(2024, 0, 1), 'Asia/Shanghai')).toBe('+08:00');
  });

  it('NY winter -05:00', () => {
    expect(TimeZone.getOffsetString(new Date(2024, 0, 1), 'America/New_York')).toBe('-05:00');
  });
});

describe('TimeZone — abbreviation', () => {
  it('UTC', () => {
    const abbr = TimeZone.getAbbreviation(new Date(2024, 0, 1), 'UTC');
    expect(abbr).toMatch(/UTC|GMT/);
  });
});

describe('TimeZone — format', () => {
  it('format in zone', () => {
    const s = TimeZone.formatInZone(new Date(2024, 0, 1, 0, 0, 0), 'Asia/Shanghai', {
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    });
    expect(s).toMatch(/2024/);
  });
});

describe('TimeZone — UTC conversion', () => {
  it('toUTC then fromUTC', () => {
    const d = new Date(2024, 0, 1, 12);
    const utc = TimeZone.toUTC(d);
    const back = TimeZone.fromUTC(utc);
    expect(Math.abs(back.getTime() - d.getTime())).toBeLessThan(1000);
  });
});

describe('TimeZone — utility', () => {
  it('commonTimezones includes UTC', () => {
    expect(TimeZone.commonTimezones()).toContain('UTC');
  });

  it('isValid UTC', () => {
    expect(TimeZone.isValid('UTC')).toBe(true);
  });

  it('isValid invalid', () => {
    expect(TimeZone.isValid('Not/A/Zone')).toBe(false);
  });
});
