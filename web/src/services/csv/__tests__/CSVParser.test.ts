/**
 * CSVParser.test.ts — Pure unit tests for CSV parser
 */

import { describe, it, expect } from 'vitest';
import { CSVParser } from '../CSVParser';

describe('CSVParser — basic', () => {
  it('parses simple', () => {
    const r = new CSVParser().parse('a,b,c\n1,2,3');
    expect(r).toEqual([['a', 'b', 'c'], ['1', '2', '3']]);
  });

  it('parses single column', () => {
    expect(new CSVParser().parse('a\nb\nc')).toEqual([['a'], ['b'], ['c']]);
  });

  it('handles empty fields', () => {
    expect(new CSVParser().parse('a,,c')).toEqual([['a', '', 'c']]);
  });
});

describe('CSVParser — quoting', () => {
  it('quoted fields with comma', () => {
    expect(new CSVParser().parse('"a,b",c')).toEqual([['a,b', 'c']]);
  });

  it('quoted with newline', () => {
    expect(new CSVParser().parse('"a\nb",c')).toEqual([['a\nb', 'c']]);
  });

  it('escaped quotes', () => {
    expect(new CSVParser().parse('"a""b",c')).toEqual([['a"b', 'c']]);
  });
});

describe('CSVParser — custom delimiter', () => {
  it('tab delimiter', () => {
    expect(new CSVParser({ delimiter: '\t' }).parse('a\tb')).toEqual([['a', 'b']]);
  });
});

describe('CSVParser — stringify', () => {
  it('simple', () => {
    expect(new CSVParser().stringify([['a', 'b'], ['1', '2']])).toBe('a,b\n1,2');
  });

  it('escapes commas', () => {
    expect(new CSVParser().stringify([['a,b', 'c']])).toBe('"a,b",c');
  });

  it('escapes quotes', () => {
    expect(new CSVParser().stringify([['a"b']])).toBe('"a""b"');
  });
});

describe('CSVParser — header', () => {
  it('parses with header', () => {
    const r = new CSVParser().parseWithHeader('name,age\nAlice,30\nBob,25');
    expect(r).toEqual([
      { name: 'Alice', age: '30' },
      { name: 'Bob', age: '25' },
    ]);
  });

  it('stringify with header', () => {
    const s = new CSVParser().stringifyWithHeader(['name', 'age'], [['Alice', 30]]);
    expect(s).toBe('name,age\nAlice,30');
  });
});
