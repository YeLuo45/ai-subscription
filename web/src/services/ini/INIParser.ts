/**
 * INIParser — INI file format parser
 *
 * Inspired by: ini / js-ini
 *
 * Format:
 *   ; or # comment
 *   [section]
 *   key = value
 *   [parent.child]
 *   key = value
 */

export class INIParser {
  /**
   * Parse INI string to nested object.
   */
  static parse(input: string): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const lines = input.split(/\r?\n/);
    let current: Record<string, unknown> = result;
    for (let raw of lines) {
      const line = raw.trim();
      if (line.length === 0) continue;
      if (line.startsWith(';') || line.startsWith('#')) continue;
      if (line.startsWith('[') && line.endsWith(']')) {
        const path = line.slice(1, -1).split('.');
        current = result;
        for (const p of path) {
          if (!(p in current) || typeof current[p] !== 'object' || Array.isArray(current[p])) {
            current[p] = {};
          }
          current = current[p] as Record<string, unknown>;
        }
        continue;
      }
      const eq = line.indexOf('=');
      if (eq < 0) continue;
      const key = line.slice(0, eq).trim();
      const value = line.slice(eq + 1).trim();
      current[key] = this.parseValue(value);
    }
    return result;
  }

  /**
   * Stringify object to INI format.
   */
  static stringify(obj: Record<string, unknown>): string {
    const lines: string[] = [];
    for (const [k, v] of Object.entries(obj)) {
      if (v === null || v === undefined) continue;
      if (typeof v === 'object' && !Array.isArray(v)) {
        lines.push(`[${k}]`);
        for (const [k2, v2] of Object.entries(v as Record<string, unknown>)) {
          lines.push(`${k2} = ${this.formatValue(v2)}`);
        }
      } else {
        lines.push(`${k} = ${this.formatValue(v)}`);
      }
    }
    return lines.join('\n');
  }

  /**
   * Get value by dotted path.
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
   * Set value at dotted path.
   */
  static set(obj: Record<string, unknown>, path: string, value: unknown): void {
    const parts = path.split('.');
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!(parts[i] in cur) || typeof cur[parts[i]] !== 'object') {
        cur[parts[i]] = {};
      }
      cur = cur[parts[i]] as Record<string, unknown>;
    }
    cur[parts[parts.length - 1]] = value;
  }

  private static parseValue(v: string): unknown {
    if (v === 'true') return true;
    if (v === 'false') return false;
    if (v === 'null') return null;
    if (/^-?\d+$/.test(v)) return parseInt(v, 10);
    if (/^-?\d+\.\d+$/.test(v)) return parseFloat(v);
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      return v.slice(1, -1);
    }
    return v;
  }

  private static formatValue(v: unknown): string {
    if (typeof v === 'string' && (v.includes(' ') || v.includes('=') || v.includes(';'))) {
      return `"${v.replace(/"/g, '\\"')}"`;
    }
    return String(v);
  }
}
