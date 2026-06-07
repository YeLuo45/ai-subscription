/**
 * Deque.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Deque } from '../Deque';

describe('Deque — basic', () => {
  it('addFront/removeFront', () => {
    const d = new Deque<number>();
    d.addFront(1);
    d.addFront(2);
    expect(d.removeFront()).toBe(2);
  });

  it('addBack/removeBack', () => {
    const d = new Deque<number>();
    d.addBack(1);
    d.addBack(2);
    expect(d.removeBack()).toBe(2);
  });

  it('peekFront/peekBack', () => {
    const d = new Deque<number>();
    d.addBack(1);
    d.addBack(2);
    expect(d.peekFront()).toBe(1);
    expect(d.peekBack()).toBe(2);
  });

  it('mixed', () => {
    const d = new Deque<number>();
    d.addBack(1);
    d.addFront(2);
    expect(d.peekFront()).toBe(2);
    expect(d.peekBack()).toBe(1);
  });
});

describe('Deque — ops', () => {
  it('empty', () => {
    const d = new Deque<number>();
    expect(d.removeFront()).toBeUndefined();
    expect(d.removeBack()).toBeUndefined();
  });

  it('size/isEmpty', () => {
    const d = new Deque<number>();
    d.addBack(1);
    expect(d.size()).toBe(1);
    expect(d.isEmpty()).toBe(false);
  });

  it('toArray', () => {
    const d = new Deque<number>();
    d.addBack(1);
    d.addBack(2);
    expect(d.toArray()).toEqual([1, 2]);
  });

  it('clear', () => {
    const d = new Deque<number>();
    d.addBack(1);
    d.clear();
    expect(d.isEmpty()).toBe(true);
  });
});
