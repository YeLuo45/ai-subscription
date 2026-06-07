/**
 * JSONStream — streaming JSON token iterator
 *
 * Inspired by: oboe.js / clarinet
 *
 * Provides event-based JSON streaming without full parse.
 */

export type JSONStreamEvent = 'openObject' | 'closeObject' | 'openArray' | 'closeArray' | 'key' | 'value' | 'error';

export interface JSONStreamToken {
  type: JSONStreamEvent;
  value?: string;
  key?: string;
  path: string;
}

export class JSONStream {
  private pos: number = 0;
  private path: string[] = [];
  private input: string;

  constructor(input: string) {
    this.input = input;
  }

  /**
   * Iterate next token.
   * Returns null when done.
   */
  next(): JSONStreamToken | null {
    if (this.pos >= this.input.length) return null;
    this.skipWhitespace();
    if (this.pos >= this.input.length) return null;
    const c = this.input[this.pos];
    if (c === '{') {
      this.pos++;
      this.path.push('object');
      return { type: 'openObject', path: this.path.join('.') };
    }
    if (c === '}') {
      this.pos++;
      this.path.pop();
      return { type: 'closeObject', path: this.path.join('.') };
    }
    if (c === '[') {
      this.pos++;
      this.path.push('array');
      return { type: 'openArray', path: this.path.join('.') };
    }
    if (c === ']') {
      this.pos++;
      this.path.pop();
      return { type: 'closeArray', path: this.path.join('.') };
    }
    if (c === '"') {
      return this.readString();
    }
    if (c === ',' || c === ':') {
      this.pos++;
      return this.next();
    }
    // Number, true, false, null
    return this.readLiteral();
  }

  /**
   * Stream all tokens.
   */
  *tokens(): Generator<JSONStreamToken> {
    while (true) {
      const t = this.next();
      if (t === null) return;
      yield t;
    }
  }

  private skipWhitespace(): void {
    while (this.pos < this.input.length && /\s/.test(this.input[this.pos])) this.pos++;
  }

  private readString(): JSONStreamToken {
    this.pos++; // opening "
    let str = '';
    while (this.pos < this.input.length) {
      const c = this.input[this.pos];
      if (c === '\\') {
        str += this.input[this.pos + 1];
        this.pos += 2;
        continue;
      }
      if (c === '"') {
        this.pos++;
        // Check if this is a key (followed by :) or value
        const after = this.input.slice(this.pos).match(/^\s*:/);
        if (after) {
          this.path.push(str);
          return { type: 'key', value: str, key: str, path: this.path.join('.') };
        }
        return { type: 'value', value: str, path: this.path.join('.') };
      }
      str += c;
      this.pos++;
    }
    throw new Error('Unterminated string');
  }

  private readLiteral(): JSONStreamToken {
    const start = this.pos;
    while (this.pos < this.input.length && /[^,}\]\s]/.test(this.input[this.pos])) this.pos++;
    const lit = this.input.slice(start, this.pos);
    return { type: 'value', value: lit, path: this.path.join('.') };
  }

  /**
   * Stream a single value.
   */
  static readValue(input: string): unknown {
    return JSON.parse(input);
  }

  /**
   * Find values at path (event-driven).
   */
  static findAll(input: string, targetPath: string): string[] {
    const stream = new JSONStream(input);
    const results: string[] = [];
    let cur = '';
    for (const tok of stream.tokens()) {
      if (tok.type === 'value') {
        cur = tok.value ?? '';
        if (tok.path === targetPath) results.push(cur);
        // Pop after value
        if (stream['path'].length > 0) stream['path'].pop();
      }
    }
    return results;
  }
}
