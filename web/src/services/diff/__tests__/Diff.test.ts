/**
 * Diff.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Diff } from '../Diff';

describe('Diff — lines', () => {
  it('identical', () => {
    const r = Diff.lines('a\nb', 'a\nb');
    expect(r.every((p) => p.op === 'equal')).toBe(true);
  });

  it('insert', () => {
    const r = Diff.lines('a\nc', 'a\nb\nc');
    const ins = r.filter((p) => p.op === 'insert');
    expect(ins.length).toBe(1);
    expect(ins[0].value).toBe('b');
  });

  it('delete', () => {
    const r = Diff.lines('a\nb\nc', 'a\nc');
    const del = r.filter((p) => p.op === 'delete');
    expect(del.length).toBe(1);
    expect(del[0].value).toBe('b');
  });

  it('replace', () => {
    const r = Diff.lines('a\nb\nc', 'a\nx\nc');
    const ops = r.filter((p) => p.op !== 'equal').map((p) => p.op);
    expect(ops).toContain('delete');
    expect(ops).toContain('insert');
  });
});

describe('Diff — words', () => {
  it('change word', () => {
    const r = Diff.words('hello world', 'hello there');
    const ins = r.filter((p) => p.op === 'insert').map((p) => p.value);
    expect(ins).toContain('there');
  });
});

describe('Diff — unified', () => {
  it('format', () => {
    const u = Diff.unified('a\nb', 'a\nc');
    expect(u).toContain('-b');
    expect(u).toContain('+c');
  });
});

describe('Diff — countChanges', () => {
  it('count', () => {
    const c = Diff.countChanges([
      { op: 'equal', value: 'a' },
      { op: 'delete', value: 'b' },
      { op: 'insert', value: 'x' },
    ]);
    expect(c.insertions).toBe(1);
    expect(c.deletions).toBe(1);
  });
});

describe('Diff — hunks', () => {
  it('one hunk', () => {
    const a = ['line1', 'line2', 'line3', 'line4', 'line5'].join('\n');
    const b = ['line1', 'line2', 'CHANGED', 'line4', 'line5'].join('\n');
    const h = Diff.hunks(a, b);
    expect(h.length).toBeGreaterThanOrEqual(1);
  });

  it('no changes', () => {
    const h = Diff.hunks('a\nb\nc', 'a\nb\nc');
    expect(h.length).toBe(0);
  });
});
