/**
 * Timezone.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Timezone } from '../Timezone';

describe('Timezone — find', () => {
  it('by name', () => {
    const tz = Timezone.findByName('UTC');
    expect(tz?.offset).toBe(0);
  });

  it('NY', () => {
    const tz = Timezone.findByName('America/New_York');
    expect(tz?.offset).toBe(-5);
  });

  it('not found', () => {
    expect(Timezone.findByName('Foo/Bar')).toBeNull();
  });
});

describe('Timezone — list', () => {
  it('all', () => {
    expect(Timezone.list().length).toBeGreaterThan(0);
  });

  it('by region', () => {
    const e = Timezone.listByRegion('Europe');
    expect(e.length).toBeGreaterThan(0);
  });
});

describe('Timezone — offset', () => {
  it('getOffset', () => {
    expect(Timezone.getOffset('Asia/Tokyo')).toBe(9);
  });

  it('getOffset India half', () => {
    expect(Timezone.getOffset('Asia/Kolkata')).toBe(5.5);
  });
});

describe('Timezone — DST', () => {
  it('NY has DST', () => {
    expect(Timezone.hasDST('America/New_York')).toBe(true);
  });

  it('Tokyo no DST', () => {
    expect(Timezone.hasDST('Asia/Tokyo')).toBe(false);
  });
});

describe('Timezone — format', () => {
  it('format positive', () => {
    expect(Timezone.formatOffset(5.5)).toBe('+05:30');
  });

  it('format negative', () => {
    expect(Timezone.formatOffset(-8)).toBe('-08:00');
  });
});

describe('Timezone — current', () => {
  it('summer NY', () => {
    const d = new Date('2026-07-01T12:00:00Z');
    expect(Timezone.getCurrentOffset('America/New_York', d)).toBe(-4);
  });

  it('winter NY', () => {
    const d = new Date('2026-01-01T12:00:00Z');
    expect(Timezone.getCurrentOffset('America/New_York', d)).toBe(-5);
  });
});

describe('Timezone — validate', () => {
  it('valid', () => {
    expect(Timezone.isValid('UTC')).toBe(true);
  });

  it('invalid', () => {
    expect(Timezone.isValid('Foo/Bar')).toBe(false);
  });
});
