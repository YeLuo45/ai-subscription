/**
 * HashMap.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { HashMap } from '../HashMap';

describe('HashMap — basic', () => {
  it('set/get', () => {
    const m = new HashMap<string, number>();
    m.set('a', 1);
    expect(m.get('a')).toBe(1);
  });

  it('get missing', () => {
    const m = new HashMap<string, number>();
    expect(m.get('a')).toBeUndefined();
  });

  it('has', () => {
    const m = new HashMap<string, number>();
    m.set('a', 1);
    expect(m.has('a')).toBe(true);
    expect(m.has('b')).toBe(false);
  });

  it('size/isEmpty', () => {
    const m = new HashMap<string, number>();
    expect(m.isEmpty()).toBe(true);
    m.set('a', 1);
    m.set('b', 2);
    expect(m.size()).toBe(2);
  });
});

describe('HashMap — ops', () => {
  it('delete', () => {
    const m = new HashMap<string, number>();
    m.set('a', 1);
    expect(m.delete('a')).toBe(true);
    expect(m.delete('a')).toBe(false);
    expect(m.size()).toBe(0);
  });

  it('overwrite', () => {
    const m = new HashMap<string, number>();
    m.set('a', 1);
    m.set('a', 2);
    expect(m.get('a')).toBe(2);
    expect(m.size()).toBe(1);
  });

  it('keys/values', () => {
    const m = new HashMap<string, number>();
    m.set('a', 1);
    m.set('b', 2);
    expect(m.keys().sort()).toEqual(['a', 'b']);
    expect(m.values().sort()).toEqual([1, 2]);
  });

  it('clear', () => {
    const m = new HashMap<string, number>();
    m.set('a', 1);
    m.clear();
    expect(m.size()).toBe(0);
  });

  it('resize', () => {
    const m = new HashMap<number, number>(4, 0.75);
    for (let i = 0; i < 100; i++) m.set(i, i);
    expect(m.size()).toBe(100);
    for (let i = 0; i < 100; i++) expect(m.get(i)).toBe(i);
  });
});
