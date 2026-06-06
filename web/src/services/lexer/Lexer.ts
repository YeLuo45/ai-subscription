/**
 * Lexer — generic tokenizer
 *
 * Inspired by: classic compiler lexers
 *
 * Tokenize a string into typed tokens using regex patterns.
 * Skip whitespace. Report position for error messages.
 */

export type TokenType = string;

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  col: number;
  start: number;
  end: number;
}

export interface TokenSpec {
  type: TokenType;
  regex: RegExp;
  ignore?: boolean;
}

export class Lexer {
  private specs: TokenSpec[];
  private masterRegex: RegExp;

  constructor(specs: TokenSpec[]) {
    this.specs = specs;
    // Combine all regexes into one with alternation
    const pattern = specs.map((s) => `(${s.regex.source})`).join('|');
    this.masterRegex = new RegExp(pattern, 'g');
  }

  tokenize(input: string): Token[] {
    const tokens: Token[] = [];
    this.masterRegex.lastIndex = 0;
    let line = 1;
    let col = 1;
    let lastIdx = 0;
    let m: RegExpExecArray | null;
    while ((m = this.masterRegex.exec(input)) !== null) {
      // Update col/line for any gap between lastIdx and m.index (e.g., newlines)
      if (m.index > lastIdx) {
        const gap = input.slice(lastIdx, m.index);
        const gapNewlines = (gap.match(/\n/g) || []).length;
        if (gapNewlines > 0) {
          line += gapNewlines;
          col = gap.length - gap.lastIndexOf('\n');
        } else {
          col += gap.length;
        }
      }
      const start = m.index;
      const value = m[0];
      let spec: TokenSpec | null = null;
      for (let i = 0; i < this.specs.length; i++) {
        if (m[i + 1] !== undefined) {
          spec = this.specs[i];
          break;
        }
      }
      if (!spec) break;
      if (!spec.ignore) {
        tokens.push({
          type: spec.type,
          value,
          line,
          col,
          start,
          end: start + value.length,
        });
      }
      // Update line/col based on the matched value
      const newlines = (value.match(/\n/g) || []).length;
      if (newlines > 0) {
        line += newlines;
        col = value.length - value.lastIndexOf('\n');
      } else {
        col += value.length;
      }
      lastIdx = start + value.length;
      if (value === '') this.masterRegex.lastIndex += 1;
    }
    return tokens;
  }
}
