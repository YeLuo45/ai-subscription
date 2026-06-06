/**
 * UUIDv4.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { UUIDv4 } from '../UUIDv4';

describe('UUIDv4 — generate', () => {
  it('generates valid v4 UUID', () => {
    const u = UUIDv4.generate();
    expect(UUIDv4.isValid(u)).toBe(true);
  });

  it('version is 4', () => {
    const u = UUIDv4.generate();
    expect(u[14]).toBe('4');
  });

  it('variant is 8, 9, a, or b', () => {
    for (let i = 0; i < 50; i++) {
      const u = UUIDv4.generate();
      expect('89ab').toContain(u[19].toLowerCase());
    }
  });

  it('UUIDs are unique', () => {
    const set = new Set();
    for (let i = 0; i < 100; i++) set.add(UUIDv4.generate());
    expect(set.size).toBe(100);
  });
});

describe('UUIDv4 — isValid', () => {
  it('rejects v1 format', () => {
    // v1 has version=1 and MAC address node
    expect(UUIDv4.isValid('550e8400-e29b-11d4-a716-446655440000')).toBe(false);
  });

  it('accepts v4 format', () => {
    expect(UUIDv4.isValid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  it('rejects random strings', () => {
    expect(UUIDv4.isValid('not a uuid')).toBe(false);
    expect(UUIDv4.isValid('12345')).toBe(false);
  });
});

describe('UUIDv4 — parse', () => {
  it('parses into parts', () => {
    const u = UUIDv4.generate();
    const p = UUIDv4.parse(u);
    expect(p).not.toBe(null);
    expect(p?.timeLow.length).toBe(8);
    expect(p?.node.length).toBe(12);
  });

  it('returns null for invalid', () => {
    expect(UUIDv4.parse('bad')).toBe(null);
  });
});

describe('UUIDv4 — batch', () => {
  it('generates N UUIDs', () => {
    const batch = UUIDv4.batch(10);
    expect(batch.length).toBe(10);
    expect(new Set(batch).size).toBe(10);
  });
});
