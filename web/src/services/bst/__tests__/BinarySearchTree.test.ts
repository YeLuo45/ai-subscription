/**
 * BinarySearchTree.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { BinarySearchTree } from '../BinarySearchTree';

describe('BST — basic', () => {
  it('insert/contains', () => {
    const bst = new BinarySearchTree<number>();
    bst.insert(5);
    bst.insert(3);
    bst.insert(7);
    expect(bst.contains(3)).toBe(true);
    expect(bst.contains(99)).toBe(false);
  });

  it('size', () => {
    const bst = new BinarySearchTree<number>();
    expect(bst.size()).toBe(0);
    bst.insert(1);
    bst.insert(2);
    expect(bst.size()).toBe(2);
  });
});

describe('BST — min/max', () => {
  it('min', () => {
    const bst = new BinarySearchTree<number>();
    [5, 3, 7, 1, 9].forEach((v) => bst.insert(v));
    expect(bst.min()).toBe(1);
  });

  it('max', () => {
    const bst = new BinarySearchTree<number>();
    [5, 3, 7, 1, 9].forEach((v) => bst.insert(v));
    expect(bst.max()).toBe(9);
  });
});

describe('BST — traversals', () => {
  it('inOrder sorted', () => {
    const bst = new BinarySearchTree<number>();
    [5, 3, 7, 1, 4].forEach((v) => bst.insert(v));
    expect(bst.inOrder()).toEqual([1, 3, 4, 5, 7]);
  });

  it('preOrder', () => {
    const bst = new BinarySearchTree<number>();
    [5, 3, 7].forEach((v) => bst.insert(v));
    expect(bst.preOrder()).toEqual([5, 3, 7]);
  });

  it('levelOrder', () => {
    const bst = new BinarySearchTree<number>();
    [5, 3, 7, 1, 4].forEach((v) => bst.insert(v));
    expect(bst.levelOrder()).toEqual([5, 3, 7, 1, 4]);
  });
});

describe('BST — ops', () => {
  it('height', () => {
    const bst = new BinarySearchTree<number>();
    expect(bst.height()).toBe(-1);
    bst.insert(5);
    expect(bst.height()).toBe(0);
    bst.insert(3);
    bst.insert(7);
    expect(bst.height()).toBe(1);
  });

  it('remove leaf', () => {
    const bst = new BinarySearchTree<number>();
    [5, 3, 7].forEach((v) => bst.insert(v));
    expect(bst.remove(3)).toBe(true);
    expect(bst.contains(3)).toBe(false);
    expect(bst.size()).toBe(2);
  });

  it('remove with one child', () => {
    const bst = new BinarySearchTree<number>();
    [5, 3, 7, 6].forEach((v) => bst.insert(v));
    expect(bst.remove(7)).toBe(true);
    expect(bst.contains(6)).toBe(true);
  });

  it('remove with two children', () => {
    const bst = new BinarySearchTree<number>();
    [5, 3, 7, 1, 4, 6, 9].forEach((v) => bst.insert(v));
    expect(bst.remove(7)).toBe(true);
    expect(bst.contains(6)).toBe(true);
    expect(bst.contains(9)).toBe(true);
  });
});
