/**
 * HCLParser — HashiCorp Configuration Language subset
 *
 * Inspired by: hcl2-parser
 *
 * Supports subset:
 *   - key = value
 *   - blocks: name { ... } and name "label" { ... }
 *   - strings (quoted), numbers, booleans, null
 *   - lists [a, b, c]
 *   - nested blocks
 *   - comments (# and //)
 */

export type HCLValue = string | number | boolean | null | HCLValue[] | Record<string, HCLValue>;

export interface HCLBlock {
  type: string;
  labels: string[];
  body: Record<string, HCLValue>;
}

export class HCLParser {
  parse(input: string): { body: Record<string, HCLValue>; blocks: HCLBlock[] } {
    const body: Record<string, HCLValue> = {};
    const blocks: HCLBlock[] = [];
    const lines = input.split('\n');
    let i = 0;
    while (i < lines.length) {
      const line = this.stripComment(lines[i]).trim();
      if (line === '') { i += 1; continue; }
      if (/^[a-zA-Z][\w-]*(\s+"[^"]*")*\s*\{/.test(line)) {
        const { block, next } = this.parseBlock(lines, i);
        blocks.push(block);
        i = next;
        continue;
      }
      const eq = line.indexOf('=');
      if (eq > 0) {
        const key = line.slice(0, eq).trim();
        const valueStr = line.slice(eq + 1).trim();
        body[key] = this.parseValue(valueStr);
        i += 1;
        continue;
      }
      i += 1;
    }
    return { body, blocks };
  }

  private parseBlock(lines: string[], start: number): { block: HCLBlock; next: number } {
    const rawLine = this.stripComment(lines[start]).trim();
    const open = rawLine.indexOf('{');
    const header = rawLine.slice(0, open).trim();
    const parts = this.splitTopLevel(header);
    const type = parts[0];
    const labels = parts.slice(1).map((p) => p.replace(/^"|"$/g, ''));
    const body: Record<string, HCLValue> = {};
    // Process content after { on the same line
    let inlineContent = rawLine.slice(open + 1).trim();
    let i = start + 1;
    let depth = 1;
    const processLine = (ln: string) => {
      const eq = ln.indexOf('=');
      if (eq > 0) {
        const key = ln.slice(0, eq).trim();
        const valueStr = ln.slice(eq + 1).trim();
        body[key] = this.parseValue(valueStr);
      }
    };
    // Check if } is on same line
    const closeSameLine = inlineContent.lastIndexOf('}');
    if (closeSameLine >= 0) {
      // content before }
      const before = inlineContent.slice(0, closeSameLine).trim();
      if (before) processLine(before);
      // compute next i (no further lines to process)
      return { block: { type, labels, body }, next: i };
    }
    // No closing brace on this line
    if (inlineContent) processLine(inlineContent);
    while (i < lines.length && depth > 0) {
      const ln = this.stripComment(lines[i]).trim();
      if (ln === '') { i += 1; continue; }
      if (ln === '{') { depth += 1; i += 1; continue; }
      if (ln === '}') { depth -= 1; i += 1; continue; }
      if (depth === 1) {
        processLine(ln);
        i += 1;
      } else {
        i += 1;
      }
    }
    return { block: { type, labels, body }, next: i };
  }

  private splitTopLevel(s: string): string[] {
    const out: string[] = [];
    let buf = '';
    let inStr = false;
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (c === '"') inStr = !inStr;
      if (!inStr && /\s/.test(c)) {
        if (buf) { out.push(buf); buf = ''; }
      } else {
        buf += c;
      }
    }
    if (buf) out.push(buf);
    return out;
  }

  private parseValue(v: string): HCLValue {
    if (v === 'true') return true;
    if (v === 'false') return false;
    if (v === 'null') return null;
    if (/^-?\d+$/.test(v)) return parseInt(v, 10);
    if (/^-?\d+\.\d+$/.test(v)) return parseFloat(v);
    if (v.startsWith('"') && v.endsWith('"')) {
      return v.slice(1, -1).replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\"/g, '"');
    }
    if (v.startsWith('[') && v.endsWith(']')) {
      const inner = v.slice(1, -1).trim();
      if (inner === '') return [];
      return inner.split(',').map((s) => this.parseValue(s.trim()));
    }
    return v;
  }

  private stripComment(line: string): string {
    let inStr = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') inStr = !inStr;
      if (!inStr && (c === '#' || (c === '/' && line[i + 1] === '/'))) {
        return line.slice(0, i);
      }
    }
    return line;
  }
}
