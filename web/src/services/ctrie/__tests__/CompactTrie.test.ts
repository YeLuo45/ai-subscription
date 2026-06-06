/**
 * CompactTrie.test.ts — Pure unit tests for compact trie
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CompactTrie } from '../CompactTrie';

describe('CompactTrie — basic', () => {
  let t: CompactTrie;
  beforeEach(() => { t = new CompactTrie(); });

  it('starts empty', () => {
    expect(t.isEmpty()).toBe(true);
    expect(t.size()).toBe(0);
  });

  it('inserts and has', () => {
    t.insert('hello');
    expect(t.has('hello')).toBe(true);
    expect(t.size()).toBe(1);
  });

  it('returns false for missing', () => {
    expect(t.has('nope')).toBe(false);
  });

  it('does not match prefix as word', () => {
    t.insert('hello');
    expect(t.has('hell')).toBe(false);
  });
});

describe('CompactTrie — values', () => {
  it('get stored value', () => {
    const t = new CompactTrie();
    t.insert('apple', 5);
    expect(t.get('apple')).toBe(5);
  });

  it('default value is the word', () => {
    const t = new CompactTrie();
    t.insert('hello');
    expect(t.get('hello')).toBe('hello');
  });
});

describe('CompactTrie — prefixes', () => {
  let t: CompactTrie;
  beforeEach(() => {
    t = new CompactTrie();
    ['apple', 'app', 'apricot', 'banana', 'band', 'bandana'].forEach((w) => t.insert(w));
  });

  it('hasPrefix', () => {
    expect(t.hasPrefix('app')).toBe(true);
    expect(t.hasPrefix('ban')).toBe(true);
    expect(t.hasPrefix('zoo')).toBe(false);
  });

  it('countPrefix', () => {
    expect(t.countPrefix('app')).toBe(2); // apple, app
    expect(t.countPrefix('ban')).toBe(3); // banana, band, bandana
    expect(t.countPrefix('z')).toBe(0);
  });

  it('listWithPrefix', () => {
    const r = t.listWithPrefix('ban').sort();
    expect(r).toEqual(['banana', 'band', 'bandana']);
  });
});

describe('CompactTrie — list', () => {
  it('lists all words', () => {
    const t = new CompactTrie();
    ['banana', 'apple', 'cherry'].forEach((w) => t.insert(w));
    expect(t.list().sort()).toEqual(['apple', 'banana', 'cherry']);
  });
});

describe('CompactTrie — duplicate', () => {
  it('insert twice returns false second time', () => {
    const t = new CompactTrie();
    expect(t.insert('a')).toBe(true);
    expect(t.insert('a')).toBe(false);
  });
});

describe('CompactTrie — stats', () => {
  it('reports node count', () => {
    const t = new CompactTrie();
    t.insert('a');
    t.insert('ab');
    t.insert('abc');
    const s = t.stats();
    expect(s.nodes).toBe(4); // root + a + ab + abc
  });
});
