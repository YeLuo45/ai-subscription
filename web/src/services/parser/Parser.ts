/**
 * Parser — LL(1) recursive descent parser
 *
 * Inspired by: classic Pratt parser / RD parser
 *
 * Define grammar rules and parse tokens into AST.
 * Supports:
 *   - rule(name, parser): register rule
 *   - parse(ruleName): parse using rule
 *   - expect(type): consume token of expected type
 *   - peek/match/at helpers
 */

import type { Token } from '../lexer/Lexer';

export type RuleParser = (this: Parser) => unknown;

export class ParseError extends Error {
  constructor(public token: Token | null, message: string) {
    super(`Parse error at line ${token?.line ?? 0}:${token?.col ?? 0}: ${message}`);
  }
}

export class Parser {
  private tokens: Token[];
  private pos: number = 0;
  private rules: Map<string, RuleParser> = new Map();

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  /** Register a named rule. */
  rule(name: string, parser: RuleParser): this {
    this.rules.set(name, parser);
    return this;
  }

  /** Parse using the given rule. */
  parse(ruleName: string): unknown {
    const parser = this.rules.get(ruleName);
    if (!parser) throw new Error(`No rule: ${ruleName}`);
    return parser.call(this);
  }

  /** Get current token without advancing. */
  peek(offset: number = 0): Token | null {
    return this.tokens[this.pos + offset] ?? null;
  }

  /** Check if current token matches the given type. */
  match(type: string): boolean {
    return this.peek()?.type === type;
  }

  /** Consume current token if it matches; return it or null. */
  consume(type: string): Token | null {
    if (this.match(type)) return this.tokens[this.pos++];
    return null;
  }

  /** Consume current token; throw if mismatch. */
  expect(type: string): Token {
    const t = this.peek();
    if (!t || t.type !== type) {
      throw new ParseError(t, `Expected ${type} but got ${t?.type ?? 'EOF'}`);
    }
    return this.tokens[this.pos++];
  }

  /** Check if we're at end. */
  eof(): boolean {
    return this.pos >= this.tokens.length;
  }

  /** Get current position for backtracking. */
  savePos(): number { return this.pos; }

  /** Restore position. */
  restorePos(p: number): void { this.pos = p; }

  /** Run a function with saved position; restore on failure. */
  tryParse(fn: () => unknown): unknown {
    const saved = this.savePos();
    try {
      return fn();
    } catch {
      this.restorePos(saved);
      return null;
    }
  }
}
