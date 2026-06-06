/**
 * RelativeTime.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { RelativeTime } from '../RelativeTime';

const base = new Date(2024, 0, 1, 12, 0, 0);

describe('RelativeTime — format', () => {
  it('just now', () => {
    expect(RelativeTime.format(base, base)).toBe('just now');
  });

  it('30 seconds ago', () => {
    const t = new Date(base.getTime() - 30_000);
    expect(RelativeTime.format(t, base)).toMatch(/second/);
  });

  it('5 minutes ago', () => {
    const t = new Date(base.getTime() - 5 * 60_000);
    expect(RelativeTime.format(t, base)).toBe('5 minutes ago');
  });

  it('2 hours ago', () => {
    const t = new Date(base.getTime() - 2 * 3_600_000);
    expect(RelativeTime.format(t, base)).toBe('2 hours ago');
  });

  it('3 days ago', () => {
    const t = new Date(base.getTime() - 3 * 86_400_000);
    expect(RelativeTime.format(t, base)).toBe('3 days ago');
  });

  it('in 2 hours', () => {
    const t = new Date(base.getTime() + 2 * 3_600_000);
    expect(RelativeTime.format(t, base)).toBe('in 2 hours');
  });
});

describe('RelativeTime — short', () => {
  it('seconds', () => {
    const t = new Date(base.getTime() - 30_000);
    expect(RelativeTime.short(t, base)).toBe('-30s');
  });

  it('minutes', () => {
    const t = new Date(base.getTime() - 5 * 60_000);
    expect(RelativeTime.short(t, base)).toBe('-5m');
  });

  it('hours', () => {
    const t = new Date(base.getTime() - 2 * 3_600_000);
    expect(RelativeTime.short(t, base)).toBe('-2h');
  });

  it('days', () => {
    const t = new Date(base.getTime() - 3 * 86_400_000);
    expect(RelativeTime.short(t, base)).toBe('-3d');
  });

  it('future minutes', () => {
    const t = new Date(base.getTime() + 5 * 60_000);
    expect(RelativeTime.short(t, base)).toBe('5m');
  });
});

describe('RelativeTime — detailed', () => {
  it('2h 30m', () => {
    const t = new Date(base.getTime() - (2 * 3600 + 30 * 60) * 1000);
    expect(RelativeTime.detailed(t, base)).toMatch(/2 hours, 30 minutes/);
  });

  it('0 seconds', () => {
    expect(RelativeTime.detailed(base, base)).toBe('0 seconds');
  });
});

describe('RelativeTime — diffMs', () => {
  it('positive', () => {
    const t = new Date(base.getTime() + 1000);
    expect(RelativeTime.diffMs(t, base)).toBe(1000);
  });
});
