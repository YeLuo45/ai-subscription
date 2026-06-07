/**
 * Stack.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Stack } from '../Stack';

describe('Stack — basic', () => {
  it('push/pop', () => {
    const s = new Stack<number>();
    s.push(1);
    s.push(2);
    expect(s.pop()).toBe(2);
    expect(s.pop()).toBe(1);
  });

  it('peek', () => {
    const s = new Stack<number>();
    s.push(1);
    s.push(2);
    expect(s.peek()).toBe(2);
    expect(s.size()).toBe(2);
  });

  it('empty pop', () => {
    const s = new Stack<number>();
    expect(s.pop()).toBeUndefined();
    expect(s.peek()).toBeUndefined();
  });

  it('isEmpty', () => {
    const s = new Stack<number>();
    expect(s.isEmpty()).toBe(true);
    s.push(1);
    expect(s.isEmpty()).toBe(false);
  });
});

describe('Stack — ops', () => {
  it('toArray', () => {
    const s = new Stack<number>();
    s.push(1);
    s.push(2);
    expect(s.toArray()).toEqual([1, 2]);
  });

  it('fromArray', () => {
    const s = new Stack<number>();
    s.fromArray([1, 2, 3]);
    expect(s.pop()).toBe(3);
  });

  it('clear', () => {
    const s = new Stack<number>();
    s.push(1);
    s.clear();
    expect(s.size()).toBe(0);
  });

  it('equals', () => {
    const a = new Stack<number>();
    const b = new Stack<number>();
    a.fromArray([1, 2]);
    b.fromArray([1, 2]);
    expect(a.equals(b)).toBe(true);
  });
});
