/**
 * Lexer.test.ts — Pure unit tests for tokenizer
 */

import { describe, it, expect } from 'vitest';
import { Lexer } from '../Lexer';

describe('Lexer — basic', () => {
  it('tokenizes simple expression', () => {
    const lex = new Lexer([
      { type: 'number', regex: /[0-9]+/ },
      { type: 'op', regex: /[+\-*/]/ },
      { type: 'ws', regex: /\s+/, ignore: true },
    ]);
    const r = lex.tokenize('1 + 2');
    expect(r.length).toBe(3);
    expect(r[0]).toMatchObject({ type: 'number', value: '1' });
    expect(r[1]).toMatchObject({ type: 'op', value: '+' });
    expect(r[2]).toMatchObject({ type: 'number', value: '2' });
  });

  it('tracks line and col', () => {
    const lex = new Lexer([
      { type: 'num', regex: /[0-9]+/ },
      { type: 'ws', regex: /\s+/, ignore: true },
    ]);
    const r = lex.tokenize('1\n2');
    expect(r[0].line).toBe(1);
    expect(r[1].line).toBe(2);
  });

  it('ignores whitespace', () => {
    const lex = new Lexer([
      { type: 'id', regex: /[a-z]+/ },
      { type: 'ws', regex: /\s+/, ignore: true },
    ]);
    const r = lex.tokenize('hello world');
    expect(r.length).toBe(2);
  });

  it('records start and end positions', () => {
    const lex = new Lexer([{ type: 'id', regex: /[a-z]+/ }]);
    const r = lex.tokenize('foo');
    expect(r[0].start).toBe(0);
    expect(r[0].end).toBe(3);
  });
});

describe('Lexer — keywords and identifiers', () => {
  it('distinguishes keywords from identifiers', () => {
    const lex = new Lexer([
      { type: 'kw', regex: /if|else|while/ },
      { type: 'id', regex: /[a-z]+/ },
    ]);
    const r = lex.tokenize('if foo while');
    expect(r[0].type).toBe('kw');
    expect(r[1].type).toBe('id');
    expect(r[2].type).toBe('kw');
  });
});

describe('Lexer — strings and numbers', () => {
  it('tokenizes string literals', () => {
    const lex = new Lexer([
      { type: 'str', regex: /"[^"]*"/ },
      { type: 'num', regex: /[0-9]+/ },
    ]);
    const r = lex.tokenize('"hello" 42');
    expect(r[0].value).toBe('"hello"');
    expect(r[1].value).toBe('42');
  });

  it('handles empty input', () => {
    const lex = new Lexer([{ type: 'any', regex: /.+/ }]);
    expect(lex.tokenize('')).toEqual([]);
  });

  it('handles tokens at start of line', () => {
    const lex = new Lexer([{ type: 'id', regex: /[a-z]+/ }]);
    const r = lex.tokenize('a\nb');
    expect(r[0].col).toBe(1);
    expect(r[1].col).toBe(1);
  });
});

describe('Lexer — priority', () => {
  it('matches longest first via regex order', () => {
    const lex = new Lexer([
      { type: 'comment', regex: /\/\/.*/ },
      { type: 'op', regex: /\// },
    ]);
    const r = lex.tokenize('// hello');
    expect(r[0].type).toBe('comment');
  });
});
