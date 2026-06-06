/**
 * TOMLParser — minimal TOML 1.0 parser
 *
 * Inspired by: @iarna/toml, smol-toml
 *
 * Supports subset:
 *   - key = value
 *   - sections [name]
 *   - strings (basic "..." and '...')
 *   - numbers (int, float)
 *   - booleans
 *   - arrays [a, b, c]
 *   - comments (#)
 */

export class TOMLParser {
  parse(input: string): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    let currentSection = result;
    const lines = input.split('\n');
    for (let rawLine of lines) {
      // Strip comments
      const hashIdx = this.findCommentStart(rawLine);
      if (hashIdx >= 0) rawLine = rawLine.slice(0, hashIdx);
      const line = rawLine.trim();
      if (line === '') continue;
      if (line.startsWith('[')) {
        const end = line.indexOf(']');
        if (end < 0) throw new Error('Invalid section header');
        const sectionName = line.slice(1, end).trim();
        if (!result[sectionName]) result[sectionName] = {};
        currentSection = result[sectionName] as Record<string, unknown>;
        continue;
      }
      const eq = line.indexOf('=');
      if (eq < 0) continue;
      const key = line.slice(0, eq).trim();
      const valueStr = line.slice(eq + 1).trim();
      currentSection[key] = this.parseValue(valueStr);
    }
    return result;
  }

  private findCommentStart(line: string): number {
    let inStr: string | null = null;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inStr) {
        if (c === inStr) inStr = null;
      } else if (c === '"' || c === "'") {
        inStr = c;
      } else if (c === '#') {
        return i;
      }
    }
    return -1;
  }

  private parseValue(v: string): unknown {
    if (v === 'true') return true;
    if (v === 'false') return false;
    if (/^-?\d+$/.test(v)) return parseInt(v, 10);
    if (/^-?\d+\.\d+$/.test(v)) return parseFloat(v);
    if (v.startsWith('"') && v.endsWith('"')) {
      return v.slice(1, -1).replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\"/g, '"');
    }
    if (v.startsWith("'") && v.endsWith("'")) {
      return v.slice(1, -1);
    }
    if (v.startsWith('[') && v.endsWith(']')) {
      const inner = v.slice(1, -1).trim();
      if (inner === '') return [];
      return inner.split(',').map((s) => this.parseValue(s.trim()));
    }
    return v;
  }
}
