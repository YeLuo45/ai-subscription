/**
 * RedBlackTree.test.ts — Pure unit tests for RBT
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RedBlackTree } from '../RedBlackTree';

describe('RedBlackTree — basic', () => {
  let t: RedBlackTree<number>;
  beforeEach(() => { t = new RedBlackTree<number>(); });

  it('starts empty', () => {
    expect(t.isEmpty()).toBe(true);
    expect(t.size()).toBe(0);
  });

  it('insert single', () => {
    t.insert(5);
    expect(t.has(5)).toBe(true);
    expect(t.size()).toBe(1);
  });

  it('inorder gives sorted', () => {
    [5, 3, 7, 1, 4, 6, 8].forEach((x) => t.insert(x));
    expect(t.inorder()).toEqual([1, 3, 4, 5, 6, 7, 8]);
  });

  it('min and max', () => {
    [5, 3, 7, 1, 4].forEach((x) => t.insert(x));
    expect(t.min()).toBe(1);
    expect(t.max()).toBe(7);
  });

  it('has for missing', () => {
    t.insert(5);
    expect(t.has(10)).toBe(false);
  });
});

describe('RedBlackTree — invariants', () => {
  it('remains valid after many inserts', () => {
    const t = new RedBlackTree<number>();
    const nums = [10, 20, 30, 15, 25, 5, 1, 50, 60, 70, 80, 90, 100, 40, 35];
    for (const n of nums) t.insert(n);
    expect(t.isValid()).toBe(true);
    expect(t.inorder()).toEqual([...nums].sort((a, b) => a - b));
  });

  it('remains valid with duplicates (insert keeps first)', () => {
    const t = new RedBlackTree<number>();
    [5, 5, 3, 7, 3].forEach((x) => t.insert(x));
    expect(t.isValid()).toBe(true);
  });

  it('handles many inserts in order', () => {
    const t = new RedBlackTree<number>();
    for (let i = 0; i < 50; i++) t.insert(i);
    expect(t.isValid()).toBe(true);
    expect(t.size()).toBe(50);
  });

  it('handles reverse order', () => {
    const t = new RedBlackTree<number>();
    for (let i = 50; i >= 0; i--) t.insert(i);
    expect(t.isValid()).toBe(true);
  });
});

describe('RedBlackTree — custom comparator', () => {
  it('reverse order via custom comparator', () => {
    const t = new RedBlackTree<number>((a, b) => b - a);
    [5, 3, 7, 1, 4].forEach((x) => t.insert(x));
    expect(t.inorder()).toEqual([7, 5, 4, 3, 1]);
  });
});
