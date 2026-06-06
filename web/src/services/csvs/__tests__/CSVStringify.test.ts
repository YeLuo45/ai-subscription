/**
 * CSVStringify.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { CSVStringify } from '../CSVStringify';

describe('CSVStringify — basic', () => {
  it('single row', () => {
    expect(CSVStringify.stringify([['a', 'b', 'c']])).toBe('a,b,c');
  });

  it('multiple rows', () => {
    expect(CSVStringify.stringify([['a', 'b'], ['c', 'd']])).toBe('a,b\nc,d');
  });

  it('numbers', () => {
    expect(CSVStringify.stringify([[1, 2, 3]])).toBe('1,2,3');
  });

  it('booleans', () => {
    expect(CSVStringify.stringify([[true, false]])).toBe('true,false');
  });

  it('null', () => {
    expect(CSVStringify.stringify([[null, undefined]])).toBe(',');
  });
});

describe('CSVStringify — quoting', () => {
  it('comma in field', () => {
    expect(CSVStringify.stringify([['a,b', 'c']])).toBe('"a,b",c');
  });

  it('quote in field', () => {
    expect(CSVStringify.stringify([['a"b', 'c']])).toBe('"a""b",c');
  });

  it('newline in field', () => {
    expect(CSVStringify.stringify([['a\nb', 'c']])).toBe('"a\nb",c');
  });

  it('always quote', () => {
    expect(CSVStringify.stringify([['a', 'b']], { quoted: true })).toBe('"a","b"');
  });

  it('conditional quote', () => {
    const fn = (v: string) => v.startsWith('x');
    expect(CSVStringify.stringify([['a', 'xb']], { quoted: fn })).toBe('a,"xb"');
  });
});

describe('CSVStringify — custom options', () => {
  it('tab delimiter', () => {
    expect(CSVStringify.stringify([['a', 'b']], { delimiter: '\t' })).toBe('a\tb');
  });

  it('CRLF EOL', () => {
    expect(CSVStringify.stringify([['a'], ['b']], { eol: '\r\n' })).toBe('a\r\nb');
  });
});

describe('CSVStringify — stringifyObjects', () => {
  it('with header', () => {
    const r = CSVStringify.stringifyObjects([{ a: 1, b: 2 }, { a: 3, b: 4 }]);
    expect(r).toBe('a,b\n1,2\n3,4');
  });

  it('no header', () => {
    const r = CSVStringify.stringifyObjects([{ a: 1 }], undefined, { header: false });
    expect(r).toBe('1');
  });

  it('specific columns', () => {
    const r = CSVStringify.stringifyObjects([{ a: 1, b: 2, c: 3 }], ['a', 'c']);
    expect(r).toBe('a,c\n1,3');
  });

  it('empty', () => {
    expect(CSVStringify.stringifyObjects([])).toBe('');
  });
});

describe('CSVStringify — quote/unquote', () => {
  it('quote', () => {
    expect(CSVStringify.quote('hello')).toBe('"hello"');
  });

  it('quote with quote inside', () => {
    expect(CSVStringify.quote('he"llo')).toBe('"he""llo"');
  });

  it('unquote', () => {
    expect(CSVStringify.unquote('"hello"')).toBe('hello');
  });

  it('unquote with escaped', () => {
    expect(CSVStringify.unquote('"he""llo"')).toBe('he"llo');
  });

  it('unquote not quoted', () => {
    expect(CSVStringify.unquote('hello')).toBe('hello');
  });
});

describe('CSVStringify — row', () => {
  it('row', () => {
    expect(CSVStringify.row(['a', 'b', 'c'])).toBe('a,b,c');
  });
});
