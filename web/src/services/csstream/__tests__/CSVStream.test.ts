/**
 * CSVStream.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { CSVStream } from '../CSVStream';

describe('CSVStream — rows', () => {
  it('simple', () => {
    const rows = Array.from(CSVStream.rows('a,b\nc,d'));
    expect(rows.length).toBe(2);
    expect(rows[0]).toEqual(['a', 'b']);
    expect(rows[1]).toEqual(['c', 'd']);
  });

  it('quoted', () => {
    const rows = Array.from(CSVStream.rows('"a","b"\n"c","d"'));
    expect(rows[0]).toEqual(['a', 'b']);
  });

  it('escaped quote', () => {
    const rows = Array.from(CSVStream.rows('"a""b"\nc'));
    expect(rows[0]).toEqual(['a"b']);
  });

  it('CRLF', () => {
    const rows = Array.from(CSVStream.rows('a,b\r\nc,d\r\n'));
    expect(rows.length).toBe(2);
  });

  it('trailing no newline', () => {
    const rows = Array.from(CSVStream.rows('a,b\nc,d'));
    expect(rows.length).toBe(2);
  });
});

describe('CSVStream — objects', () => {
  it('as objects', () => {
    const objs = Array.from(CSVStream.objects('name,age\nAlice,30\nBob,25'));
    expect(objs.length).toBe(2);
    expect(objs[0].name).toBe('Alice');
    expect(objs[0].age).toBe('30');
  });
});

describe('CSVStream — count/take', () => {
  it('count', () => {
    expect(CSVStream.count('a,b\nc,d\ne,f')).toBe(3);
  });

  it('take', () => {
    const rows = CSVStream.take('a,b\nc,d\ne,f', 2);
    expect(rows.length).toBe(2);
  });
});

describe('CSVStream — custom delimiter', () => {
  it('tab delimiter', () => {
    const rows = Array.from(CSVStream.rows('a\tb\nc\td', { delimiter: '\t' }));
    expect(rows[0]).toEqual(['a', 'b']);
  });

  it('semicolon', () => {
    const rows = Array.from(CSVStream.rows('a;b\nc;d', { delimiter: ';' }));
    expect(rows[0]).toEqual(['a', 'b']);
  });
});
