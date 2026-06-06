/**
 * SkipList.test.ts — Pure unit tests for skip list
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SkipList } from '../SkipList';

describe('SkipList — basic', () => {
  let s: SkipList<number>;
  beforeEach(() => { s = new SkipList<number>(); });

  it('starts empty', () => {
    expect(s.size()).toBe(0);
  });

  it('inserts and has', () => {
    s.insert(5);
    expect(s.has(5)).toBe(true);
    expect(s.size()).toBe(1);
  });

  it('returns false for missing', () => {
    expect(s.has(99)).toBe(false);
  });

  it('inorder sorted', () => {
    [5, 3, 7, 1, 4, 6, 8].forEach((x) => s.insert(x));
    expect(s.inorder()).toEqual([1, 3, 4, 5, 6, 7, 8]);
  });
});

describe('SkipList — remove', () => {
  let s: SkipList<number>;
  beforeEach(() => { s = new SkipList<number>(); });

  it('removes existing', () => {
    s.insert(5);
    s.insert(3);
    expect(s.remove(5)).toBe(true);
    expect(s.has(5)).toBe(false);
    expect(s.size()).toBe(1);
  });

  it('returns false for missing', () => {
    s.insert(5);
    expect(s.remove(10)).toBe(false);
  });

  it('inorder after removes', () => {
    [5, 3, 7, 1, 4].forEach((x) => s.insert(x));
    s.remove(3);
    s.remove(7);
    expect(s.inorder()).toEqual([1, 4, 5]);
  });
});

describe('SkipList — duplicates', () => {
  it('update on duplicate key', () => {
    const s = new SkipList<number>();
    s.insert(5);
    s.insert(5);
    expect(s.size()).toBe(1);
  });
});

describe('SkipList — stress', () => {
  it('handles many inserts and removes', () => {
    const s = new SkipList<number>();
    for (let i = 0; i < 100; i++) s.insert(i);
    for (let i = 0; i < 100; i += 2) s.remove(i);
    const out = s.inorder();
    expect(out.length).toBe(50);
    expect(out[0]).toBe(1);
    expect(out[49]).toBe(99);
  });

  it('handles negative numbers', () => {
    const s = new SkipList<number>();
    [-5, -10, 0, 5, 10].forEach((x) => s.insert(x));
    expect(s.inorder()).toEqual([-10, -5, 0, 5, 10]);
  });
});

describe('SkipList — custom comparator', () => {
  it('reverse order', () => {
    const s = new SkipList<number>(16, 0.5, (a, b) => b - a);
    [3, 1, 4, 1, 5, 9, 2, 6].forEach((x) => s.insert(x));
    expect(s.inorder()).toEqual([9, 6, 5, 4, 3, 2, 1]);
  });
});
