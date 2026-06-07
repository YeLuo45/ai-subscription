/**
 * JSONL.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { JSONL } from '../JSONL';

describe('JSONL — parse', () => {
  it('basic', () => {
    const r = JSONL.parse('{"a":1}\n{"b":2}');
    expect(r.length).toBe(2);
    expect((r[0] as { a: number }).a).toBe(1);
  });

  it('empty', () => {
    expect(JSONL.parse('')).toEqual([]);
  });

  it('skip blank lines', () => {
    const r = JSONL.parse('{"a":1}\n\n{"b":2}\n');
    expect(r.length).toBe(2);
  });

  it('count', () => {
    expect(JSONL.count('{"a":1}\n{"b":2}\n{"c":3}')).toBe(3);
  });
});

describe('JSONL — stringify', () => {
  it('basic', () => {
    const s = JSONL.stringify([{ a: 1 }, { b: 2 }]);
    expect(s).toBe('{"a":1}\n{"b":2}');
  });

  it('empty', () => {
    expect(JSONL.stringify([])).toBe('');
  });
});

describe('JSONL — stream', () => {
  it('parseStream', () => {
    const gen = JSONL.parseStream('{"a":1}\n{"b":2}');
    expect(gen.next().value).toEqual({ a: 1 });
    expect(gen.next().value).toEqual({ b: 2 });
    expect(gen.next().done).toBe(true);
  });

  it('stringifyStream', () => {
    const gen = JSONL.stringifyStream([{ x: 1 }, { y: 2 }]);
    expect(gen.next().value).toBe('{"x":1}');
    expect(gen.next().value).toBe('{"y":2}');
  });
});

describe('JSONL — validate', () => {
  it('valid', () => {
    expect(JSONL.isValid('{"a":1}\n{"b":2}')).toBe(true);
  });

  it('invalid line', () => {
    expect(JSONL.isValid('{"a":1}\nnot json')).toBe(false);
  });

  it('empty valid', () => {
    expect(JSONL.isValid('')).toBe(true);
  });
});

describe('JSONL — filter/map/reduce', () => {
  it('filter', () => {
    const r = JSONL.filter('{"n":1}\n{"n":2}\n{"n":3}', (i) => ((i as { n: number }).n > 1));
    expect(JSONL.count(r)).toBe(2);
  });

  it('map', () => {
    const r = JSONL.map<{ n: number }, { m: number }>('{"n":1}\n{"n":2}', (i) => ({ m: i.n * 2 }));
    const arr = JSONL.parse(r);
    expect((arr[0] as { m: number }).m).toBe(2);
  });

  it('reduce', () => {
    const sum = JSONL.reduce<{ n: number }, number>('{"n":1}\n{"n":2}\n{"n":3}', (a, i) => a + i.n, 0);
    expect(sum).toBe(6);
  });
});
