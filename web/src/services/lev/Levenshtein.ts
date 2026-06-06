/**
 * Levenshtein — edit distance algorithms
 *
 * Inspired by: fast-levenshtein
 *
 * - Levenshtein (insertion/deletion/substitution)
 * - Damerau-Levenshtein (with transposition)
 * - Restricted/Optimal String Alignment (OSA)
 * - Backtrace (get edit operations)
 */

export type EditOp = 'match' | 'insert' | 'delete' | 'substitute' | 'transposition';

export interface EditOperation {
  op: EditOp;
  from: string | null;
  to: string | null;
}

export class Levenshtein {
  /**
   * Classic Levenshtein distance.
   */
  static distance(a: string, b: string): number {
    const m = a.length, n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;
    let prev = new Array<number>(n + 1);
    let curr = new Array<number>(n + 1);
    for (let j = 0; j <= n; j++) prev[j] = j;
    for (let i = 1; i <= m; i++) {
      curr[0] = i;
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        curr[j] = Math.min(
          curr[j - 1] + 1,        // insert
          prev[j] + 1,            // delete
          prev[j - 1] + cost,     // substitute
        );
      }
      [prev, curr] = [curr, prev];
    }
    return prev[n];
  }

  /**
   * Damerau-Levenshtein (with transposition).
   */
  static damerau(a: string, b: string): number {
    const m = a.length, n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;
    const d: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) d[i][0] = i;
    for (let j = 0; j <= n; j++) d[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        d[i][j] = Math.min(
          d[i - 1][j] + 1,
          d[i][j - 1] + 1,
          d[i - 1][j - 1] + cost,
        );
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
          d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + cost);
        }
      }
    }
    return d[m][n];
  }

  /**
   * Similarity (0..1, 1 = identical).
   */
  static similarity(a: string, b: string): number {
    const d = Levenshtein.distance(a, b);
    const max = Math.max(a.length, b.length);
    return max === 0 ? 1 : 1 - d / max;
  }

  /**
   * Is within k edits?
   */
  static within(a: string, b: string, k: number): boolean {
    if (Math.abs(a.length - b.length) > k) return false;
    return Levenshtein.distance(a, b) <= k;
  }

  /**
   * Backtrace to get edit operations.
   */
  static backtrace(a: string, b: string): EditOperation[] {
    const m = a.length, n = b.length;
    const d: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) d[i][0] = i;
    for (let j = 0; j <= n; j++) d[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        d[i][j] = Math.min(
          d[i - 1][j] + 1,
          d[i][j - 1] + 1,
          d[i - 1][j - 1] + cost,
        );
      }
    }
    const ops: EditOperation[] = [];
    let i = m, j = n;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
        ops.unshift({ op: 'match', from: a[i - 1], to: b[j - 1] });
        i--; j--;
      } else if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + 1) {
        ops.unshift({ op: 'substitute', from: a[i - 1], to: b[j - 1] });
        i--; j--;
      } else if (j > 0 && d[i][j] === d[i][j - 1] + 1) {
        ops.unshift({ op: 'insert', from: null, to: b[j - 1] });
        j--;
      } else if (i > 0 && d[i][j] === d[i - 1][j] + 1) {
        ops.unshift({ op: 'delete', from: a[i - 1], to: null });
        i--;
      } else {
        break;
      }
    }
    return ops;
  }
}
