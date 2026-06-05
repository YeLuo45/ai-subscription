/**
 * PatchEngine.test.ts — Pure unit tests for JSON Patch (RFC 6902)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PatchEngine } from '../PatchEngine';

describe('PatchEngine — add and replace', () => {
  let p: PatchEngine;
  beforeEach(() => { p = new PatchEngine(); });

  it('adds a property', () => {
    const r = p.apply({ a: 1 }, [{ op: 'add', path: '/b', value: 2 }]);
    expect(r.success).toBe(true);
    expect((r.document as any).b).toBe(2);
  });

  it('replaces a property', () => {
    const r = p.apply({ a: 1 }, [{ op: 'replace', path: '/a', value: 99 }]);
    expect((r.document as any).a).toBe(99);
  });

  it('adds to array', () => {
    const r = p.apply([1, 2], [{ op: 'add', path: '/-', value: 3 }]);
    expect(r.document).toEqual([1, 2, 3]);
  });

  it('adds nested', () => {
    const r = p.apply({ a: {} }, [{ op: 'add', path: '/a/b', value: 5 }]);
    expect((r.document as any).a.b).toBe(5);
  });
});

describe('PatchEngine — remove', () => {
  let p: PatchEngine;
  beforeEach(() => { p = new PatchEngine(); });

  it('removes a property', () => {
    const r = p.apply({ a: 1, b: 2 }, [{ op: 'remove', path: '/a' }]);
    expect((r.document as any).a).toBeUndefined();
    expect((r.document as any).b).toBe(2);
  });

  it('removes an array element', () => {
    const r = p.apply([1, 2, 3], [{ op: 'remove', path: '/1' }]);
    expect(r.document).toEqual([1, 3]);
  });

  it('fails for missing path', () => {
    const r = p.apply({}, [{ op: 'remove', path: '/nope' }]);
    expect(r.success).toBe(false);
  });
});

describe('PatchEngine — move and copy', () => {
  let p: PatchEngine;
  beforeEach(() => { p = new PatchEngine(); });

  it('moves a value', () => {
    const r = p.apply({ a: 1, b: 2 }, [{ op: 'move', from: '/a', path: '/c' }]);
    expect((r.document as any).a).toBeUndefined();
    expect((r.document as any).c).toBe(1);
  });

  it('copies a value', () => {
    const r = p.apply({ a: 1 }, [{ op: 'copy', from: '/a', path: '/b' }]);
    expect((r.document as any).a).toBe(1);
    expect((r.document as any).b).toBe(1);
  });

  it('copy does not affect source', () => {
    const r = p.apply({ a: { x: 1 } }, [{ op: 'copy', from: '/a', path: '/b' }]);
    expect((r.document as any).a.x).toBe(1);
    expect((r.document as any).b.x).toBe(1);
  });
});

describe('PatchEngine — test', () => {
  let p: PatchEngine;
  beforeEach(() => { p = new PatchEngine(); });

  it('passes when value matches', () => {
    const r = p.apply({ a: 1 }, [{ op: 'test', path: '/a', value: 1 }]);
    expect(r.success).toBe(true);
  });

  it('fails when value differs', () => {
    const r = p.apply({ a: 1 }, [{ op: 'test', path: '/a', value: 2 }]);
    expect(r.success).toBe(false);
  });
});

describe('PatchEngine — sequence', () => {
  let p: PatchEngine;
  beforeEach(() => { p = new PatchEngine(); });

  it('applies multiple ops', () => {
    const r = p.apply({ a: 1 }, [
      { op: 'add', path: '/b', value: 2 },
      { op: 'replace', path: '/a', value: 99 },
    ]);
    expect((r.document as any).a).toBe(99);
    expect((r.document as any).b).toBe(2);
  });

  it('stops on failure', () => {
    const r = p.apply({ a: 1 }, [
      { op: 'add', path: '/b', value: 2 },
      { op: 'remove', path: '/nonexistent' },
    ]);
    expect(r.success).toBe(false);
    expect(r.failedAt).toBe(1);
  });

  it('returns full result with failedAt and error', () => {
    const r = p.apply({}, [{ op: 'remove', path: '/nope' }]);
    expect(r.failedAt).toBe(0);
    expect(r.error).toBeDefined();
  });
});

describe('PatchEngine — edge cases', () => {
  let p: PatchEngine;
  beforeEach(() => { p = new PatchEngine(); });

  it('replaces root with empty path', () => {
    const r = p.apply({ a: 1 }, [{ op: 'replace', path: '', value: 99 }]);
    expect(r.document).toBe(99);
  });

  it('handles path with ~1 escape', () => {
    const r = p.apply({}, [{ op: 'add', path: '/a~1b', value: 1 }]);
    expect((r.document as any)['a/b']).toBe(1);
  });

  it('handles path with ~0 escape', () => {
    const r = p.apply({}, [{ op: 'add', path: '/a~0b', value: 1 }]);
    expect((r.document as any)['a~b']).toBe(1);
  });
});
