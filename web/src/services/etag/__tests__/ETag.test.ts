/**
 * ETag.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { ETag } from '../ETag';

describe('ETag — parse', () => {
  it('strong', () => {
    const e = ETag.parse('"abc"');
    expect(e?.value).toBe('abc');
    expect(e?.weak).toBe(false);
  });

  it('weak', () => {
    const e = ETag.parse('W/"abc"');
    expect(e?.weak).toBe(true);
  });

  it('invalid', () => {
    expect(ETag.parse('garbage')).toBe(null);
  });

  it('empty', () => {
    expect(ETag.parse('')).toBe(null);
  });
});

describe('ETag — stringify', () => {
  it('strong toString', () => {
    expect(ETag.strong('abc').toString()).toBe('"abc"');
  });

  it('weak toString', () => {
    expect(ETag.weak('abc').toString()).toBe('W/"abc"');
  });
});

describe('ETag — matches', () => {
  it('strong equals strong', () => {
    expect(ETag.strong('abc').matches(ETag.strong('abc'))).toBe(true);
  });

  it('strong vs different', () => {
    expect(ETag.strong('abc').matches(ETag.strong('xyz'))).toBe(false);
  });

  it('weak matches strong', () => {
    expect(ETag.weak('abc').matches(ETag.strong('abc'))).toBe(true);
  });

  it('strong matches weak (weak comparison)', () => {
    expect(ETag.strong('abc').matches(ETag.weak('abc'))).toBe(true);
  });

  it('null other', () => {
    expect(ETag.strong('abc').matches(null)).toBe(false);
  });
});

describe('ETag — If-None-Match', () => {
  it('matches *', () => {
    expect(ETag.strong('abc').matchesIfNoneMatch('*')).toBe(true);
  });

  it('matches list', () => {
    expect(ETag.strong('abc').matchesIfNoneMatch('"xyz", "abc"')).toBe(true);
  });

  it('no match', () => {
    expect(ETag.strong('abc').matchesIfNoneMatch('"xyz"')).toBe(false);
  });
});

describe('ETag — fromContent', () => {
  it('same content same hash', () => {
    expect(ETag.fromContent('hello').value).toBe(ETag.fromContent('hello').value);
  });

  it('different content different hash', () => {
    expect(ETag.fromContent('hello').value).not.toBe(ETag.fromContent('world').value);
  });

  it('weak by default', () => {
    expect(ETag.fromContent('x').weak).toBe(true);
  });
});
