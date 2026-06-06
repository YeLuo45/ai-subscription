/**
 * SecureRandom.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { SecureRandom } from '../SecureRandom';

describe('SecureRandom — bytes/hex', () => {
  it('generates N bytes', () => {
    expect(SecureRandom.bytes(16).length).toBe(16);
  });

  it('hex output', () => {
    const h = SecureRandom.hex(8);
    expect(h.length).toBe(16);
    expect(/^[0-9a-f]+$/.test(h)).toBe(true);
  });

  it('hex is unique', () => {
    const h1 = SecureRandom.hex(16);
    const h2 = SecureRandom.hex(16);
    expect(h1).not.toBe(h2);
  });
});

describe('SecureRandom — int', () => {
  it('int in range', () => {
    for (let i = 0; i < 100; i++) {
      const n = SecureRandom.int(5, 10);
      expect(n).toBeGreaterThanOrEqual(5);
      expect(n).toBeLessThan(10);
    }
  });

  it('throws on bad range', () => {
    expect(() => SecureRandom.int(10, 5)).toThrow();
  });
});

describe('SecureRandom — float', () => {
  it('float in [0, 1)', () => {
    for (let i = 0; i < 100; i++) {
      const f = SecureRandom.float();
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
    }
  });
});

describe('SecureRandom — pick', () => {
  it('picks from array', () => {
    const arr = [1, 2, 3];
    expect(arr).toContain(SecureRandom.pick(arr));
  });

  it('throws on empty', () => {
    expect(() => SecureRandom.pick([])).toThrow();
  });
});

describe('SecureRandom — shuffle', () => {
  it('preserves elements', () => {
    const arr = [1, 2, 3, 4, 5];
    const shuffled = SecureRandom.shuffle([...arr]);
    expect(shuffled.sort()).toEqual(arr);
  });
});

describe('SecureRandom — uuid', () => {
  it('generates v4 UUID', () => {
    const u = SecureRandom.uuid();
    expect(u).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('UUIDs are unique', () => {
    const u1 = SecureRandom.uuid();
    const u2 = SecureRandom.uuid();
    expect(u1).not.toBe(u2);
  });
});
