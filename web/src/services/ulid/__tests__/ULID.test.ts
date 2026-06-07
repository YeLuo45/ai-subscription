/**
 * ULID.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { ULID } from '../ULID';

describe('ULID — generate', () => {
  it('length 26', () => {
    const id = ULID.generate();
    expect(id.length).toBe(26);
  });

  it('uppercase', () => {
    const id = ULID.generate();
    expect(id).toBe(id.toUpperCase());
  });

  it('custom time', () => {
    const id = ULID.generate(1000000);
    expect(ULID.getTime(id)).toBe(1000000);
  });
});

describe('ULID — validate', () => {
  it('valid', () => {
    expect(ULID.isValid(ULID.generate())).toBe(true);
  });

  it('invalid length', () => {
    expect(ULID.isValid('abc')).toBe(false);
  });

  it('invalid char', () => {
    // 'I' is not in Crockford base32
    expect(ULID.isValid('I' + '0'.repeat(25))).toBe(false);
  });
});

describe('ULID — parts', () => {
  it('getTime', () => {
    const t = Date.now();
    const id = ULID.generate(t);
    expect(ULID.getTime(id)).toBe(t);
  });

  it('getRandom', () => {
    const id = ULID.generate();
    expect(ULID.getRandom(id).length).toBe(16);
  });
});

describe('ULID — compare', () => {
  it('sortable', () => {
    const a = ULID.generate(1000);
    const b = ULID.generate(2000);
    expect(ULID.compare(a, b)).toBeLessThan(0);
  });

  it('equal', () => {
    const a = ULID.generate(1000);
    const b = ULID.generate(1000);
    expect(ULID.compare(a, b)).not.toBe(0);
  });
});

describe('ULID — monotonic', () => {
  it('monotonic', () => {
    const a = ULID.generate(1000);
    const b = ULID.monotonic(a, 1000);
    expect(ULID.compare(a, b)).toBeLessThan(0);
  });

  it('monotonic different time', () => {
    const a = ULID.generate(1000);
    const b = ULID.monotonic(a, 2000);
    expect(ULID.getTime(b)).toBe(2000);
  });
});
