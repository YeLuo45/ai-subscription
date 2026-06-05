/**
 * QueryParser — SQL-like filter query parser
 *
 * Inspired by: MongoDB query syntax / LINQ
 *
 * Parse simple query expressions against object arrays.
 * Supports:
 *   - equality: field = value, field == value
 *   - inequality: field != value
 *   - comparison: field > value, field >= value, field < value, field <= value
 *   - in: field IN (a, b, c)
 *   - not in: field NOT IN (a, b)
 *   - like: field LIKE "pattern%" (starts-with)
 *   - and: a AND b
 *   - or: a OR b
 *   - not: NOT expr
 *   - parentheses for grouping
 */

export type FieldValue = string | number | boolean | null;

export interface ParsedQuery {
  type: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'like' | 'and' | 'or' | 'not' | 'true';
  field?: string;
  value?: FieldValue | FieldValue[];
  children?: ParsedQuery[];
}

export class QueryParser {
  private tokens: string[] = [];
  private pos: number = 0;

  parse(query: string): ParsedQuery {
    this.tokens = this.tokenize(query);
    this.pos = 0;
    const result = this.parseOr();
    if (this.pos < this.tokens.length) {
      throw new Error(`unexpected token: ${this.tokens[this.pos]}`);
    }
    return result;
  }

