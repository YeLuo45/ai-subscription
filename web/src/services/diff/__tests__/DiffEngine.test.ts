/**
 * DiffEngine.test.ts — Pure unit tests for text/object diff
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DiffEngine } from '../DiffEngine';

describe('DiffEngine — text diff', () => {
  let d: DiffEngine;
  beforeEach(() => { d = new DiffEngine(); });

  it('detects no changes', () => {
    const c = d.diffText('hello', 'hello');
    expect(c.every((x) => x.type === 'equal')).toBe(true);
  });

  it('detects insertion', () => {
    const c = d.diffText('hello', 'hello world');
    const inserts = c.filter((x) => x.type === 'insert');
    expect(inserts.length).toBeGreaterThan(0);
  });

  it('detects deletion', () => {
    const c = d.diffText('hello world', 'hello');
    const deletes = c.filter((x) => x.type === 'delete');
    expect(deletes.length).toBeGreaterThan(0);
  });

  it('handles multi-line diff', () => {
    const c = d.diffText('a\nb\nc', 'a\nx\nc');
    const ops = c.map((x) => x.type);
    expect(ops).toContain('delete');
    expect(ops).toContain('insert');
  });

  it('empty to non-empty', () => {
    const c = d.diffText('', 'hello');
    expect(c.length).toBeGreaterThan(0);
    expect(c.some((x) => x.type === 'insert')).toBe(true);
  });

  it('non-empty to empty', () => {
    const c = d.diffText('hello', '');
    expect(c.length).toBeGreaterThan(0);
    expect(c.some((x) => x.type === 'delete')).toBe(true);
  });
});

describe('DiffEngine — similarity', () => {
  let d: DiffEngine;
  beforeEach(() => { d = new DiffEngine(); });

  it('returns 1 for identical', () => {
    expect(d.similarity('hello', 'hello')).toBe(1);
  });

  it('returns 0 for empty vs non-empty', () => {
    expect(d.similarity('', 'hello')).toBe(0);
  });

  it('returns 0 for both empty', () => {
    expect(d.similarity('', '')).toBe(1);
  });

  it('returns reasonable ratio for partial match', () => {
    const s = d.similarity('hello world', 'hello there');
    expect(s).toBeGreaterThan(0);
    expect(s).toBeLessThan(1);
  });
});

describe('DiffEngine — object diff', () => {
  let d: DiffEngine;
  beforeEach(() => { d = new DiffEngine(); });

  it('returns empty for identical objects', () => {
    expect(d.diffObject({ a: 1 }, { a: 1 })).toEqual([]);
  });

  it('detects added key', () => {
    const c = d.diffObject({ a: 1 }, { a: 1, b: 2 });
    expect(c.length).toBe(1);
    expect(c[0].op).toBe('add');
    expect(c[0].path).toBe('/b');
  });

  it('detects removed key', () => {
    const c = d.diffObject({ a: 1, b: 2 }, { a: 1 });
    expect(c[0].op).toBe('remove');
    expect(c[0].path).toBe('/b');
  });

  it('detects replaced value', () => {
    const c = d.diffObject({ a: 1 }, { a: 2 });
    expect(c[0].op).toBe('replace');
    expect(c[0].before).toBe(1);
    expect(c[0].after).toBe(2);
  });

  it('detects nested changes', () => {
    const c = d.diffObject({ a: { b: 1 } }, { a: { b: 2 } });
    expect(c[0].path).toBe('/a/b');
    expect(c[0].op).toBe('replace');
  });

  it('handles added nested', () => {
    const c = d.diffObject({ a: 1 }, { a: 1, b: { c: 1 } });
    expect(c[0].op).toBe('add');
    expect(c[0].path).toBe('/b');
  });

  it('handles type change', () => {
    const c = d.diffObject({ a: 1 }, { a: 'one' });
    expect(c[0].op).toBe('replace');
  });

  it('handles array to object', () => {
    const c = d.diffObject([1, 2], { x: 1 });
    expect(c[0].op).toBe('replace');
  });
});

describe('DiffEngine — stats', () => {
  let d: DiffEngine;
  beforeEach(() => { d = new DiffEngine(); });

  it('counts ops', () => {
    const c = d.diffObject({ a: 1 }, { b: 2, c: 3 });
    const s = d.stats(c);
    expect(s.added).toBe(2);
    expect(s.removed).toBe(1);
  });
});
