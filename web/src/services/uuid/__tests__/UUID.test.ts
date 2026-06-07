/**
 * UUID.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { UUID } from '../UUID';

describe('UUID — validate', () => {
  it('valid v4', () => {
    expect(UUID.isValid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  it('valid v1', () => {
    expect(UUID.isValid('f47ac10b-58cc-1197-a716-446655440000')).toBe(true);
  });

  it('invalid', () => {
    expect(UUID.isValid('not-a-uuid')).toBe(false);
  });
});

describe('UUID — v4', () => {
  it('generate v4', () => {
    const u = UUID.v4();
    expect(UUID.isValid(u)).toBe(true);
    expect(UUID.version(u)).toBe(4);
  });

  it('v4 is unique', () => {
    const a = UUID.v4();
    const b = UUID.v4();
    expect(a).not.toBe(b);
  });
});

describe('UUID — v1', () => {
  it('generate v1', () => {
    const u = UUID.v1();
    expect(UUID.isValid(u)).toBe(true);
    expect(UUID.version(u)).toBe(1);
  });
});

describe('UUID — v5', () => {
  it('generate v5', () => {
    const u = UUID.v5('test', UUID.NAMESPACE_DNS);
    expect(UUID.version(u)).toBe(5);
  });

  it('v5 deterministic', () => {
    const a = UUID.v5('hello');
    const b = UUID.v5('hello');
    expect(a).toBe(b);
  });
});

describe('UUID — version/variant', () => {
  it('version', () => {
    expect(UUID.version('00000000-0000-4000-8000-000000000000')).toBe(4);
  });

  it('variant RFC', () => {
    expect(UUID.variant('550e8400-e29b-41d4-a716-446655440000')).toBe('RFC 4122');
  });
});

describe('UUID — constants', () => {
  it('NIL', () => {
    expect(UUID.NIL).toBe('00000000-0000-0000-0000-000000000000');
  });
});
