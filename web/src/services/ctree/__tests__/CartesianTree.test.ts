/**
 * CartesianTree.test.ts — Pure unit tests for Cartesian tree
 */

import { describe, it, expect } from 'vitest';
import { CartesianTree } from '../CartesianTree';

describe('CartesianTree — build', () => {
  it('builds from array', () => {
    const t = new CartesianTree();
    t.build([3, 2, 1, 6, 0, 5]);
    expect(t.size()).toBe(6);
  });

  it('inorder returns original', () => {
    const t = new CartesianTree();
    const arr = [3, 2, 1, 6, 0, 5];
    t.build(arr);
    expect(t.inorder()).toEqual(arr);
  });

  it('min at root', () => {
    const t = new CartesianTree();
    t.build([3, 2, 1, 6, 0, 5]);
    expect(t.heapTop()).toBe(0);
  });

  it('max at root for max-heap', () => {
    const t = new CartesianTree();
    t.build([3, 2, 1, 6, 0, 5], 'max');
    expect(t.heapTop()).toBe(6);
  });
});

describe('CartesianTree — heap invariant', () => {
  it('is valid min-heap', () => {
    const t = new CartesianTree();
    t.build([3, 2, 1, 6, 0, 5]);
    expect(t.isValid('min')).toBe(true);
  });

  it('is valid max-heap', () => {
    const t = new CartesianTree();
    t.build([3, 2, 1, 6, 0, 5], 'max');
    expect(t.isValid('max')).toBe(true);
  });

  it('inorder correct after max-heap', () => {
    const t = new CartesianTree();
    const arr = [3, 2, 1, 6, 0, 5];
    t.build(arr, 'max');
    expect(t.inorder()).toEqual(arr);
  });
});

describe('CartesianTree — edge cases', () => {
  it('empty array', () => {
    const t = new CartesianTree();
    t.build([]);
    expect(t.size()).toBe(0);
    expect(t.heapTop()).toBe(null);
    expect(t.inorder()).toEqual([]);
  });

  it('single element', () => {
    const t = new CartesianTree();
    t.build([5]);
    expect(t.heapTop()).toBe(5);
    expect(t.inorder()).toEqual([5]);
    expect(t.isValid()).toBe(true);
  });

  it('all equal', () => {
    const t = new CartesianTree();
    t.build([1, 1, 1]);
    expect(t.inorder()).toEqual([1, 1, 1]);
    expect(t.isValid()).toBe(true);
  });

  it('already sorted', () => {
    const t = new CartesianTree();
    t.build([1, 2, 3, 4, 5]);
    expect(t.inorder()).toEqual([1, 2, 3, 4, 5]);
    expect(t.heapTop()).toBe(1);
    expect(t.isValid()).toBe(true);
  });

  it('reverse sorted', () => {
    const t = new CartesianTree();
    t.build([5, 4, 3, 2, 1]);
    expect(t.inorder()).toEqual([5, 4, 3, 2, 1]);
    expect(t.heapTop()).toBe(1);
    expect(t.isValid()).toBe(true);
  });
});

describe('CartesianTree — preorder', () => {
  it('preorder visits', () => {
    const t = new CartesianTree();
    t.build([3, 2, 1, 6, 0, 5]);
    const p = t.preorder();
    expect(p.length).toBe(6);
    expect(p[0]).toBe(0); // min at root
  });
});
