/**
 * DiffMatchPatch — character-level diff (LCS-based)
 *
 * Inspired by: diff-match-patch (Google)
 *
 * Operations: equal, insert, delete
 */

export type DiffOp = 'equal' | 'insert' | 'delete';

export interface Diff {
  op: DiffOp;
  text: string;
}

export class DiffMatchPatch {
  /**
   * Compute character-level diff.
   */
  static diff(a: string, b: string): Diff[] {
    if (a === b) return a.length > 0 ? [{ op: 'equal', text: a }] : [];
    if (a.length === 0) return [{ op: 'insert', text: b }];
    if (b.length === 0) return [{ op: 'delete', text: a }];

    const m = a.length, n = b.length;
    // LCS DP table
    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
        else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
    // Backtrack
    const result: Diff[] = [];
    let i = m, j = n;
    while (i > 0 && j > 0) {
      if (a[i - 1] === b[j - 1]) {
        result.push({ op: 'equal', text: a[i - 1] });
        i--; j--;
      } else if (dp[i - 1][j] >= dp[i][j - 1]) {
        result.push({ op: 'delete', text: a[i - 1] });
        i--;
      } else {
        result.push({ op: 'insert', text: b[j - 1] });
        j--;
      }
    }
    while (i > 0) { result.push({ op: 'delete', text: a[i - 1] }); i--; }
    while (j > 0) { result.push({ op: 'insert', text: b[j - 1] }); j--; }
    result.reverse();
    return DiffMatchPatch.cleanupMerge(result);
  }

  /**
   * Count insert/delete/equal chars.
   */
  static stats(diffs: Diff[]): { equal: number; insert: number; delete: number } {
    let equal = 0, insert = 0, del = 0;
    for (const d of diffs) {
      if (d.op === 'equal') equal += d.text.length;
      else if (d.op === 'insert') insert += d.text.length;
      else del += d.text.length;
    }
    return { equal, insert, delete: del };
  }

  /**
   * Apply diff to text.
   */
  static patch(text: string, diffs: Diff[]): string {
    let result = '';
    for (const d of diffs) {
      if (d.op !== 'delete') result += d.text;
    }
    return result;
  }

  /**
   * Compute similarity ratio (0..1).
   */
  static similarity(a: string, b: string): number {
    if (a === b) return 1;
    const total = a.length + b.length;
    if (total === 0) return 1;
    const diffs = DiffMatchPatch.diff(a, b);
    const stats = DiffMatchPatch.stats(diffs);
    return (2 * stats.equal) / total;
  }

  /**
   * Levenshtein distance from diffs.
   */
  static levenshtein(a: string, b: string): number {
    if (a === b) return 0;
    const diffs = DiffMatchPatch.diff(a, b);
    const s = DiffMatchPatch.stats(diffs);
    return s.insert + s.delete;
  }

  /**
   * Merge adjacent same-op diffs.
   */
  static cleanupMerge(diffs: Diff[]): Diff[] {
    if (diffs.length === 0) return diffs;
    const out: Diff[] = [{ ...diffs[0] }];
    for (let i = 1; i < diffs.length; i++) {
      const last = out[out.length - 1];
      const cur = diffs[i];
      if (last.op === cur.op) {
        last.text += cur.text;
      } else {
        out.push({ ...cur });
      }
    }
    return out;
  }
}
