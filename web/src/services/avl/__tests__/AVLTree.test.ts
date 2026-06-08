/**
 * AVLTree.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { AVLTree } from '../AVLTree';

describe('AVLTree — basic', () => {
  it('insert/contains', () => {
    const t = new AVLTree<number>();
    [5, 3, 7, 1, 4].forEach((v) => t.insert(v));
    expect(t.contains(3)).toBe(true);
    expect(t.contains(99)).toBe(false);
  });

  it('size', () => {
    const t = new AVLTree<number>();
    expect(t.size()).toBe(0);
    [1, 2, 3].forEach((v) => t.insert(v));
    expect(t.size()).toBe(3);
  });
});

describe('AVLTree — properties', () => {
  it('balance after many inserts', () => {
    const t = new AVLTree<number>();
    [1, 2, 3, 4, 5, 6, 7].forEach((v) => t.insert(v));
    expect(t.isBalanced()).toBe(true);
  });

  it('inOrder sorted', () => {
    const t = new AVLTree<number>();
    [5, 3, 7, 1, 4, 6, 8].forEach((v) => t.insert(v));
    expect(t.inOrder()).toEqual([1, 3, 4, 5, 6, 7, 8]);
  });

  it('height O(log n)', () => {
    const t = new AVLTree<number>();
    for (let i = 1; i <= 100; i++) t.insert(i);
    // AVL height of 100 nodes should be ~7 (log2(100) * 1.44)
    expect(t.height()).toBeLessThan(10);
  });
});

describe('AVLTree — min/max', () => {
  it('min/max', () => {
    const t = new AVLTree<number>();
    [5, 3, 7, 1, 9].forEach((v) => t.insert(v));
    expect(t.min()).toBe(1);
    expect(t.max()).toBe(9);
  });
});
