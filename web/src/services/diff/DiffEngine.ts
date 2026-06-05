/**
 * DiffEngine — text and object diff
 *
 * Inspired by: diff-match-patch, jsondiffpatch
 *
 * Text diff: line-based diff between two strings
 * Object diff: deep diff between two JSON objects
 *
 * Returns operations to transform `before` into `after`.
 */

export type DiffOp = 'equal' | 'insert' | 'delete' | 'replace';
export type TextChangeType = 'equal' | 'insert' | 'delete';

export interface TextChange {
  type: TextChangeType;
  /** Line(s) affected (1-indexed) */
  line: number;
  value: string;
}

export interface ObjectChange {
  /** JSON Pointer path to the change */
  path: string;
  op: 'add' | 'remove' | 'replace';
  before?: unknown;
  after?: unknown;
}

export class DiffEngine {
  /**
   * Diff two strings line-by-line using LCS.
   */
  diffText(before: string, after: string): TextChange[] {
    const a = before.split('\n');
    const b = after.split('\n');
    // Build LCS table
    const m = a.length;
    const n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
        else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
    // Backtrack
    const changes: TextChange[] = [];
    let i = m, j = n;
    while (i > 0 && j > 0) {
      if (a[i - 1] === b[j - 1]) {
        changes.unshift({ type: 'equal', line: i, value: a[i - 1] });
        i -= 1; j -= 1;
      } else if (dp[i - 1][j] >= dp[i][j - 1]) {
        changes.unshift({ type: 'delete', line: i, value: a[i - 1] });
        i -= 1;
      } else {
        changes.unshift({ type: 'insert', line: j, value: b[j - 1] });
        j -= 1;
      }
    }
    while (i > 0) {
      changes.unshift({ type: 'delete', line: i, value: a[i - 1] });
      i -= 1;
    }
    while (j > 0) {
      changes.unshift({ type: 'insert', line: j, value: b[j - 1] });
      j -= 1;
    }
    return changes;
  }

  /**
   * Generate a unified-style diff hunk.
   */
  unifiedDiff(before: string, after: string, contextLines: number = 3): string {
    const changes = this.diffText(before, after);
    const lines: string[] = [];
    let oldLine = 1, newLine = 1;
    let i = 0;
    while (i < changes.length) {
      const c = changes[i];
      if (c.type === 'equal') {
        oldLine += 1; newLine += 1; i += 1;
      } else {
        lines.push(`- old:${oldLine} ${c.value}`);
        oldLine += 1; i += 1;
      }
    }
    return lines.join('\n');
  }

  /**
   * Compute a simple similarity ratio (0-1) using LCS.
   */
  similarity(before: string, after: string): number {
    const a = before;
    const b = after;
    if (a === b) return 1;
    if (!a || !b) return 0;
    const m = a.length, n = b.length;
    if (m > 500 || n > 500) {
      // Approximate via prefix/suffix match for long strings
      let prefix = 0;
      while (prefix < Math.min(m, n) && a[prefix] === b[prefix]) prefix += 1;
      return (2 * prefix) / (m + n);
    }
    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
        else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
    return (2 * dp[m][n]) / (m + n);
  }

  /**
   * Deep diff two objects.
   */
  diffObject(before: unknown, after: unknown, path: string = ''): ObjectChange[] {
    const changes: ObjectChange[] = [];
    if (JSON.stringify(before) === JSON.stringify(after)) return changes;
    if (before === undefined) {
      changes.push({ path: path || '/', op: 'add', after });
      return changes;
    }
    if (after === undefined) {
      changes.push({ path: path || '/', op: 'remove', before });
      return changes;
    }
    if (typeof before !== typeof after || Array.isArray(before) !== Array.isArray(after)) {
      changes.push({ path: path || '/', op: 'replace', before, after });
      return changes;
    }
    if (typeof before === 'object' && before !== null && after !== null) {
      const bObj = before as Record<string, unknown>;
      const aObj = after as Record<string, unknown>;
      const allKeys = new Set([...Object.keys(bObj), ...Object.keys(aObj)]);
      for (const key of allKeys) {
        const childPath = `${path}/${key}`;
        if (!(key in aObj)) {
          changes.push({ path: childPath, op: 'remove', before: bObj[key] });
        } else if (!(key in bObj)) {
          changes.push({ path: childPath, op: 'add', after: aObj[key] });
        } else {
          changes.push(...this.diffObject(bObj[key], aObj[key], childPath));
        }
      }
    } else {
      changes.push({ path: path || '/', op: 'replace', before, after });
    }
    return changes;
  }

  /**
   * Count change statistics.
   */
  stats(changes: ObjectChange[]): { added: number; removed: number; replaced: number } {
    let added = 0, removed = 0, replaced = 0;
    for (const c of changes) {
      if (c.op === 'add') added += 1;
      else if (c.op === 'remove') removed += 1;
      else replaced += 1;
    }
    return { added, removed, replaced };
  }
}
