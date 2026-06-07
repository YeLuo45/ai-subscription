/**
 * Trie.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Trie } from '../Trie';

describe('Trie — basic', () => {
  it('insert and search', () => {
    const t = new Trie();
    t.insert('hello');
    expect(t.search('hello')).toBe(true);
    expect(t.search('hell')).toBe(false);
  });

  it('startsWith', () => {
    const t = new Trie();
    t.insert('hello');
    expect(t.startsWith('hel')).toBe(true);
    expect(t.startsWith('xyz')).toBe(false);
  });

  it('insert with value', () => {
    const t = new Trie();
    t.insert('key', 'val');
    expect(t.get('key')).toBe('val');
  });
});

describe('Trie — prefix', () => {
  it('getAllWithPrefix', () => {
    const t = new Trie();
    t.insert('apple');
    t.insert('app');
    t.insert('apricot');
    const r = t.getAllWithPrefix('ap');
    expect(r.length).toBe(3);
    expect(r).toContain('apple');
    expect(r).toContain('app');
  });

  it('autoComplete', () => {
    const t = new Trie();
    ['apple', 'app', 'apricot'].forEach((w) => t.insert(w));
    const r = t.autoComplete('ap', 2);
    expect(r.length).toBe(2);
  });
});

describe('Trie — count', () => {
  it('count', () => {
    const t = new Trie();
    t.insert('a');
    t.insert('b');
    t.insert('c');
    expect(t.count()).toBe(3);
  });
});

describe('Trie — LCP', () => {
  it('common prefix', () => {
    const t = new Trie();
    t.insert('flower');
    t.insert('flow');
    t.insert('flight');
    expect(t.longestCommonPrefix()).toBe('fl');
  });

  it('no common', () => {
    const t = new Trie();
    t.insert('abc');
    t.insert('xyz');
    expect(t.longestCommonPrefix()).toBe('');
  });
});

describe('Trie — delete', () => {
  it('delete word', () => {
    const t = new Trie();
    t.insert('hello');
    expect(t.search('hello')).toBe(true);
    t.delete('hello');
    expect(t.search('hello')).toBe(false);
  });

  it('delete non-existent', () => {
    const t = new Trie();
    t.insert('hello');
    expect(t.delete('xyz')).toBe(false);
  });

  it('delete preserves prefix', () => {
    const t = new Trie();
    t.insert('hello');
    t.insert('help');
    t.delete('hello');
    expect(t.search('help')).toBe(true);
    expect(t.search('hello')).toBe(false);
  });
});
