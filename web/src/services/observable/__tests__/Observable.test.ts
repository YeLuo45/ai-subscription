/**
 * Observable.test.ts — Pure unit tests
 */

import { describe, it, expect, vi } from 'vitest';
import { Observable } from '../Observable';

describe('Observable — basic', () => {
  it('emits values', () => {
    const fn = vi.fn();
    Observable.from([1, 2, 3]).subscribe(fn);
    expect(fn).toHaveBeenCalledTimes(3);
    expect(fn).toHaveBeenNthCalledWith(1, 1);
    expect(fn).toHaveBeenNthCalledWith(2, 2);
    expect(fn).toHaveBeenNthCalledWith(3, 3);
  });

  it('subscribe returns unsubscribe', () => {
    const fn = vi.fn();
    const u = Observable.from([1, 2, 3]).subscribe(fn);
    u();
    expect(fn).toHaveBeenCalledTimes(3); // from() pushes all synchronously
  });
});

describe('Observable — operators', () => {
  it('map', () => {
    const fn = vi.fn();
    Observable.from([1, 2, 3]).map((n) => n * 2).subscribe(fn);
    expect(fn).toHaveBeenNthCalledWith(1, 2);
    expect(fn).toHaveBeenNthCalledWith(2, 4);
    expect(fn).toHaveBeenNthCalledWith(3, 6);
  });

  it('filter', () => {
    const fn = vi.fn();
    Observable.from([1, 2, 3, 4]).filter((n) => n % 2 === 0).subscribe(fn);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenNthCalledWith(1, 2);
    expect(fn).toHaveBeenNthCalledWith(2, 4);
  });

  it('take', () => {
    const fn = vi.fn();
    Observable.from([1, 2, 3, 4, 5]).take(2).subscribe(fn);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('skip', () => {
    const fn = vi.fn();
    Observable.from([1, 2, 3, 4]).skip(2).subscribe(fn);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenNthCalledWith(1, 3);
  });
});

describe('Observable — reduce', () => {
  it('reduces values', () => {
    const r = Observable.from([1, 2, 3, 4]).reduce((a, b) => a + b, 0);
    expect(r).toBe(10);
  });

  it('reduces to string', () => {
    const r = Observable.from(['a', 'b', 'c']).reduce((a, b) => a + b, '');
    expect(r).toBe('abc');
  });
});

describe('Observable — toArray', () => {
  it('collects to array', () => {
    const r = Observable.from([1, 2, 3]).toArray();
    expect(r).toEqual([1, 2, 3]);
  });
});

describe('Observable — fromPromise', () => {
  it('emits from promise', async () => {
    const fn = vi.fn();
    Observable.fromPromise(Promise.resolve(42)).subscribe(fn);
    await new Promise((r) => setTimeout(r, 0));
    expect(fn).toHaveBeenCalledWith(42);
  });
});

describe('Observable — chain', () => {
  it('map.filter.take', () => {
    const fn = vi.fn();
    Observable.from([1, 2, 3, 4, 5, 6]).map((n) => n * 2).filter((n) => n > 4).take(2).subscribe(fn);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenNthCalledWith(1, 6);
    expect(fn).toHaveBeenNthCalledWith(2, 8);
  });
});
