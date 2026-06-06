/**
 * Subject.test.ts — Pure unit tests
 */

import { describe, it, expect, vi } from 'vitest';
import { Subject } from '../Subject';

describe('Subject — basic', () => {
  it('delivers to all subscribers', () => {
    const s = new Subject<number>();
    const a = vi.fn();
    const b = vi.fn();
    s.subscribe(a);
    s.subscribe(b);
    s.next(1);
    expect(a).toHaveBeenCalledWith(1);
    expect(b).toHaveBeenCalledWith(1);
  });

  it('subscribe returns unsubscribe', () => {
    const s = new Subject<number>();
    const a = vi.fn();
    const u = s.subscribe(a);
    u();
    s.next(1);
    expect(a).not.toHaveBeenCalled();
  });
});

describe('Subject — complete', () => {
  it('stops emitting after complete', () => {
    const s = new Subject<number>();
    const a = vi.fn();
    s.subscribe(a);
    s.complete();
    s.next(1);
    expect(a).not.toHaveBeenCalled();
  });

  it('isClosed true after complete', () => {
    const s = new Subject<number>();
    s.complete();
    expect(s.isClosed).toBe(true);
  });
});

describe('Subject — error', () => {
  it('error marks errored', () => {
    const s = new Subject<number>();
    s.error(new Error('x'));
    expect(s.isClosed).toBe(true);
  });

  it('no more emits after error', () => {
    const s = new Subject<number>();
    const a = vi.fn();
    s.subscribe(a);
    s.error(new Error('x'));
    s.next(1);
    expect(a).not.toHaveBeenCalled();
  });
});

describe('Subject — pipe', () => {
  it('transforms values', () => {
    const s = new Subject<number>();
    const a = vi.fn();
    s.pipe((n) => n * 2).subscribe(a);
    s.next(3);
    expect(a).toHaveBeenCalledWith(6);
  });
});

describe('Subject — first', () => {
  it('resolves on first value', async () => {
    const s = new Subject<number>();
    setTimeout(() => s.next(42), 10);
    expect(await s.first()).toBe(42);
  });
});

describe('Subject — observer errors', () => {
  it('continues to other observers on error', () => {
    const s = new Subject<number>();
    const a = vi.fn(() => { throw new Error('a'); });
    const b = vi.fn();
    s.subscribe(a);
    s.subscribe(b);
    s.next(1);
    expect(b).toHaveBeenCalled();
  });
});
