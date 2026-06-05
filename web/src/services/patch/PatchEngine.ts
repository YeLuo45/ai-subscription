/**
 * PatchEngine — JSON Patch (RFC 6902)
 *
 * Apply JSON Patch operations to a document.
 * Supported operations:
 *   - add: insert at path
 *   - remove: remove at path
 *   - replace: replace at path
 *   - move: move from one path to another
 *   - copy: copy from one path to another
 *   - test: assert value at path equals given value
 *
 * Each operation uses JSON Pointer (RFC 6901) for paths.
 */

export type PatchOp = 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test';

export interface PatchOperation {
  op: PatchOp;
  path: string;
  from?: string;
  value?: unknown;
}

export interface PatchResult {
  success: boolean;
  document: unknown;
  /** Index of failed op if any */
  failedAt?: number;
  /** Error message */
  error?: string;
}

export class PatchEngine {
  /**
   * Apply a sequence of patch operations.
   */
  apply(document: unknown, operations: PatchOperation[]): PatchResult {
    let doc = this.clone(document);
    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];
      try {
        doc = this.applyOp(doc, op);
      } catch (err) {
        return {
          success: false,
          document: doc,
          failedAt: i,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }
    return { success: true, document: doc };
  }

  private applyOp(doc: unknown, op: PatchOperation): unknown {
    switch (op.op) {
      case 'add':
        return this.setByPath(doc, op.path, op.value);
      case 'remove':
        return this.removeByPath(doc, op.path);
      case 'replace':
        return this.setByPath(doc, op.path, op.value);
      case 'move': {
        if (!op.from) throw new Error('move requires from');
        const value = this.getByPath(doc, op.from);
        const next = this.removeByPath(doc, op.from);
        return this.setByPath(next, op.path, value);
      }
      case 'copy': {
        if (!op.from) throw new Error('copy requires from');
        const value = this.clone(this.getByPath(doc, op.from));
        return this.setByPath(doc, op.path, value);
      }
      case 'test': {
        const actual = this.getByPath(doc, op.path);
        if (JSON.stringify(actual) !== JSON.stringify(op.value)) {
          throw new Error(`test failed at ${op.path}`);
        }
        return doc;
      }
      default:
        throw new Error(`unknown op: ${(op as any).op}`);
    }
  }

  private parsePath(path: string): string[] {
    if (path === '' || path === '/') return [];
    if (!path.startsWith('/')) throw new Error('path must start with /');
    return path.slice(1).split('/').map((p) => p.replace(/~1/g, '/').replace(/~0/g, '~'));
  }

  private getByPath(doc: unknown, path: string): unknown {
    const parts = this.parsePath(path);
    let current: any = doc;
    for (const p of parts) {
      if (current === null || current === undefined) throw new Error(`path not found: ${path}`);
      current = current[p];
    }
    return current;
  }

  private setByPath(doc: unknown, path: string, value: unknown): unknown {
    if (path === '' || path === '/') return value;
    const parts = this.parsePath(path);
    const result: any = this.clone(doc);
    let current = result;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      if (current[p] === undefined) {
        const next = parts[i + 1];
        current[p] = /^\d+$/.test(next) ? [] : {};
      }
      current = current[p];
    }
    const last = parts[parts.length - 1];
    if (Array.isArray(current) && last === '-') {
      current.push(value);
    } else if (Array.isArray(current) && /^\d+$/.test(last)) {
      current[parseInt(last, 10)] = value;
    } else {
      current[last] = value;
    }
    return result;
  }

  private removeByPath(doc: unknown, path: string): unknown {
    if (path === '' || path === '/') return undefined;
    const parts = this.parsePath(path);
    const result: any = this.clone(doc);
    let current = result;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      if (current[p] === undefined) throw new Error(`path not found: ${path}`);
      current = current[p];
    }
    const last = parts[parts.length - 1];
    if (Array.isArray(current)) {
      if (!(last in current) && parseInt(last, 10) >= current.length) {
        throw new Error(`path not found: ${path}`);
      }
      current.splice(parseInt(last, 10), 1);
    } else {
      if (!(last in current)) throw new Error(`path not found: ${path}`);
      delete current[last];
    }
    return result;
  }

  private clone(value: unknown): unknown {
    return JSON.parse(JSON.stringify(value));
  }
}
