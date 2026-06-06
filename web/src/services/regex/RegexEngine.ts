/**
 * RegexEngine — high-level regex wrapper
 *
 * Wraps JS RegExp with convenient API.
 * Adds: named groups, count, replace, split.
 */

export interface MatchResult {
  match: string;
  index: number;
  groups: Record<string, string>;
  named?: Record<string, string>;
}

export class RegexEngine {
  private re: RegExp;
  private pattern: string;
  private flags: string;

  constructor(pattern: string, flags: string = '') {
    this.pattern = pattern;
    this.flags = flags;
    this.re = new RegExp(pattern, flags);
  }

  test(input: string): boolean {
    this.re.lastIndex = 0;
    return this.re.test(input);
  }

  exec(input: string): MatchResult | null {
    this.re.lastIndex = 0;
    const m = this.re.exec(input);
    if (!m) return null;
    return this.toResult(m);
  }

  execAll(input: string): MatchResult[] {
    const re = this.flags.includes('g') ? this.re : new RegExp(this.pattern, this.flags + 'g');
    re.lastIndex = 0;
    const out: MatchResult[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(input)) !== null) {
      out.push(this.toResult(m));
      if (m[0] === '') re.lastIndex += 1;
    }
    return out;
  }

  count(input: string): number {
    return this.execAll(input).length;
  }

  replace(input: string, replacement: string | ((match: string, ...groups: (string | undefined)[]) => string)): string {
    if (typeof replacement === 'function') {
      return input.replace(this.re, replacement as (...args: unknown[]) => string);
    }
    return input.replace(this.re, replacement);
  }

  split(input: string, limit?: number): string[] {
    if (limit !== undefined) return input.split(this.re, limit);
    return input.split(this.re);
  }

  private toResult(m: RegExpExecArray): MatchResult {
    const groups: Record<string, string> = {};
    for (let i = 1; i < m.length; i++) {
      groups[i] = m[i] ?? '';
    }
    const named: Record<string, string> = {};
    if (m.groups) {
      for (const [k, v] of Object.entries(m.groups)) {
        if (v !== undefined) named[k] = v;
      }
    }
    return { match: m[0], index: m.index, groups, named };
  }
}
