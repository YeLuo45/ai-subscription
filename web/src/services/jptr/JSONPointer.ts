/**
 * JSONPointer — JSON Pointer (RFC 6901)
 *
 * Format: /foo/bar/0
 * Escape: ~0 for ~, ~1 for /
 */

export class JSONPointer {
  /**
   * Get value at pointer.
   */
  static get(doc: unknown, pointer: string): unknown {
    if (pointer === '') return doc;
    if (!pointer.startsWith('/')) throw new Error('Pointer must start with /');
    const parts = pointer.slice(1).split('/').map((p) => p.replace(/~1/g, '/').replace(/~0/g, '~'));
    let cur: unknown = doc;
    for (const p of parts) {
      if (cur === null || cur === undefined) return undefined;
      if (Array.isArray(cur)) {
        const idx = parseInt(p, 10);
        cur = cur[idx];
      } else if (typeof cur === 'object') {
        cur = (cur as Record<string, unknown>)[p];
      } else {
        return undefined;
      }
    }
    return cur;
  }

  /**
   * Set value at pointer.
   */
  static set(doc: unknown, pointer: string, value: unknown): unknown {
    if (pointer === '') return value;
    const parts = JSONPointer.parse(pointer);
    let cur: unknown = doc;
    for (let i = 0; i < parts.length - 1; i++) {
      cur = (cur as Record<string, unknown>)[parts[i]];
    }
    if (Array.isArray(cur)) {
      const idx = parseInt(parts[parts.length - 1], 10);
      cur[idx] = value;
    } else if (typeof cur === 'object' && cur !== null) {
      (cur as Record<string, unknown>)[parts[parts.length - 1]] = value;
    }
    return doc;
  }

  /**
   * Build pointer from path segments.
   */
  static build(parts: (string | number)[]): string {
    return '/' + parts.map((p) => String(p).replace(/~/g, '~0').replace(/\//g, '~1')).join('/');
  }

  /**
   * Parse pointer to path segments.
   */
  static parse(pointer: string): string[] {
    if (pointer === '') return [];
    if (!pointer.startsWith('/')) throw new Error('Pointer must start with /');
    return pointer.slice(1).split('/').map((p) => p.replace(/~1/g, '/').replace(/~0/g, '~'));
  }

  /**
   * Check if pointer is valid format.
   */
  static isValid(pointer: string): boolean {
    if (pointer === '') return true;
    if (!pointer.startsWith('/')) return false;
    return !pointer.slice(1).split('/').some((p) => p === '..');
  }
}
