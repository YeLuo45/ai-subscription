/**
 * JSONPatch — JSON Patch (RFC 6902)
 *
 * Operations: add, remove, replace, move, copy, test
 *
 * Format:
 *   [{ "op": "add", "path": "/a/b", "value": 1 }, ...]
 */

export type PatchOp = 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';

export interface Patch {
  op: PatchOp;
  path: string;
  from?: string;
  value?: unknown;
}

export class JSONPatch {
  /**
   * Apply patch to document.
   */
  static apply(doc: unknown, patches: Patch[]): unknown {
    let result = JSON.parse(JSON.stringify(doc));
    for (const patch of patches) {
      result = JSONPatch.applyOne(result, patch);
    }
    return result;
  }

  private static applyOne(doc: unknown, patch: Patch): unknown {
    switch (patch.op) {
      case 'add': return JSONPatch.addOp(doc, patch.path, patch.value);
      case 'remove': return JSONPatch.removeOp(doc, patch.path);
      case 'replace': return JSONPatch.replaceOp(doc, patch.path, patch.value);
      case 'move': return JSONPatch.moveOp(doc, patch.from!, patch.path);
      case 'copy': return JSONPatch.copyOp(doc, patch.from!, patch.path);
      case 'test': JSONPatch.testOp(doc, patch.path, patch.value); return doc;
      default: throw new Error(`Unknown op: ${patch.op}`);
    }
  }

  private static parsePath(path: string): string[] {
    if (path === '') return [];
    if (!path.startsWith('/')) throw new Error('Path must start with /');
    return path.slice(1).split('/').map((p) => p.replace(/~1/g, '/').replace(/~0/g, '~'));
  }

  private static navigate(doc: unknown, parts: string[]): { parent: unknown; key: string | number } {
    let cur: unknown = doc;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      if (Array.isArray(cur)) {
        const idx = parseInt(p, 10);
        cur = cur[idx];
      } else if (typeof cur === 'object' && cur !== null) {
        cur = (cur as Record<string, unknown>)[p];
      } else {
        throw new Error(`Invalid path segment: ${p}`);
      }
    }
    const last = parts[parts.length - 1];
    const key: string | number = Array.isArray(cur) && last !== '-'
      ? parseInt(last, 10)
      : last;
    return { parent: cur, key };
  }

  private static addOp(doc: unknown, path: string, value: unknown): unknown {
    const parts = JSONPatch.parsePath(path);
    if (parts.length === 0) return value;
    const { parent, key } = JSONPatch.navigate(doc, parts);
    if (Array.isArray(parent)) {
      if (key === '-') parent.push(value);
      else parent[key as number] = value;
    } else if (typeof parent === 'object' && parent !== null) {
      (parent as Record<string, unknown>)[key as string] = value;
    }
    return doc;
  }

  private static removeOp(doc: unknown, path: string): unknown {
    const parts = JSONPatch.parsePath(path);
    const { parent, key } = JSONPatch.navigate(doc, parts);
    if (Array.isArray(parent)) {
      parent.splice(key as number, 1);
    } else if (typeof parent === 'object' && parent !== null) {
      delete (parent as Record<string, unknown>)[key as string];
    }
    return doc;
  }

  private static replaceOp(doc: unknown, path: string, value: unknown): unknown {
    const parts = JSONPatch.parsePath(path);
    const { parent, key } = JSONPatch.navigate(doc, parts);
    if (Array.isArray(parent)) {
      parent[key as number] = value;
    } else if (typeof parent === 'object' && parent !== null) {
      (parent as Record<string, unknown>)[key as string] = value;
    }
    return doc;
  }

  private static moveOp(doc: unknown, from: string, to: string): unknown {
    const value = JSONPatch.get(doc, from);
    const doc2 = JSONPatch.removeOp(doc, from);
    return JSONPatch.addOp(doc2, to, value);
  }

  private static copyOp(doc: unknown, from: string, to: string): unknown {
    const value = JSONPatch.get(doc, from);
    return JSONPatch.addOp(doc, to, value);
  }

  private static testOp(doc: unknown, path: string, value: unknown): void {
    const actual = JSONPatch.get(doc, path);
    if (JSON.stringify(actual) !== JSON.stringify(value)) {
      throw new Error(`Test failed at ${path}`);
    }
  }

  /**
   * Get value at path.
   */
  static get(doc: unknown, path: string): unknown {
    const parts = JSONPatch.parsePath(path);
    if (parts.length === 0) return doc;
    let cur: unknown = doc;
    for (const p of parts) {
      if (cur === null || cur === undefined) return undefined;
      cur = (cur as Record<string, unknown>)[p];
    }
    return cur;
  }

  /**
   * Check if patch is valid.
   */
  static isValid(patches: Patch[]): boolean {
    return patches.every((p) => ['add', 'remove', 'replace', 'move', 'copy', 'test'].includes(p.op) && p.path.startsWith('/'));
  }
}
