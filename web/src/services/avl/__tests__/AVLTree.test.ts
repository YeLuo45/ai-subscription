/**
 * AVLTree.test.ts — Pure unit tests for AVL tree
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AVLTree } from '../AVLTree';

describe('AVLTree — basic', () => {
  let t: AVLTree<number>;
  beforeEach(() => { t = new AVLTree<number>(); });

  it('starts empty', () => {
    expect(t.isEmpty()).toBe(true);
    expect(t.height()).toBe(0);
  });

  it('inserts and queries', () => {
    t.insert(5);
    expect(t.has(5)).toBe(true);
    expect(t.height()).toBe(1);
  });

  it('inorder sorted', () => {
    [5, 3, 7, 1, 4, 6, 8].forEach((x) => t.insert(x));
    expect(t.inorder()).toEqual([1, 3, 4, 5, 6, 7, 8]);
  });

  it('min and max', () => {
    [5, 3, 7, 1, 4].forEach((x) => t.insert(x));
    expect(t.min()).toBe(1);
    expect(t.max()).toBe(7);
  });
});

describe('AVLTree — balance invariants', () => {
  it('stays balanced after sequential inserts', () => {
    const t = new AVLTree<number>();
    for (let i = 0; i < 50; i++) t.insert(i);
    expect(t.isValid()).toBe(true);
    // AVL height ~1.44 * log2(n+2) ≈ 9.3 for n=50
    expect(t.height()).toBeLessThan(11);
  });

  it('stays balanced with reverse order', () => {
    const t = new AVLTree<number>();
    for (let i = 50; i >= 0; i--) t.insert(i);
    expect(t.isValid()).toBe(true);
  });

  it('stays balanced with random order', () => {
    const t = new AVLTree<number>();
    const nums = [10, 20, 30, 15, 25, 5, 1, 50, 60, 70, 80, 90, 100, 40, 35];
    for (const n of nums) t.insert(n);
    expect(t.isValid()).toBe(true);
  });

  it('handles all-left skewed', () => {
    const t = new AVLTree<number>();
    for (let i = 10; i >= 0; i--) t.insert(i);
    expect(t.isValid()).toBe(true);
    // Should be balanced
    expect(t.height()).toBeLessThanOrEqual(5);
  });
});

describe('AVLTree — rotations', () => {
  it('left-left case rotates right', () => {
    const t = new AVLTree<number>();
    t.insert(30);
    t.insert(20);
    t.insert(10);
    expect(t.height()).toBe(2);
  });

  it('right-right case rotates left', () => {
    const t = new AVLTree<number>();
    t.insert(10);
    t.insert(20);
    t.insert(30);
    expect(t.height()).toBe(2);
  });

  it('left-right case', () => {
    const t = new AVLTree<number>();
    t.insert(30);
    t.insert(10);
    t.insert(20);
    expect(t.height()).toBe(2);
  });

  it('right-left case', () => {
    const t = new AVLTree<number>();
    t.insert(10);
    t.insert(30);
    t.insert(20);
    expect(t.height()).toBe(2);
  });
});
