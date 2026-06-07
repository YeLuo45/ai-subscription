/**
 * LinkedList.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { LinkedList } from '../LinkedList';

describe('LinkedList — basic', () => {
  it('size empty', () => {
    const ll = new LinkedList<number>();
    expect(ll.size()).toBe(0);
    expect(ll.isEmpty()).toBe(true);
  });

  it('append', () => {
    const ll = new LinkedList<number>();
    ll.append(1);
    ll.append(2);
    expect(ll.size()).toBe(2);
    expect(ll.getLast()).toBe(2);
  });

  it('prepend', () => {
    const ll = new LinkedList<number>();
    ll.prepend(1);
    ll.prepend(2);
    expect(ll.getFirst()).toBe(2);
  });
});

describe('LinkedList — ops', () => {
  it('removeFirst', () => {
    const ll = new LinkedList<number>();
    ll.append(1);
    ll.append(2);
    expect(ll.removeFirst()).toBe(1);
    expect(ll.getFirst()).toBe(2);
  });

  it('removeLast', () => {
    const ll = new LinkedList<number>();
    ll.append(1);
    ll.append(2);
    expect(ll.removeLast()).toBe(2);
    expect(ll.getLast()).toBe(1);
  });

  it('toArray', () => {
    const ll = new LinkedList<number>();
    ll.fromArray([1, 2, 3]);
    expect(ll.toArray()).toEqual([1, 2, 3]);
  });

  it('reverse', () => {
    const ll = new LinkedList<number>();
    ll.fromArray([1, 2, 3]);
    ll.reverse();
    expect(ll.toArray()).toEqual([3, 2, 1]);
  });

  it('clear', () => {
    const ll = new LinkedList<number>();
    ll.fromArray([1, 2, 3]);
    ll.clear();
    expect(ll.size()).toBe(0);
  });

  it('contains', () => {
    const ll = new LinkedList<number>();
    ll.fromArray([1, 2, 3]);
    expect(ll.contains(2)).toBe(true);
    expect(ll.contains(99)).toBe(false);
  });
});
