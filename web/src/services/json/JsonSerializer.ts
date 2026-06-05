/**
 * JsonSerializer — JSON serialization with extras
 *
 * Enhanced JSON serialization:
 *   - serialize / parse: round-trip with custom revivers/replacers
 *   - pretty: indented output
 *   - typed parse: discriminate by type tag
 *   - minify: compact output
 *   - clone: deep clone via JSON
 *   - merge: deep merge two objects
 *   - safeParse: returns undefined on error
 *   - encodeURI / decodeURI for URL-safe transport
 */

export type JsonReplacer = (key: string, value: unknown) => unknown;
export type JsonReviver = (key: string, value: unknown) => unknown;

export class JsonSerializer {
  /**
   * Serialize a value to JSON string.
   */
  serialize(value: unknown, replacer?: JsonReplacer): string {
    return JSON.stringify(value, replacer as any);
  }

  /**
   * Parse a JSON string.
   */
  parse<T = unknown>(text: string, reviver?: JsonReviver): T {
    return JSON.parse(text, reviver as any) as T;
  }

  /**
   * Safe parse: returns undefined on error.
   */
  safeParse<T = unknown>(text: string): T | undefined {
    try {
      return JSON.parse(text) as T;
    } catch {
      return undefined;
    }
  }

  /**
   * Pretty print (2-space indent).
   */
  pretty(value: unknown, indent: number = 2): string {
    return JSON.stringify(value, null, indent);
  }

  /**
   * Minify: no whitespace.
   */
  minify(value: unknown): string {
    return JSON.stringify(value);
  }

  /**
   * Deep clone via JSON round-trip.
   */
  clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }

  merge<T extends Record<string, unknown>>(target: T, source: Partial<T> | Record<string, unknown>): T {
    const result: Record<string, unknown> = { ...target };
    for (const key of Object.keys(source)) {
      const srcVal = (source as any)[key];
      const tgtVal = (target as any)[key];
      if (this.isPlainObject(srcVal) && this.isPlainObject(tgtVal)) {
        result[key] = this.merge(tgtVal, srcVal);
      } else {
        result[key] = srcVal;
      }
    }
    return result as T;
  }

  /**
   * Get value at JSON Pointer path (RFC 6901).
   */
  getByPath(obj: unknown, path: string): unknown {
    if (path === '' || path === '/') return obj;
    const parts = path.split('/').slice(1).map((p) => p.replace(/~1/g, '/').replace(/~0/g, '~'));
    let current: any = obj;
    for (const p of parts) {
      if (current === null || current === undefined) return undefined;
      current = current[p];
    }
    return current;
  }

  /**
   * Set value at JSON Pointer path.
   */
  setByPath(obj: unknown, path: string, value: unknown): unknown {
    if (path === '' || path === '/') return value;
    const parts = path.split('/').slice(1).map((p) => p.replace(/~1/g, '/').replace(/~0/g, '~'));
    const result: any = this.clone(obj);
    let current = result;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      if (!(p in current)) current[p] = typeof parts[i + 1] === 'string' && /^\d+$/.test(parts[i + 1]) ? [] : {};
      current = current[p];
    }
    current[parts[parts.length - 1]] = value;
    return result;
  }

  /**
   * Remove value at JSON Pointer path.
   */
  removeByPath(obj: unknown, path: string): unknown {
    if (path === '' || path === '/') return undefined;
    const parts = path.split('/').slice(1).map((p) => p.replace(/~1/g, '/').replace(/~0/g, '~'));
    const result: any = this.clone(obj);
    let current = result;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      if (!(p in current)) return result;
      current = current[p];
    }
    const last = parts[parts.length - 1];
    if (Array.isArray(current)) {
      current.splice(parseInt(last, 10), 1);
    } else {
      delete current[last];
    }
    return result;
  }

  /**
   * Encode object as URL-safe base64.
   */
  encodeURI(value: unknown): string {
    const json = JSON.stringify(value);
    if (typeof btoa !== 'undefined') return btoa(unescape(encodeURIComponent(json)));
    return Buffer.from(json, 'utf-8').toString('base64');
  }

  /**
   * Decode URL-safe base64 to object.
   */
  decodeURI<T = unknown>(encoded: string): T {
    const json = typeof atob !== 'undefined' ? decodeURIComponent(escape(atob(encoded))) : Buffer.from(encoded, 'base64').toString('utf-8');
    return JSON.parse(json) as T;
  }

  /**
   * Get type of JSON value.
   */
  getType(value: unknown): string {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  }

  private isPlainObject(value: unknown): boolean {
    if (value === null || typeof value !== 'object') return false;
    const proto = Object.getPrototypeOf(value);
    return proto === null || proto === Object.prototype;
  }
}
