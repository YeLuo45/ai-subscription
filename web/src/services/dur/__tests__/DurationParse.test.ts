/**
 * DurationParse.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { DurationParse } from '../DurationParse';

describe('DurationParse — parse', () => {
  it('parses simple', () => {
    const d = DurationParse.parse('P1Y');
    expect(d?.years).toBe(1);
  });

  it('parses full', () => {
    const d = DurationParse.parse('P1Y2M3DT4H5M6S');
    expect(d?.years).toBe(1);
    expect(d?.months).toBe(2);
    expect(d?.days).toBe(3);
    expect(d?.hours).toBe(4);
    expect(d?.minutes).toBe(5);
    expect(d?.seconds).toBe(6);
  });

  it('parses with T only', () => {
    const d = DurationParse.parse('PT1H');
    expect(d?.hours).toBe(1);
  });

  it('parses negative', () => {
    const d = DurationParse.parse('-PT1H');
    expect(d?.sign).toBe(-1);
  });

  it('rejects invalid', () => {
    expect(DurationParse.parse('garbage')).toBe(null);
    expect(DurationParse.parse('P')).toBe(null);
  });
});

describe('DurationParse — toMs', () => {
  it('converts', () => {
    const d = DurationParse.parse('PT1H')!;
    expect(DurationParse.toMs(d)).toBe(3_600_000);
  });

  it('negative', () => {
    const d = DurationParse.parse('-PT1H')!;
    expect(DurationParse.toMs(d)).toBe(-3_600_000);
  });
});

describe('DurationParse — format', () => {
  it('formats', () => {
    const d = DurationParse.parse('P1Y2M3DT4H5M6S')!;
    expect(DurationParse.format(d)).toBe('P1Y2M3DT4H5M6S');
  });
});

describe('DurationParse — addTo', () => {
  it('adds to date', () => {
    const d = DurationParse.parse('P1Y')!;
    const r = DurationParse.addTo(new Date(2024, 0, 1), d);
    expect(r.getFullYear()).toBe(2025);
  });

  it('adds hours', () => {
    const d = DurationParse.parse('PT2H')!;
    const r = DurationParse.addTo(new Date(2024, 0, 1, 10, 0, 0), d);
    expect(r.getHours()).toBe(12);
  });
});

describe('DurationParse — zero', () => {
  it('zero duration', () => {
    const z = DurationParse.zero();
    expect(DurationParse.toMs(z)).toBe(0);
  });
});
