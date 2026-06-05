/**
 * MinHeap.test.ts — Pure unit tests for binary min-heap
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MinHeap } from '../MinHeap';

describe('MinHeap — basic operations', () => {
  let h: MinHeap<number>;
  beforeEach(() => { h = new MinHeap<number>(); });

  it('starts empty', () => {
    expect(h.isEmpty()).toBe(true);
    expect(h.size()).toBe(0);
  });

  it('peek returns undefined when empty', () => {
    expect(h.peek()).toBeUndefined();
  });

  it('peek returns min without removing', () => {
    h.push(3);
    h.push(1);
    h.push(2);
    expect(h.peek()).toBe(1);
    expect(h.size()).toBe(3);
  });

  it('pop returns min', () => {
    h.push(3);
    h.push(1);
    h.push(2);
    expect(h.pop()).toBe(1);
    expect(h.pop()).toBe(2);
    expect(h.pop()).toBe(3);
    expect(h.isEmpty()).toBe(true);
  });

  it('pop on empty returns undefined', () => {
    expect(h.pop()).toBeUndefined();
  });
});

describe('MinHeap — heapify', () => {
  it('builds from unsorted array', () => {
    const h = new MinHeap<number>([5, 3, 8, 1, 9, 2, 7]);
    expect(h.peek()).toBe(1);
  });

  it('produces sorted output on drain', () => {
    const h = new MinHeap<number>([5, 3, 8, 1, 9, 2, 7]);
    const sorted: number[] = [];
    while (!h.isEmpty()) sorted.push(h.pop()!);
    expect(sorted).toEqual([1, 2, 3, 5, 7, 8, 9]);
  });
});

describe('MinHeap — replace', () => {
  it('replace top', () => {
    const h = new MinHeap<number>([3, 5, 7]);
    const old = h.replace(1);
    expect(old).toBe(3);
    expect(h.peek()).toBe(1);
  });

  it('replace on empty', () => {
    const h = new MinHeap<number>();
    const old = h.replace(5);
    expect(old).toBeUndefined();
    expect(h.peek()).toBe(5);
  });
});

describe('MinHeap — custom comparator', () => {
  it('max-heap via reverse comparator', () => {
    const h = new MinHeap<number>([3, 1, 4, 1, 5, 9, 2, 6], (a, b) => b - a);
    expect(h.peek()).toBe(9);
  });

  it('object heap by priority', () => {
    interface Task { name: string; priority: number; }
    const h = new MinHeap<Task>([], (a, b) => a.priority - b.priority);
    h.push({ name: 'low', priority: 3 });
    h.push({ name: 'high', priority: 1 });
    h.push({ name: 'med', priority: 2 });
    expect(h.pop()?.name).toBe('high');
    expect(h.pop()?.name).toBe('med');
    expect(h.pop()?.name).toBe('low');
  });
});

describe('MinHeap — stability and duplicates', () => {
  it('handles duplicates', () => {
    const h = new MinHeap<number>([2, 2, 1, 1, 3, 3]);
    const sorted: number[] = [];
    while (!h.isEmpty()) sorted.push(h.pop()!);
    expect(sorted).toEqual([1, 1, 2, 2, 3, 3]);
  });

  it('preserves heap property after many operations', () => {
    const h = new MinHeap<number>();
    const nums = [50, 20, 80, 10, 90, 40, 30, 60, 70];
    for (const n of nums) h.push(n);
    const sorted: number[] = [];
    while (!h.isEmpty()) sorted.push(h.pop()!);
    expect(sorted).toEqual([10, 20, 30, 40, 50, 60, 70, 80, 90]);
  });
});
