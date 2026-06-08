/**
 * Trie2.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Trie2 } from '../Trie2';

describe('Trie2 — basic', () => {
  it('insert/contains', () => {
    const t = new Trie2();
    t.insert('hello');
    t.insert('world');
    expect(t.contains('hello')).toBe(true);
    expect(t.contains('world')).toBe(true);
    expect(t.contains('hell')).toBe(false);
  });

  it('size', () => {
    const t = new Trie2();
    expect(t.size()).toBe(0);
    t.insert('a');
    t.insert('a'); // duplicate
    expect(t.size()).toBe(1);
  });
});

describe('Trie2 — prefix', () => {
  it('startsWith', () => {
    const t = new Trie2();
    t.insert('hello');
    expect(t.startsWith('hel')).toBe(true);
    expect(t.startsWith('hex')).toBe(false);
  });

  it('countPrefix', () => {
    const t = new Trie2();
    ['hello', 'help', 'helmet'].forEach((w) => t.insert(w));
    expect(t.countPrefix('hel')).toBe(3);
  });

  it('collect', () => {
    const t = new Trie2();
    ['hello', 'help', 'world'].forEach((w) => t.insert(w));
    const r = t.collect('hel').sort();
    expect(r).toEqual(['hello', 'help']);
  });
});

describe('Trie2 — ops', () => {
  it('delete', () => {
    const t = new Trie2();
    t.insert('hello');
    expect(t.delete('hello')).toBe(true);
    expect(t.contains('hello')).toBe(false);
  });

  it('delete missing', () => {
    const t = new Trie2();
    t.insert('hello');
    expect(t.delete('world')).toBe(false);
  });

  it('isEmpty', () => {
    const t = new Trie2();
    expect(t.isEmpty()).toBe(true);
    t.insert('a');
    expect(t.isEmpty()).toBe(false);
  });

  it('delete partial', () => {
    const t = new Trie2();
    t.insert('hello');
    t.insert('help');
    t.delete('help');
    expect(t.contains('help')).toBe(false);
    expect(t.contains('hello')).toBe(true);
    expect(t.startsWith('hel')).toBe(true);
  });
});
