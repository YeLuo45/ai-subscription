/**
 * QueryString — URL query string with nested/array support
 *
 * Inspired by: qs npm
 *
 * Parse deep object: ?a[b][c]=1 → { a: { b: { c: 1 } } }
 * Serialize deep object back.
 */

export class QueryString {
  /**
   * Parse query string with nested support.
   * Default separator: '[' / ']'
   */
  static parse(input: string, options: { depth?: number; arrayLimit?: number } = {}): Record<string, unknown> {
    const depth = options.depth ?? 5;
    const arrayLimit = options.arrayLimit ?? 20;
    const trimmed = input.startsWith('?') ? input.slice(1) : input;
    if (trimmed.length === 0) return {};
    const result: Record<string, unknown> = {};
    for (const pair of trimmed.split('&')) {
      if (!pair) continue;
      const eq = pair.indexOf('=');
      let k: string, v: string;
      if (eq < 0) {
        k = decode(pair);
        v = '';
      } else {
        k = decode(pair.slice(0, eq));
        v = decode(pair.slice(eq + 1));
      }
      this.setNested(result, k, v, depth, arrayLimit);
    }
    return result;
  }

  private static setNested(obj: Record<string, unknown>, key: string, value: string, depth: number, arrayLimit: number): void {
    const parts = this.parseKey(key, depth);
    let cur: any = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      const next = parts[i + 1];
      const isArr = /^\d+$/.test(next);
      if (cur[part] === undefined) {
        cur[part] = isArr ? [] : {};
      }
      cur = cur[part];
    }
    const last = parts[parts.length - 1];
    if (/^\d+$/.test(last) && Array.isArray(cur)) {
      const idx = Math.min(parseInt(last, 10), arrayLimit);
      cur[idx] = value;
    } else {
      cur[last] = value;
    }
  }

  private static parseKey(key: string, depth: number): string[] {
    // Split on first '.' or '['
    const parts: string[] = [];
    let cur = '';
    let inBracket = false;
    let d = 0;
    for (let i = 0; i < key.length; i++) {
      const c = key[i];
      if (d >= depth) {
        cur += key.slice(i);
        break;
      }
      if (c === '[') {
        if (cur) parts.push(cur);
        cur = '';
        inBracket = true;
      } else if (c === ']') {
        if (cur) parts.push(cur);
        cur = '';
        inBracket = false;
        d += 1;
      } else if (c === '.' && !inBracket) {
        if (cur) parts.push(cur);
        cur = '';
        d += 1;
      } else {
        cur += c;
      }
    }
    if (cur) parts.push(cur);
    return parts;
  }

  /**
   * Stringify object with nested support.
   */
  static stringify(obj: Record<string, unknown>): string {
    const parts: string[] = [];
    for (const [k, v] of Object.entries(obj)) {
      this.serializeValue(k, v, parts);
    }
    return parts.join('&');
  }

  private static serializeValue(key: string, value: unknown, parts: string[]): void {
    if (value === null || value === undefined) {
      parts.push(encode(key));
    } else if (Array.isArray(value)) {
      value.forEach((item, i) => {
        this.serializeValue(`${key}[${i}]`, item, parts);
      });
    } else if (typeof value === 'object') {
      for (const [k, v] of Object.entries(value)) {
        this.serializeValue(`${key}[${k}]`, v, parts);
      }
    } else {
      parts.push(`${encode(key)}=${encode(String(value))}`);
    }
  }

  /**
   * Get value by path: qs.get(parsed, 'a.b.c')
   */
  static get(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let cur: any = obj;
    for (const p of parts) {
      if (cur === null || cur === undefined) return undefined;
      cur = cur[p];
    }
    return cur;
  }

  /**
   * Set value by path.
   */
  static set(obj: Record<string, unknown>, path: string, value: unknown): void {
    const parts = path.split('.');
    let cur: any = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      if (cur[p] === undefined) cur[p] = {};
      cur = cur[p];
    }
    cur[parts[parts.length - 1]] = value;
  }
}

function encode(s: string): string {
  // Keep [ ] . unencoded for qs nested format
  return encodeURIComponent(s).replace(/%5B/g, '[').replace(/%5D/g, ']');
}
function decode(s: string): string {
  return decodeURIComponent(s.replace(/\+/g, ' '));
}
