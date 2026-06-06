/**
 * AcceptHeader — HTTP Accept/Accept-Language header
 *
 * Inspired by: accepts npm
 *
 * Parse accept list with quality values (q-factor).
 * - Sort by priority
 * - Match against available types
 */

export interface AcceptEntry {
  type: string;
  q: number;
  params: Record<string, string>;
}

export class AcceptHeader {
  private entries: AcceptEntry[];

  constructor(header: string = '') {
    this.entries = this.parseHeader(header);
  }

  private parseHeader(header: string): AcceptEntry[] {
    if (!header || header === '*') return [{ type: '*/*', q: 1, params: {} }];
    const result: AcceptEntry[] = [];
    for (const part of header.split(',')) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const [main, ...params] = trimmed.split(';').map((s) => s.trim());
      const entry: AcceptEntry = { type: main, q: 1, params: {} };
      for (const p of params) {
        if (p.startsWith('q=')) {
          const v = parseFloat(p.slice(2));
          if (!isNaN(v)) entry.q = v;
        } else {
          const [k, v] = p.split('=');
          if (k) entry.params[k] = v ?? '';
        }
      }
      result.push(entry);
    }
    result.sort((a, b) => b.q - a.q);
    return result;
  }

  /**
   * Get sorted entries.
   */
  getEntries(): AcceptEntry[] {
    return [...this.entries];
  }

  /**
   * Find best match.
   */
  bestMatch(available: string[]): string | null {
    for (const entry of this.entries) {
      for (const a of available) {
        if (this.matches(a, entry.type)) {
          return a;
        }
      }
    }
    return null;
  }

  /**
   * Sort available by preference.
   */
  sort(available: string[]): string[] {
    const scored: Array<{ type: string; score: number; idx: number }> = [];
    available.forEach((a, idx) => {
      let bestScore = -1;
      for (let i = 0; i < this.entries.length; i++) {
        const entry = this.entries[i];
        if (this.matches(a, entry.type)) {
          const score = entry.q * 1000 - i;
          if (score > bestScore) bestScore = score;
        }
      }
      scored.push({ type: a, score: bestScore, idx });
    });
    scored.sort((a, b) => b.score - a.score || a.idx - b.idx);
    return scored.map((s) => s.type);
  }

  /**
   * Does mime match a type pattern?
   */
  private matches(mime: string, pattern: string): boolean {
    if (pattern === '*/*' || pattern === '*') return true;
    if (pattern === mime) return true;
    if (pattern.endsWith('/*')) {
      const prefix = pattern.slice(0, -2);
      return mime.startsWith(prefix + '/');
    }
    return false;
  }

  /**
   * Static: parse header.
   */
  static parse(header: string): AcceptHeader {
    return new AcceptHeader(header);
  }
}
