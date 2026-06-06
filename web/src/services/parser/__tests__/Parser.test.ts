/**
 * Parser.test.ts — Pure unit tests for LL(1) parser
 */

import { describe, it, expect } from 'vitest';
import { Lexer, type Token } from '../../lexer/Lexer';
import { Parser, ParseError } from '../Parser';

function makeParser(input: string): Parser {
  const lex = new Lexer([
    { type: 'num', regex: /[0-9]+/ },
    { type: 'op', regex: /[+\-*/]/ },
    { type: 'lparen', regex: /\(/ },
    { type: 'rparen', regex: /\)/ },
    { type: 'ws', regex: /\s+/, ignore: true },
  ]);
  const tokens = lex.tokenize(input);
  return new Parser(tokens);
}

describe('Parser — basic', () => {
  it('parses single number', () => {
    const p = makeParser('42');
    p.rule('expr', function (this: Parser) {
      return Number(this.expect('num').value);
    });
    expect(p.parse('expr')).toBe(42);
  });

  it('parses addition', () => {
    const p = makeParser('1 + 2');
    p.rule('expr', function (this: Parser) {
      const left = Number(this.expect('num').value);
      this.expect('op');
      const right = Number(this.expect('num').value);
      return { type: 'add', left, right };
    });
    expect(p.parse('expr')).toEqual({ type: 'add', left: 1, right: 2 });
  });
});

describe('Parser — expect', () => {
  it('throws on wrong type', () => {
    const p = makeParser('1 + 2');
    p.expect('num');
    expect(() => p.expect('num')).toThrow(ParseError);
  });
});

describe('Parser — peek and match', () => {
  it('peek returns current', () => {
    const p = makeParser('42');
    expect(p.peek()?.value).toBe('42');
  });

  it('match returns true for current type', () => {
    const p = makeParser('42');
    expect(p.match('num')).toBe(true);
    expect(p.match('op')).toBe(false);
  });

  it('consume advances on match', () => {
    const p = makeParser('42');
    expect(p.consume('num')?.value).toBe('42');
    expect(p.eof()).toBe(true);
  });
});

describe('Parser — save/restore', () => {
  it('restores position', () => {
    const p = makeParser('1 + 2');
    const saved = p.savePos();
    p.expect('num');
    p.restorePos(saved);
    expect(p.peek()?.value).toBe('1');
  });
});

describe('Parser — tryParse', () => {
  it('returns null on failure', () => {
    const p = makeParser('1 + 2');
    const r = p.tryParse(() => p.expect('op'));
    expect(r).toBe(null);
  });
});

describe('Parser — arithmetic grammar', () => {
  it('parses 1 + 2 * 3', () => {
    const p = makeParser('1 + 2 * 3');
    p.rule('expr', function (this: Parser) { return this.parse('add'); });
    p.rule('add', function (this: Parser) {
      let left = this.parse('mul');
      while (this.match('op') && (this.peek()!.value === '+' || this.peek()!.value === '-')) {
        const op = this.expect('op').value;
        const right = this.parse('mul');
        left = { type: 'binop', op, left, right };
      }
      return left;
    });
    p.rule('mul', function (this: Parser) {
      let left = this.parse('atom');
      while (this.match('op') && (this.peek()!.value === '*' || this.peek()!.value === '/')) {
        const op = this.expect('op').value;
        const right = this.parse('atom');
        left = { type: 'binop', op, left, right };
      }
      return left;
    });
    p.rule('atom', function (this: Parser) {
      if (this.match('lparen')) {
        this.expect('lparen');
        const e = this.parse('expr');
        this.expect('rparen');
        return e;
      }
      return Number(this.expect('num').value);
    });
    const ast = p.parse('expr') as { type: string; op: string; left: unknown; right: unknown };
    expect(ast.op).toBe('+');
  });
});

describe('Parser — eof', () => {
  it('detects end', () => {
    const p = makeParser('1');
    expect(p.eof()).toBe(false);
    p.expect('num');
    expect(p.eof()).toBe(true);
  });
});