  /**
   * Execute a parsed query against a row.
   */
  evaluate(q: ParsedQuery, row: Record<string, unknown>): boolean {
    switch (q.type) {
      case 'true':
        return true;
      case 'eq':
        return row[q.field!] === q.value;
      case 'ne':
        return row[q.field!] !== q.value;
      case 'gt':
        return Number(row[q.field!]) > Number(q.value);
      case 'gte':
        return Number(row[q.field!]) >= Number(q.value);
      case 'lt':
        return Number(row[q.field!]) < Number(q.value);
      case 'lte':
        return Number(row[q.field!]) <= Number(q.value);
      case 'in':
        return (q.value as FieldValue[]).includes(row[q.field!] as FieldValue);
      case 'nin':
        return !(q.value as FieldValue[]).includes(row[q.field!] as FieldValue);
      case 'like': {
        const v = String(row[q.field!] ?? '');
        const pattern = String(q.value);
        // Convert SQL LIKE pattern to regex
        const regex = new RegExp('^' + pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*') + '$');
        return regex.test(v);
      }
      case 'and':
        return q.children!.every((c) => this.evaluate(c, row));
      case 'or':
        return q.children!.some((c) => this.evaluate(c, row));
      case 'not':
        return !this.evaluate(q.children![0], row);
      default:
        return false;
    }
  }

  /**
   * Apply a query to a collection of rows.
   */
  filter<T extends Record<string, unknown>>(rows: T[], query: string | ParsedQuery): T[] {
    const q = typeof query === 'string' ? this.parse(query) : query;
    return rows.filter((r) => this.evaluate(q, r));
  }

  private tokenize(query: string): string[] {
    const tokens: string[] = [];
    let i = 0;
    while (i < query.length) {
      const c = query[i];
      if (c === ' ' || c === '\t' || c === '\n') {
        i += 1;
        continue;
      }
      if (c === '(' || c === ')' || c === ',') {
        tokens.push(c);
        i += 1;
        continue;
      }
      // String literal
      if (c === '"' || c === "'") {
        const quote = c;
        i += 1;
        let s = '';
        while (i < query.length && query[i] !== quote) {
          s += query[i];
          i += 1;
        }
        i += 1; // skip closing quote
        tokens.push(`"${s}"`);
        continue;
      }
      // Number or word
      if (/[0-9.-]/.test(c)) {
        let s = '';
        while (i < query.length && /[0-9.-]/.test(query[i])) {
          s += query[i];
          i += 1;
        }
        tokens.push(s);
        continue;
      }
      // Word
      if (/[a-zA-Z_]/.test(c)) {
        let s = '';
        while (i < query.length && /[a-zA-Z0-9_]/.test(query[i])) {
          s += query[i];
          i += 1;
        }
        tokens.push(s);
        continue;
      }
      // Operators
      if (c === '!' && query[i + 1] === '=') {
        tokens.push('!=');
        i += 2;
        continue;
      }
      if (c === '=' && query[i + 1] === '=') {
        tokens.push('==');
        i += 2;
        continue;
      }
      if (c === '>' && query[i + 1] === '=') {
        tokens.push('>=');
        i += 2;
        continue;
      }
      if (c === '<' && query[i + 1] === '=') {
        tokens.push('<=');
        i += 2;
        continue;
      }
      if (c === '>') { tokens.push('>'); i += 1; continue; }
      if (c === '<') { tokens.push('<'); i += 1; continue; }
      if (c === '=') { tokens.push('='); i += 1; continue; }
      throw new Error(`unexpected character: ${c}`);
    }
    return tokens;
  }

  private peek(): string | undefined { return this.tokens[this.pos]; }
  private consume(): string { return this.tokens[this.pos++]; }

  private parseOr(): ParsedQuery {
    let left = this.parseAnd();
    while (this.peek() === 'OR') {
      this.consume();
      const right = this.parseAnd();
      left = { type: 'or', children: [left, right] };
    }
    return left;
  }

  private parseAnd(): ParsedQuery {
    let left = this.parseNot();
    while (this.peek() === 'AND') {
      this.consume();
      const right = this.parseNot();
      left = { type: 'and', children: [left, right] };
    }
    return left;
  }

  private parseNot(): ParsedQuery {
    if (this.peek() === 'NOT') {
      this.consume();
      const expr = this.parseNot();
      return { type: 'not', children: [expr] };
    }
    return this.parseAtom();
  }

  private parseAtom(): ParsedQuery {
    if (this.peek() === '(') {
      this.consume();
      const expr = this.parseOr();
      if (this.peek() !== ')') throw new Error('expected )');
      this.consume();
      return expr;
    }
    return this.parseComparison();
  }

  private parseComparison(): ParsedQuery {
    const field = this.consume();
    const op = this.peek();
    if (op === '=' || op === '==') {
      this.consume();
      return { type: 'eq', field, value: this.parseValue() };
    }
    if (op === '!=') {
      this.consume();
      return { type: 'ne', field, value: this.parseValue() };
    }
    if (op === '>') {
      this.consume();
      return { type: 'gt', field, value: this.parseValue() };
    }
    if (op === '>=') {
      this.consume();
      return { type: 'gte', field, value: this.parseValue() };
    }
    if (op === '<') {
      this.consume();
      return { type: 'lt', field, value: this.parseValue() };
    }
    if (op === '<=') {
      this.consume();
      return { type: 'lte', field, value: this.parseValue() };
    }
    if (op === 'IN') {
      this.consume();
      return { type: 'in', field, value: this.parseList() };
    }
    if (op === 'NOT') {
      this.consume();
      if (this.peek() !== 'IN') throw new Error('expected IN');
      this.consume();
      return { type: 'nin', field, value: this.parseList() };
    }
    if (op === 'LIKE') {
      this.consume();
      return { type: 'like', field, value: this.parseValue() };
    }
    // No comparison — implicit truthy check
    return { type: 'true' };
  }

  private parseValue(): FieldValue {
    const tok = this.consume();
    if (tok.startsWith('"') && tok.endsWith('"')) return tok.slice(1, -1);
    if (tok === 'true') return true;
    if (tok === 'false') return false;
    if (tok === 'null') return null;
    const n = Number(tok);
    if (!isNaN(n)) return n;
    return tok;
  }

  private parseList(): FieldValue[] {
    if (this.peek() !== '(') throw new Error('expected (');
    this.consume();
    const list: FieldValue[] = [];
    while (this.peek() !== ')') {
      list.push(this.parseValue());
      if (this.peek() === ',') this.consume();
    }
    this.consume();
    return list;
  }
}
