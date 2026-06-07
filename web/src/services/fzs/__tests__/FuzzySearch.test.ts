/**
 * FuzzySearch.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { FuzzySearch } from '../FuzzySearch';

describe('FuzzySearch — score', () => {
  it('empty pattern', () => {
    expect(FuzzySearch.score('', 'hello')).toBe(1);
  });

  it('exact match', () => {
    expect(FuzzySearch.score('hello', 'hello')).toBeGreaterThan(0);
  });

  it('subsequence', () => {
    expect(FuzzySearch.score('hl', 'hello')).toBeGreaterThan(0);
  });

  it('no match', () => {
    expect(FuzzySearch.score('xyz', 'hello')).toBe(-1);
  });

  it('consecutive bonus', () => {
    const consec = FuzzySearch.score('hel', 'hello');
    const split = FuzzySearch.score('hlo', 'hello');
    expect(consec).toBeGreaterThan(split);
  });

  it('case insensitive', () => {
    expect(FuzzySearch.score('HEL', 'hello', false)).toBeGreaterThan(0);
  });
});

describe('FuzzySearch — findIndices', () => {
  it('returns indices', () => {
    const r = FuzzySearch.findIndices('hlo', 'hello');
    expect(r).toEqual([0, 2, 4]);
  });

  it('no match', () => {
    expect(FuzzySearch.findIndices('xyz', 'hello')).toEqual([]);
  });
});

describe('FuzzySearch — match', () => {
  it('match list', () => {
    const r = FuzzySearch.match('hl', ['hello', 'help', 'helpdesk'], 3);
    expect(r.length).toBeGreaterThan(0);
  });

  it('respects limit', () => {
    const r = FuzzySearch.match('e', ['bee', 'see', 'fee', 'gee', 'lee'], 2);
    expect(r.length).toBe(2);
  });

  it('empty pattern returns all', () => {
    const r = FuzzySearch.match('', ['a', 'b'], 10);
    expect(r.length).toBe(2);
  });
});

describe('FuzzySearch — matchMulti', () => {
  it('AND match', () => {
    expect(FuzzySearch.matchMulti(['he', 'lo'], 'hello')).toBe(true);
  });

  it('AND fail', () => {
    expect(FuzzySearch.matchMulti(['he', 'xy'], 'hello')).toBe(false);
  });
});

describe('FuzzySearch — highlight', () => {
  it('highlight', () => {
    expect(FuzzySearch.highlight('hello', [0, 2, 4])).toBe('**h**e**l**l**o**');
  });

  it('no match', () => {
    expect(FuzzySearch.highlight('hello', [])).toBe('hello');
  });
});

describe('FuzzySearch — isSubsequence', () => {
  it('subsequence', () => {
    expect(FuzzySearch.isSubsequence('hlo', 'hello')).toBe(true);
  });

  it('not', () => {
    expect(FuzzySearch.isSubsequence('ohl', 'hello')).toBe(false);
  });

  it('empty', () => {
    expect(FuzzySearch.isSubsequence('', 'hello')).toBe(true);
  });
});
