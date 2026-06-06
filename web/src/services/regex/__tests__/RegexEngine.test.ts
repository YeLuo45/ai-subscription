/**
 * RegexEngine.test.ts — Pure unit tests for regex wrapper
 */

import { describe, it, expect } from 'vitest';
import { RegexEngine } from '../RegexEngine';

describe('RegexEngine — basic', () => {
  it('tests simple match', () => {
    expect(new RegexEngine('hello').test('hello world')).toBe(true);
    expect(new RegexEngine('xyz').test('hello')).toBe(false);
  });

  it('exec returns match info', () => {
    const m = new RegexEngine('world').exec('hello world');
    expect(m?.match).toBe('world');
    expect(m?.index).toBe(6);
  });

  it('exec returns null on no match', () => {
    expect(new RegexEngine('xyz').exec('hello')).toBe(null);
  });
});

describe('RegexEngine — anchors', () => {
  it('^ anchors to start', () => {
    expect(new RegexEngine('^hello').test('hello world')).toBe(true);
    expect(new RegexEngine('^world').test('hello world')).toBe(false);
  });

  it('$ anchors to end', () => {
    expect(new RegexEngine('world$').test('hello world')).toBe(true);
    expect(new RegexEngine('hello$').test('hello world')).toBe(false);
  });
});

describe('RegexEngine — quantifiers', () => {
  it('dot matches any char', () => {
    expect(new RegexEngine('h.llo').test('hello')).toBe(true);
    expect(new RegexEngine('h.llo').test('hxllo')).toBe(true);
  });

  it('star quantifier', () => {
    expect(new RegexEngine('ab*c').test('ac')).toBe(true);
    expect(new RegexEngine('ab*c').test('abc')).toBe(true);
    expect(new RegexEngine('ab*c').test('abbbc')).toBe(true);
  });

  it('plus quantifier', () => {
    expect(new RegexEngine('ab+c').test('ac')).toBe(false);
    expect(new RegexEngine('ab+c').test('abc')).toBe(true);
  });

  it('question quantifier', () => {
    expect(new RegexEngine('ab?c').test('ac')).toBe(true);
    expect(new RegexEngine('ab?c').test('abc')).toBe(true);
    expect(new RegexEngine('ab?c').test('abbc')).toBe(false);
  });
});

describe('RegexEngine — character class', () => {
  it('matches any of set', () => {
    expect(new RegexEngine('[abc]').test('a')).toBe(true);
    expect(new RegexEngine('[abc]').test('b')).toBe(true);
    expect(new RegexEngine('[abc]').test('d')).toBe(false);
  });
});

describe('RegexEngine — execAll', () => {
  it('finds all matches with g flag', () => {
    const r = new RegexEngine('a', 'g');
    const all = r.execAll('banana');
    expect(all.length).toBe(3);
  });

  it('finds all without g flag (auto-adds)', () => {
    const r = new RegexEngine('a');
    expect(r.execAll('banana').length).toBe(3);
  });
});

describe('RegexEngine — count', () => {
  it('counts matches', () => {
    expect(new RegexEngine('a', 'g').count('banana')).toBe(3);
  });
});

describe('RegexEngine — replace', () => {
  it('replaces all', () => {
    const r = new RegexEngine('a', 'g');
    expect(r.replace('banana', 'o')).toBe('bonono');
  });
});

describe('RegexEngine — split', () => {
  it('splits on pattern', () => {
    const r = new RegexEngine(',');
    expect(r.split('a,b,c')).toEqual(['a', 'b', 'c']);
  });

  it('splits with limit', () => {
    const r = new RegexEngine(',');
    expect(r.split('a,b,c,d', 2)).toEqual(['a', 'b']);
  });
});

describe('RegexEngine — groups', () => {
  it('captures groups', () => {
    const m = new RegexEngine('(\\d+)-(\\d+)').exec('123-456');
    expect(m?.groups[1]).toBe('123');
    expect(m?.groups[2]).toBe('456');
  });
});
