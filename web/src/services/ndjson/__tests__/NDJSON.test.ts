/**
 * NDJSON.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { NDJSON } from '../NDJSON';

describe('NDJSON — parse', () => {
  it('empty', () => {
    expect(NDJSON.parse('')).toEqual([]);
  });

  it('single', () => {
    expect(NDJSON.parse('{"a":1}')).toEqual([{ a: 1 }]);
  });

  it('multiple', () => {
    const input = '{"a":1}\n{"a":2}\n{"a":3}';
    expect(NDJSON.parse(input)).toEqual([{ a: 1 }, { a: 2 }, { a: 3 }]);
  });

  it('trailing newline', () => {
    expect(NDJSON.parse('{"a":1}\n')).toEqual([{ a: 1 }]);
  });

  it('blank lines', () => {
    expect(NDJSON.parse('{"a":1}\n\n{"a":2}')).toEqual([{ a: 1 }, { a: 2 }]);
  });
});

describe('NDJSON — stringify', () => {
  it('empty', () => {
    expect(NDJSON.stringify([])).toBe('');
  });

  it('multiple', () => {
    expect(NDJSON.stringify([{ a: 1 }, { a: 2 }])).toBe('{"a":1}\n{"a":2}\n');
  });

  it('roundtrip', () => {
    const items = [{ a: 1 }, { b: 2 }, [1, 2, 3]];
    expect(NDJSON.parse(NDJSON.stringify(items))).toEqual(items);
  });

  it('custom eol', () => {
    expect(NDJSON.stringify([{ a: 1 }], '\r\n')).toContain('\r\n');
  });
});

describe('NDJSON — stream', () => {
  it('generator', () => {
    const items = Array.from(NDJSON.parseStream('{"a":1}\n{"a":2}'));
    expect(items).toEqual([{ a: 1 }, { a: 2 }]);
  });
});

describe('NDJSON — count/validate', () => {
  it('count', () => {
    expect(NDJSON.count('{"a":1}\n{"a":2}\n')).toBe(2);
  });

  it('count blank lines', () => {
    expect(NDJSON.count('{"a":1}\n\n{"a":2}')).toBe(2);
  });

  it('isValid', () => {
    expect(NDJSON.isValid('{"a":1}\n{"a":2}')).toBe(true);
  });

  it('isValid false', () => {
    expect(NDJSON.isValid('{"a":1}\nnot-json')).toBe(false);
  });
});
