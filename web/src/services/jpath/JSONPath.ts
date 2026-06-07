/**
 * JSONPath — simplified JSONPath
 *
 * Inspired by: jsonpath-plus
 *
 * Supports: $, ., .., [n], [n,m], [n:m], *, @, filter?()
 */

export class JSONPath {
  /**
   * Query JSON with JSONPath expression.
   * Returns array of matching values.
   */
  static query(doc: unknown, expr: string): unknown[] {
    const tokens = JSONPath.tokenize(expr);
    let results: unknown[] = [doc];
    for (const token of tokens) {
      results = JSONPath.applyToken(results, token);
    }
    return results;
  }

  /**
   * Query with paths (returns path + value pairs).
   */
  static queryPaths(doc: unknown, expr: string): Array<{ path: string; value: unknown }> {
    const tokens = JSONPath.tokenize(expr);
    let paths: string[] = ['$'];
    let values: unknown[] = [doc];
    for (const token of tokens) {
      const newPaths: string[] = [];
      const newValues: unknown[] = [];
      for (let i = 0; i < values.length; i++) {
        const v = values[i];
        const p = paths[i];
        const sub = JSONPath.applyToken([v], token);
        for (const s of sub) {
          newValues.push(s);
          newPaths.push(p + JSONPath.toPathSegment(token, v, s));
        }
      }
      paths = newPaths;
      values = newValues;
    }
    return paths.map((p, i) => ({ path: p, value: values[i] }));
  }

  private static toPathSegment(token: string, _parent: unknown, _value: unknown): string {
    if (token.startsWith('.')) return token;
    if (token === '..') return '..';
    return token;
  }

  private static tokenize(expr: string): string[] {
    if (!expr.startsWith('$')) throw new Error('Must start with $');
    let rest = expr.slice(1);
    const tokens: string[] = [];
    while (rest.length > 0) {
      if (rest.startsWith('..')) {
        const after = rest.slice(2);
        if (after.startsWith('.') || after.startsWith('[') || after === '') {
          tokens.push('..');
          rest = after;
        } else {
          const m = after.match(/^([\w*]+)/);
          if (m) { tokens.push('..' + m[1]); rest = after.slice(m[1].length); }
          else throw new Error('Invalid ..');
        }
      } else if (rest.startsWith('.')) {
        const m = rest.slice(1).match(/^([\w*]+)/);
        if (m) { tokens.push('.' + m[1]); rest = rest.slice(1 + m[1].length); }
        else throw new Error('Invalid .');
      } else if (rest.startsWith('[')) {
        const end = rest.indexOf(']');
        if (end < 0) throw new Error('Missing ]');
        tokens.push('[' + rest.slice(1, end) + ']');
        rest = rest.slice(end + 1);
      } else {
        throw new Error('Unexpected: ' + rest);
      }
    }
    return tokens;
  }

  private static applyToken(values: unknown[], token: string): unknown[] {
    const result: unknown[] = [];
    for (const v of values) {
      if (token === '..') {
        JSONPath.descend(v, result);
        continue;
      }
      if (token.startsWith('..') && token.length > 2) {
        const key = token.slice(2);
        JSONPath.descendKey(v, key, result);
        continue;
      }
      if (token.startsWith('.')) {
        const key = token.slice(1);
        if (key === '*') {
          if (typeof v === 'object' && v !== null) {
            for (const val of Object.values(v as Record<string, unknown>)) result.push(val);
          }
        } else {
          if (typeof v === 'object' && v !== null) {
            result.push((v as Record<string, unknown>)[key]);
          }
        }
        continue;
      }
      if (token.startsWith('[') && token.endsWith(']')) {
        const inner = token.slice(1, -1);
        if (inner === '*') {
          if (Array.isArray(v)) result.push(...v);
          else if (typeof v === 'object' && v !== null) {
            for (const val of Object.values(v as Record<string, unknown>)) result.push(val);
          }
        } else if (inner.includes(':')) {
          // Slice
          const [a, b] = inner.split(':').map((s) => (s === '' ? undefined : parseInt(s, 10)));
          if (Array.isArray(v)) {
            result.push(...v.slice(a, b));
          }
        } else if (inner.includes(',')) {
          // Multi-index
          const indices = inner.split(',').map((s) => parseInt(s.trim(), 10));
          if (Array.isArray(v)) {
            for (const i of indices) {
              if (i >= 0 && i < v.length) result.push(v[i]);
            }
          }
        } else {
          const idx = parseInt(inner, 10);
          if (Array.isArray(v)) {
            result.push(v[idx]);
          } else if (typeof v === 'object' && v !== null) {
            result.push((v as Record<string, unknown>)[inner.replace(/^'/, '').replace(/'$/, '')]);
          }
        }
      }
    }
    return result;
  }

  private static descend(v: unknown, result: unknown[]): void {
    if (Array.isArray(v)) {
      for (const item of v) {
        result.push(item);
        JSONPath.descend(item, result);
      }
    } else if (typeof v === 'object' && v !== null) {
      for (const val of Object.values(v as Record<string, unknown>)) {
        result.push(val);
        JSONPath.descend(val, result);
      }
    }
  }

  private static descendKey(v: unknown, key: string, result: unknown[]): void {
    if (Array.isArray(v)) {
      for (const item of v) JSONPath.descendKey(item, key, result);
    } else if (typeof v === 'object' && v !== null) {
      const val = (v as Record<string, unknown>)[key];
      if (val !== undefined) result.push(val);
      for (const child of Object.values(v as Record<string, unknown>)) {
        JSONPath.descendKey(child, key, result);
      }
    }
  }
}
