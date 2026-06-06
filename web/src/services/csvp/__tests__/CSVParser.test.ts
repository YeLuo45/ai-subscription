/**
 * CSVParser.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { CSVParser } from '../CSVParser';

describe('CSVParser — basic', () => {
  it('simple', () => {
    const r = CSVParser.parse('a,b,c');
    expect(r).toEqual([['a', 'b', 'c']]);
  });

  it('two rows', () => {
    const r = CSVParser.parse('a,b\nc,d');
    expect(r).toEqual([['a', 'b'], ['c', 'd']]);
  });

  it('CRLF', () => {
    const r = CSVParser.parse('a,b\r\nc,d');
    expect(r).toEqual([['a', 'b'], ['c', 'd']]);
  });

  it('empty', () => {
    expect(CSVParser.parse('')).toEqual([]);
  });

  it('trailing newline', () => {
    const r = CSVParser.parse('a,b\n');
    expect(r).toEqual([['a', 'b']]);
  });
});

describe('CSVParser — quoted', () => {
  it('quoted', () => {
    expect(CSVParser.parse('"a","b"')).toEqual([['a', 'b']]);
  });

  it('comma in quote', () => {
    expect(CSVParser.parse('"a,b",c')).toEqual([['a,b', 'c']]);
  });

  it('newline in quote', () => {
    expect(CSVParser.parse('"a\nb",c')).toEqual([['a\nb', 'c']]);
  });

  it('escaped quote', () => {
    expect(CSVParser.parse('"a""b"')).toEqual([['a"b']]);
  });

  it('mixed', () => {
    expect(CSVParser.parse('"hello, world",foo')).toEqual([['hello, world', 'foo']]);
  });
});

describe('CSVParser — custom delimiter', () => {
  it('tab', () => {
    expect(CSVParser.parse('a\tb\tc', { delimiter: '\t' })).toEqual([['a', 'b', 'c']]);
  });

  it('semicolon', () => {
    expect(CSVParser.parse('a;b;c', { delimiter: ';' })).toEqual([['a', 'b', 'c']]);
  });
});

describe('CSVParser — header', () => {
  it('hasHeader', () => {
    const r = CSVParser.parse('name,age\nfoo,42', { hasHeader: true });
    expect(r).toEqual([{ name: 'foo', age: '42' }]);
  });

  it('multiple objects', () => {
    const r = CSVParser.parse('a,b\n1,2\n3,4', { hasHeader: true });
    expect(r).toEqual([{ a: '1', b: '2' }, { a: '3', b: '4' }]);
  });
});

describe('CSVParser — trim', () => {
  it('trims', () => {
    expect(CSVParser.parse('  a  ,  b  ', { trim: true })).toEqual([['a', 'b']]);
  });
});

describe('CSVParser — utilities', () => {
  it('column', () => {
    expect(CSVParser.column([['a', 'b'], ['c', 'd']], 0)).toEqual(['a', 'c']);
  });

  it('getColumn', () => {
    const rows = [{ a: 'x' }, { a: 'y' }];
    expect(CSVParser.getColumn(rows, 'a')).toEqual(['x', 'y']);
  });

  it('count', () => {
    expect(CSVParser.count([['a']])).toBe(1);
  });

  it('filter', () => {
    const r = CSVParser.filter([['a'], ['b'], ['c']], (row) => row[0] !== 'b');
    expect(r).toEqual([['a'], ['c']]);
  });
});
