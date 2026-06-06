/**
 * URLSearchParamsParser — query string parser
 *
 * Inspired by: URLSearchParams / qs npm
 *
 * Parse and stringify query strings with multi-value support.
 */

export class URLSearchParamsParser {
  private params: Map<string, string[]>;

  constructor(init?: string | Record<string, string | string[]>) {
    this.params = new Map();
    if (typeof init === 'string') {
      this.parseString(init);
    } else if (init) {
      for (const [k, v] of Object.entries(init)) {
        if (Array.isArray(v)) {
          for (const item of v) this.append(k, item);
        } else {
          this.append(k, v);
        }
      }
    }
  }

  private parseString(s: string): void {
    const trimmed = s.startsWith('?') ? s.slice(1) : s;
    if (trimmed.length === 0) return;
    for (const pair of trimmed.split('&')) {
      if (!pair) continue;
      const eq = pair.indexOf('=');
      if (eq < 0) {
        this.append(decodeURIComponent(pair), '');
      } else {
        const k = decodeURIComponent(pair.slice(0, eq).replace(/\+/g, ' '));
        const v = decodeURIComponent(pair.slice(eq + 1).replace(/\+/g, ' '));
        this.append(k, v);
      }
    }
  }

  /**
   * Append a value for key.
   */
  append(key: string, value: string): void {
    const k = encodeKey(key);
    if (!this.params.has(k)) this.params.set(k, []);
    this.params.get(k)!.push(value);
  }

  /**
   * Set a value (overwrites all).
   */
  set(key: string, value: string): void {
    this.params.set(encodeKey(key), [value]);
  }

  /**
   * Delete a key.
   */
  delete(key: string): void {
    this.params.delete(encodeKey(key));
  }

  /**
   * Get all values for key.
   */
  getAll(key: string): string[] {
    return [...(this.params.get(encodeKey(key)) ?? [])];
  }

  /**
   * Get first value for key.
   */
  get(key: string): string | null {
    const v = this.params.get(encodeKey(key));
    return v && v.length > 0 ? v[0] : null;
  }

  /**
   * Check if key exists.
   */
  has(key: string): boolean {
    return this.params.has(encodeKey(key));
  }

  /**
   * Iterate over all [key, value] pairs.
   */
  entries(): Array<[string, string]> {
    const result: Array<[string, string]> = [];
    for (const [k, vs] of this.params) {
      for (const v of vs) result.push([k, v]);
    }
    return result;
  }

  /**
   * Iterate over keys.
   */
  keys(): string[] {
    return Array.from(this.params.keys());
  }

  /**
   * Iterate over all values.
   */
  values(): string[] {
    const result: string[] = [];
    for (const vs of this.params.values()) result.push(...vs);
    return result;
  }

  /**
   * Get all keys (including duplicates).
   */
  allKeys(): string[] {
    const result: string[] = [];
    for (const [k, vs] of this.params) {
      for (let i = 0; i < vs.length; i++) result.push(k);
    }
    return result;
  }

  /**
   * Number of key-value pairs.
   */
  get size(): number {
    let n = 0;
    for (const vs of this.params.values()) n += vs.length;
    return n;
  }

  /**
   * Stringify back to query string.
   */
  toString(): string {
    const parts: string[] = [];
    for (const [k, vs] of this.params) {
      for (const v of vs) {
        parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
      }
    }
    return parts.join('&');
  }

  /**
   * Convert to plain object (last value wins).
   */
  toObject(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [k, vs] of this.params) out[k] = vs[vs.length - 1];
    return out;
  }

  /**
   * Convert to array of objects (one per value).
   */
  toEntries(): Array<[string, string]> {
    return this.entries();
  }

  /**
   * Sort by key.
   */
  sort(): this {
    const sorted = new Map(Array.from(this.params.entries()).sort(([a], [b]) => a.localeCompare(b)));
    this.params = sorted;
    return this;
  }
}

function encodeKey(k: string): string {
  return k;
}
