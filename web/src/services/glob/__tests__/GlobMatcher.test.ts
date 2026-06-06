/**
 * GlobMatcher.test.ts — Pure unit tests for glob matcher
 */

import { describe, it, expect } from 'vitest';
import { GlobMatcher } from '../GlobMatcher';

describe('GlobMatcher — basic', () => {
  it('matches exact path', () => {
    expect(new GlobMatcher('foo.txt').match('foo.txt')).toBe(true);
    expect(new GlobMatcher('foo.txt').match('bar.txt')).toBe(false);
  });

  it('* matches any chars (not /)', () => {
    expect(new GlobMatcher('*.txt').match('foo.txt')).toBe(true);
    expect(new GlobMatcher('*.txt').match('a.txt')).toBe(true);
    expect(new GlobMatcher('*.txt').match('foo.ts')).toBe(false);
    expect(new GlobMatcher('*.txt').match('a/b.txt')).toBe(false);
  });

  it('? matches single char', () => {
    expect(new GlobMatcher('?.txt').match('a.txt')).toBe(true);
    expect(new GlobMatcher('?.txt').match('ab.txt')).toBe(false);
  });
});

describe('GlobMatcher — double star', () => {
  it('** matches any chars including /', () => {
    expect(new GlobMatcher('**/foo.txt').match('foo.txt')).toBe(true);
    expect(new GlobMatcher('**/foo.txt').match('a/foo.txt')).toBe(true);
    expect(new GlobMatcher('**/foo.txt').match('a/b/foo.txt')).toBe(true);
  });

  it('** with prefix', () => {
    expect(new GlobMatcher('src/**').match('src/a')).toBe(true);
    expect(new GlobMatcher('src/**').match('src/a/b')).toBe(true);
  });
});

describe('GlobMatcher — character class', () => {
  it('[abc] matches any', () => {
    expect(new GlobMatcher('[abc]').match('a')).toBe(true);
    expect(new GlobMatcher('[abc]').match('d')).toBe(false);
  });

  it('[!abc] negated', () => {
    expect(new GlobMatcher('[!abc]').match('d')).toBe(true);
    expect(new GlobMatcher('[!abc]').match('a')).toBe(false);
  });
});

describe('GlobMatcher — brace expansion', () => {
  it('{a,b,c} matches alternatives', () => {
    expect(new GlobMatcher('foo.{ts,js}').match('foo.ts')).toBe(true);
    expect(new GlobMatcher('foo.{ts,js}').match('foo.js')).toBe(true);
    expect(new GlobMatcher('foo.{ts,js}').match('foo.rs')).toBe(false);
  });
});

describe('GlobMatcher — escaping', () => {
  it('escapes regex specials', () => {
    expect(new GlobMatcher('a.b').match('a.b')).toBe(true);
    expect(new GlobMatcher('a.b').match('axb')).toBe(false);
  });
});
