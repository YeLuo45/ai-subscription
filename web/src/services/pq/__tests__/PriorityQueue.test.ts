/**
 * PriorityQueue.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { PriorityQueue } from '../PriorityQueue';

describe('PriorityQueue — min', () => {
  it('basic enqueue/dequeue', () => {
    const pq = new PriorityQueue<string>('min');
    pq.enqueue('a', 3);
    pq.enqueue('b', 1);
    pq.enqueue('c', 2);
    expect(pq.dequeue()).toBe('b');
    expect(pq.dequeue()).toBe('c');
    expect(pq.dequeue()).toBe('a');
  });

  it('peek', () => {
    const pq = new PriorityQueue<string>('min');
    pq.enqueue('a', 3);
    pq.enqueue('b', 1);
    expect(pq.peek()).toBe('b');
    expect(pq.size()).toBe(2);
  });

  it('empty', () => {
    const pq = new PriorityQueue<string>('min');
    expect(pq.isEmpty()).toBe(true);
    expect(pq.dequeue()).toBeUndefined();
  });
});

describe('PriorityQueue — max', () => {
  it('max heap', () => {
    const pq = new PriorityQueue<string>('max');
    pq.enqueue('a', 3);
    pq.enqueue('b', 1);
    pq.enqueue('c', 2);
    expect(pq.dequeue()).toBe('a');
    expect(pq.dequeue()).toBe('c');
  });
});

describe('PriorityQueue — ops', () => {
  it('size', () => {
    const pq = new PriorityQueue<string>('min');
    pq.enqueue('a', 1);
    pq.enqueue('b', 2);
    expect(pq.size()).toBe(2);
  });

  it('toArray', () => {
    const pq = new PriorityQueue<string>('min');
    pq.enqueue('a', 1);
    expect(pq.toArray()).toEqual(['a']);
  });

  it('stable order on same priority', () => {
    const pq = new PriorityQueue<string>('min');
    pq.enqueue('a', 1);
    pq.enqueue('b', 1);
    // First in, first out
    expect(pq.dequeue()).toBe('a');
    expect(pq.dequeue()).toBe('b');
  });
});
