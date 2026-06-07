/**
 * Queue.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Queue } from '../Queue';

describe('Queue — basic', () => {
  it('enqueue/dequeue', () => {
    const q = new Queue<number>();
    q.enqueue(1);
    q.enqueue(2);
    expect(q.dequeue()).toBe(1);
    expect(q.dequeue()).toBe(2);
  });

  it('peek', () => {
    const q = new Queue<number>();
    q.enqueue(1);
    q.enqueue(2);
    expect(q.peek()).toBe(1);
  });

  it('empty', () => {
    const q = new Queue<number>();
    expect(q.dequeue()).toBeUndefined();
    expect(q.peek()).toBeUndefined();
    expect(q.isEmpty()).toBe(true);
  });
});

describe('Queue — ops', () => {
  it('toArray', () => {
    const q = new Queue<number>();
    q.fromArray([1, 2, 3]);
    expect(q.toArray()).toEqual([1, 2, 3]);
  });

  it('fromArray', () => {
    const q = new Queue<number>();
    q.fromArray([1, 2, 3]);
    expect(q.dequeue()).toBe(1);
  });

  it('clear', () => {
    const q = new Queue<number>();
    q.fromArray([1, 2]);
    q.clear();
    expect(q.size()).toBe(0);
  });

  it('size', () => {
    const q = new Queue<number>();
    q.enqueue(1);
    q.enqueue(2);
    expect(q.size()).toBe(2);
  });
});
