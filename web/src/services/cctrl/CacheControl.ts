/**
 * CacheControl — HTTP Cache-Control header
 *
 * Inspired by: cache-control / http-cache-semantics
 *
 * Parse and serialize cache directives.
 */

export interface CacheDirectives {
  maxAge?: number;
  sMaxAge?: number;
  noCache?: boolean;
  noStore?: boolean;
  noTransform?: boolean;
  mustRevalidate?: boolean;
  proxyRevalidate?: boolean;
  public?: boolean;
  private?: boolean;
  immutable?: boolean;
  staleWhileRevalidate?: number;
  staleIfError?: number;
  minFresh?: number;
}

export class CacheControl {
  private directives: CacheDirectives;

  constructor(directives: CacheDirectives = {}) {
    this.directives = { ...directives };
  }

  /**
   * Parse a Cache-Control header value.
   */
  static parse(header: string): CacheControl {
    const dirs: CacheDirectives = {};
    for (const part of header.split(',')) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const eq = trimmed.indexOf('=');
      let key: string, value: string;
      if (eq < 0) {
        key = trimmed;
        value = '';
      } else {
        key = trimmed.slice(0, eq).trim();
        value = trimmed.slice(eq + 1).trim();
      }
      switch (key.toLowerCase()) {
        case 'max-age': dirs.maxAge = parseInt(value, 10); break;
        case 's-maxage': dirs.sMaxAge = parseInt(value, 10); break;
        case 'no-cache': dirs.noCache = true; break;
        case 'no-store': dirs.noStore = true; break;
        case 'no-transform': dirs.noTransform = true; break;
        case 'must-revalidate': dirs.mustRevalidate = true; break;
        case 'proxy-revalidate': dirs.proxyRevalidate = true; break;
        case 'public': dirs.public = true; break;
        case 'private': dirs.private = true; break;
        case 'immutable': dirs.immutable = true; break;
        case 'stale-while-revalidate': dirs.staleWhileRevalidate = parseInt(value, 10); break;
        case 'stale-if-error': dirs.staleIfError = parseInt(value, 10); break;
        case 'min-fresh': dirs.minFresh = parseInt(value, 10); break;
      }
    }
    return new CacheControl(dirs);
  }

  /**
   * Get a directive.
   */
  get<K extends keyof CacheDirectives>(key: K): CacheDirectives[K] {
    return this.directives[key];
  }

  /**
   * Set a directive.
   */
  set<K extends keyof CacheDirectives>(key: K, value: CacheDirectives[K]): this {
    this.directives[key] = value;
    return this;
  }

  /**
   * Get all directives.
   */
  toObject(): CacheDirectives {
    return { ...this.directives };
  }

  /**
   * Stringify back to header.
   */
  toString(): string {
    const parts: string[] = [];
    const d = this.directives;
    if (d.maxAge !== undefined) parts.push(`max-age=${d.maxAge}`);
    if (d.sMaxAge !== undefined) parts.push(`s-maxage=${d.sMaxAge}`);
    if (d.noCache) parts.push('no-cache');
    if (d.noStore) parts.push('no-store');
    if (d.noTransform) parts.push('no-transform');
    if (d.mustRevalidate) parts.push('must-revalidate');
    if (d.proxyRevalidate) parts.push('proxy-revalidate');
    if (d.public) parts.push('public');
    if (d.private) parts.push('private');
    if (d.immutable) parts.push('immutable');
    if (d.staleWhileRevalidate !== undefined) parts.push(`stale-while-revalidate=${d.staleWhileRevalidate}`);
    if (d.staleIfError !== undefined) parts.push(`stale-if-error=${d.staleIfError}`);
    if (d.minFresh !== undefined) parts.push(`min-fresh=${d.minFresh}`);
    return parts.join(', ');
  }

  /**
   * Is cacheable?
   */
  isCacheable(): boolean {
    return !this.directives.noStore;
  }

  /**
   * Is public cacheable?
   */
  isPublicCacheable(): boolean {
    return !this.directives.noStore && !this.directives.private;
  }

  /**
   * Is revalidation required?
   */
  requiresRevalidation(): boolean {
    return !!this.directives.noCache || !!this.directives.mustRevalidate;
  }
}
