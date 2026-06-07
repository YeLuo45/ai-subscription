/**
 * JSONPatch.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { JSONPatch } from '../JSONPatch';

describe('JSONPatch — add', () => {
  it('add root', () => {
    const r = JSONPatch.apply({}, [{ op: 'add', path: '/a', value: 1 }]);
    expect(r).toEqual({ a: 1 });
  });

  it('add nested', () => {
    const r = JSONPatch.apply({ a: { b: 1 } }, [{ op: 'add', path: '/a/c', value: 2 }]);
    expect(r).toEqual({ a: { b: 1, c: 2 } });
  });

  it('add to array', () => {
    // RFC 6902: add at index replaces
    const r = JSONPatch.apply({ a: [1, 2, 3] }, [{ op: 'add', path: '/a/1', value: 99 }]);
    expect(r).toEqual({ a: [1, 99, 2, 3] });
  });

  it('add to array end (-)', () => {
    const r = JSONPatch.apply({ a: [1, 2] }, [{ op: 'add', path: '/a/-', value: 3 }]);
    expect(r).toEqual({ a: [1, 2, 3] });
  });
});

describe('JSONPatch — remove', () => {
  it('remove', () => {
    const r = JSONPatch.apply({ a: 1, b: 2 }, [{ op: 'remove', path: '/a' }]);
    expect(r).toEqual({ b: 2 });
  });

  it('remove from array', () => {
    const r = JSONPatch.apply({ a: [1, 2, 3] }, [{ op: 'remove', path: '/a/1' }]);
    expect(r).toEqual({ a: [1, 3] });
  });
});

describe('JSONPatch — replace', () => {
  it('replace', () => {
    const r = JSONPatch.apply({ a: 1 }, [{ op: 'replace', path: '/a', value: 99 }]);
    expect(r).toEqual({ a: 99 });
  });
});

describe('JSONPatch — move', () => {
  it('move', () => {
    const r = JSONPatch.apply({ a: 1, b: 2 }, [{ op: 'move', from: '/a', path: '/b' }]);
    expect(r).toEqual({ b: 1 });
  });
});

describe('JSONPatch — copy', () => {
  it('copy', () => {
    const r = JSONPatch.apply({ a: 1, b: 2 }, [{ op: 'copy', from: '/a', path: '/c' }]);
    expect(r).toEqual({ a: 1, b: 2, c: 1 });
  });
});

describe('JSONPatch — test', () => {
  it('test pass', () => {
    expect(() => JSONPatch.apply({ a: 1 }, [{ op: 'test', path: '/a', value: 1 }])).not.toThrow();
  });

  it('test fail', () => {
    expect(() => JSONPatch.apply({ a: 1 }, [{ op: 'test', path: '/a', value: 2 }])).toThrow();
  });
});

describe('JSONPatch — escape', () => {
  it('~ escape', () => {
    const r = JSONPatch.apply({}, [{ op: 'add', path: '/a~0b', value: 1 }]);
    expect(r).toEqual({ 'a~b': 1 });
  });

  it('/ escape', () => {
    const r = JSONPatch.apply({}, [{ op: 'add', path: '/a~1b', value: 1 }]);
    expect(r).toEqual({ 'a/b': 1 });
  });
});

describe('JSONPatch — get/validate', () => {
  it('get', () => {
    expect(JSONPatch.get({ a: { b: 1 } }, '/a/b')).toBe(1);
  });

  it('isValid', () => {
    expect(JSONPatch.isValid([{ op: 'add', path: '/a', value: 1 }])).toBe(true);
    expect(JSONPatch.isValid([{ op: 'bad', path: '/a' } as any])).toBe(false);
  });
});
