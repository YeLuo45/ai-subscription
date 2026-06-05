/**
 * TrieStore.test.ts — Pure unit tests for prefix tree
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TrieStore } from '../TrieStore';

describe('TrieStore — insert and lookup', () => {
  let t: TrieStore;
  beforeEach(() => {
    t = new TrieStore();
  });

  it('inserts and checks', () => {
    t.insert('hello');
    expect(t.has('hello')).toBe(true);
  });

  it('returns false for missing', () => {
    expect(t.has('nope')).toBe(false);
  });

  it('insert multiple words', () => {
    t.insert('hello');
    t.insert('help');
    t.insert('world');
    expect(t.has('hello')).toBe(true);
    expect(t.has('help')).toBe(true);
    expect(t.has('world')).toBe(true);
  });

  it('prefix is not a word', () => {
    t.insert('hello');
    expect(t.has('hell')).toBe(false);
  });

  it('is case-insensitive', () => {
    t.insert('Hello');
    expect(t.has('hello')).toBe(true);
    expect(t.has('HELLO')).toBe(true);
  });

  it('tracks count', () => {
    t.insert('a');
    t.insert('b');
    t.insert('c');
    expect(t.count()).toBe(3);
  });

  it('count unchanged on re-insert', () => {
    t.insert('a');
    t.insert('a');
    t.insert('a');
    expect(t.count()).toBe(1);
  });
});

describe('TrieStore — values', () => {
  let t: TrieStore;
  beforeEach(() => {
    t = new TrieStore();
  });

  it('stores and retrieves value', () => {
    t.insert('hello', 'world');
    expect(t.get('hello')).toBe('world');
  });

  it('get returns undefined for missing', () => {
    expect(t.get('nope')).toBeUndefined();
  });

  it('set is alias for insert with value', () => {
    t.set('a', 1);
    expect(t.get('a')).toBe(1);
  });

  it('values returns all values', () => {
    t.insert('a', 1);
    t.insert('b', 2);
    const vals = t.values();
    expect(vals).toContain(1);
    expect(vals).toContain(2);
    expect(vals.length).toBe(2);
  });
});

describe('TrieStore — delete', () => {
  let t: TrieStore;
  beforeEach(() => {
    t = new TrieStore();
  });

  it('deletes a word', () => {
    t.insert('hello');
    expect(t.delete('hello')).toBe(true);
    expect(t.has('hello')).toBe(false);
  });

  it('delete returns false for missing', () => {
    expect(t.delete('nope')).toBe(false);
  });

  it('delete preserves shared prefix', () => {
    t.insert('hello');
    t.insert('help');
    t.delete('hello');
    expect(t.has('help')).toBe(true);
  });

  it('delete decrements count', () => {
    t.insert('a');
    t.insert('b');
    t.delete('a');
    expect(t.count()).toBe(1);
  });
});

describe('TrieStore — prefix operations', () => {
  let t: TrieStore;
  beforeEach(() => {
    t = new TrieStore();
    t.insert('hello');
    t.insert('help');
    t.insert('helmet');
    t.insert('world');
    t.insert('worry');
  });

  it('startsWith returns true for prefix', () => {
    expect(t.startsWith('hel')).toBe(true);
  });

  it('startsWith returns false for non-prefix', () => {
    expect(t.startsWith('xyz')).toBe(false);
  });

  it('listWithPrefix returns matching words', () => {
    const words = t.listWithPrefix('hel');
    expect(words.sort()).toEqual(['hello', 'help', 'helmet'].sort());
  });

  it('countWithPrefix returns count', () => {
    expect(t.countWithPrefix('hel')).toBe(3);
    expect(t.countWithPrefix('wor')).toBe(2);
    expect(t.countWithPrefix('xyz')).toBe(0);
  });

  it('listWithPrefix respects limit', () => {
    const words = t.listWithPrefix('hel', 2);
    expect(words.length).toBe(2);
  });
});

describe('TrieStore — long prefix and sorted', () => {
  it('longestCommonPrefix returns common prefix', () => {
    const t = new TrieStore();
    t.insert('flower');
    t.insert('flow');
    t.insert('flight');
    expect(t.longestCommonPrefix()).toBe('fl');
  });

  it('longestCommonPrefix for empty trie', () => {
    const t = new TrieStore();
    expect(t.longestCommonPrefix()).toBe('');
  });

  it('toSortedList returns all in sorted order', () => {
    const t = new TrieStore();
    t.insert('zebra');
    t.insert('apple');
    t.insert('mango');
    expect(t.toSortedList()).toEqual(['apple', 'mango', 'zebra']);
  });
});

describe('TrieStore — clear and management', () => {
  it('clear removes all', () => {
    const t = new TrieStore();
    t.insert('a');
    t.insert('b');
    t.clear();
    expect(t.count()).toBe(0);
    expect(t.has('a')).toBe(false);
  });
});
