/**
 * TOMLParser — simplified TOML parser
 *
 * Inspired by: @iarna/toml / toml
 *
 * Supports: key=value, [section], [section.subsection],
 *   basic types: string, int, float, bool, array
 */

function parseValue(raw: string): unknown {
  const v = raw.trim();
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (/^".*"$/.test(v)) return v.slice(1, -1).replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\"/g, '"');
  if (/^-?\d+$/.test(v)) return parseInt(v, 10);
  if (/^-?\d+\.\d+([eE][+-]?\d+)?$/.test(v)) return parseFloat(v);
  if (v.startsWith('[') && v.endsWith(']')) {
    const inner = v.slice(1, -1).trim();
    if (inner.length === 0) return [];
    return inner.split(',').map((s) => parseValue(s.trim()));
  }
  if (v.startsWith('"') && v.endsWith('"')) return v.slice(1, -1);
  return v;
}

export class TOMLParser {
  /**
   * Parse TOML string to nested object.
   */
  static parse(input: string): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const lines = input.split('\n');
    let current: Record<string, unknown> = result;
    const stack: Record<string, unknown>[] = [result];

    for (let raw of lines) {
      const line = raw.trim();
      if (line.length === 0 || line.startsWith('#')) continue;
      if (line.startsWith('[[') && line.endsWith(']]')) {
        const path = line.slice(2, -2).split('.');
        const name = path.pop()!;
        let parent = result;
        for (const p of path) {
          if (!(p in parent) || typeof parent[p] !== 'object') parent[p] = {};
          parent = parent[p] as Record<string, unknown>;
        }
        const arr = (parent[name] as unknown[]) ?? [];
        const newEntry: Record<string, unknown> = {};
        arr.push(newEntry);
        parent[name] = arr;
        current = newEntry;
        stack.push(current);
        continue;
      }
      if (line.startsWith('[') && line.endsWith(']')) {
        const path = line.slice(1, -1).split('.');
        current = result;
        for (const p of path) {
          if (!(p in current) || typeof current[p] !== 'object') {
            current[p] = {};
          }
          current = current[p] as Record<string, unknown>;
        }
        stack.push(current);
        continue;
      }
      const eq = line.indexOf('=');
      if (eq < 0) continue;
      const key = line.slice(0, eq).trim();
      const value = parseValue(line.slice(eq + 1));
      current[key] = value;
    }
    return result;
  }

  /**
   * Get a value by dotted path.
   */
  static get(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let cur: unknown = obj;
    for (const p of parts) {
      if (cur === null || typeof cur !== 'object') return undefined;
      cur = (cur as Record<string, unknown>)[p];
    }
    return cur;
  }

  /**
   * Stringify (simple).
   */
  static stringify(obj: Record<string, unknown>, prefix: string = ''): string {
    const lines: string[] = [];
    const subSections: string[] = [];
    for (const [k, v] of Object.entries(obj)) {
      if (v === null || v === undefined) continue;
      if (Array.isArray(v) || (typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype)) {
        const sectionName = prefix ? `${prefix}.${k}` : k;
        subSections.push(`[${sectionName}]\n${TOMLParser.stringify(v as Record<string, unknown>, sectionName)}`);
      } else {
        lines.push(`${k} = ${TOMLParser.formatValue(v)}`);
      }
    }
    return lines.join('\n') + (subSections.length > 0 ? (lines.length > 0 ? '\n' : '') + subSections.join('\n') : '');
  }

  private static formatValue(v: unknown): string {
    if (typeof v === 'string') return `"${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
    if (typeof v === 'boolean' || typeof v === 'number') return String(v);
    if (Array.isArray(v)) return `[${v.map(TOMLParser.formatValue).join(', ')}]`;
    return String(v);
  }
}
