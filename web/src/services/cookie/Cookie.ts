/**
 * Cookie — HTTP cookie parser/serializer
 *
 * Inspired by: cookie npm
 */

export interface ParsedCookie {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: Date;
  maxAge?: number;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

export class Cookie {
  private items: Map<string, string> = new Map();

  /**
   * Parse a Cookie header value.
   */
  static parse(header: string): Cookie {
    const c = new Cookie();
    for (const part of header.split(';')) {
      const eq = part.indexOf('=');
      if (eq < 0) continue;
      const name = part.slice(0, eq).trim();
      const value = part.slice(eq + 1).trim();
      if (name) c.items.set(name, decodeURIComponent(value));
    }
    return c;
  }

  /**
   * Build Set-Cookie header value.
   */
  static serialize(name: string, value: string, opts: Omit<ParsedCookie, 'name' | 'value'> = {}): string {
    let s = `${name}=${encodeURIComponent(value)}`;
    if (opts.domain) s += `; Domain=${opts.domain}`;
    if (opts.path) s += `; Path=${opts.path}`;
    if (opts.expires) s += `; Expires=${opts.expires.toUTCString()}`;
    if (opts.maxAge !== undefined) s += `; Max-Age=${opts.maxAge}`;
    if (opts.secure) s += '; Secure';
    if (opts.httpOnly) s += '; HttpOnly';
    if (opts.sameSite) s += `; SameSite=${opts.sameSite}`;
    return s;
  }

  /**
   * Get value by name.
   */
  get(name: string): string | undefined {
    return this.items.get(name);
  }

  /**
   * Set value.
   */
  set(name: string, value: string): this {
    this.items.set(name, value);
    return this;
  }

  /**
   * Check if name exists.
   */
  has(name: string): boolean {
    return this.items.has(name);
  }

  /**
   * Delete by name.
   */
  delete(name: string): boolean {
    return this.items.delete(name);
  }

  /**
   * Get all names.
   */
  keys(): string[] {
    return Array.from(this.items.keys());
  }

  /**
   * Get all values.
   */
  values(): string[] {
    return Array.from(this.items.values());
  }

  /**
   * Number of cookies.
   */
  get size(): number {
    return this.items.size;
  }

  /**
   * Convert to object.
   */
  toObject(): Record<string, string> {
    return Object.fromEntries(this.items);
  }

  /**
   * Stringify back to header.
   */
  toString(): string {
    return Array.from(this.items.entries())
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('; ');
  }

  /**
   * Iterate [name, value].
   */
  entries(): Array<[string, string]> {
    return Array.from(this.items.entries());
  }
}
