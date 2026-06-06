/**
 * ULID.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { ULID } from '../ULID';

describe('ULID — basic', () => {
  it('generates 26 chars', () => {
    const u = ULID.generate();
    expect(u.length).toBe(26);
  });

  it('validates generated', () => {
    const u = ULID.generate();
    expect(ULID.isValid(u)).toBe(true);
  });

  it('uses Crockford base32 (no I, L, O, U)', () => {
    for (let i = 0; i < 50; i++) {
      const u = ULID.generate();
      expect(/[ILOU]/.test(u)).toBe(false);
    }
  });
});

describe('ULID — timestamp', () => {
  it('extracts timestamp', () => {
    const t = Date.now();
    const u = ULID.generateAt(t);
    expect(ULID.timestamp(u)).toBe(t);
  });

  it('round trip', () => {
    const u = ULID.generate();
    const t = ULID.timestamp(u);
    expect(t).toBeLessThanOrEqual(Date.now());
  });
});

describe('ULID — isValid', () => {
  it('rejects wrong length', () => {
    expect(ULID.isValid('abc')).toBe(false);
  });

  it('rejects invalid chars', () => {
    expect(ULID.isValid('00000000000000000000000000I')).toBe(false);
  });

  it('accepts valid', () => {
    expect(ULID.isValid('00000000000000000000000000')).toBe(true);
  });
});

describe('ULID — compare', () => {
  it('sortable by time', () => {
    const a = ULID.generateAt(1000);
    const b = ULID.generateAt(2000);
    expect(ULID.compare(a, b)).toBeLessThan(0);
  });
});

describe('ULID — batch', () => {
  it('batch of N', () => {
    const b = ULID.batch(100);
    expect(b.length).toBe(100);
    expect(new Set(b).size).toBe(100);
  });
});
