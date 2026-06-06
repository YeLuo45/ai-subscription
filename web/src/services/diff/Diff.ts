/**
 * Diff — text diff (Myers algorithm)
 *
 * Inspired by: fast-diff / jsdiff
 *
 * Line-level diff using Longest Common Subsequence.
 */

export type DiffOp = 'equal' | 'insert' | 'delete';

export interface DiffPart {
  op: DiffOp;
  value: string;
}

export class Diff {
  /**
   * Compute diff between two strings (line-level).
   */
  static lines(a: string, b: string): DiffPart[] {
    const aLines = a.split('\n');
    const bLines = b.split('\n');
    const lcs = Diff.lcs(aLines, bLines);
    const result: DiffPart[] = [];
    let i = 0, j = 0;
    for (const [aIdx, bIdx] of lcs) {
      while (i < aIdx) {
        result.push({ op: 'delete', value: aLines[i] });
        i++;
      }
      while (j < bIdx) {
        result.push({ op: 'insert', value: bLines[j] });
        j++;
      }
      result.push({ op: 'equal', value: aLines[i] });
      i++;
      j++;
    }
    while (i < aLines.length) {
      result.push({ op: 'delete', value: aLines[i] });
      i++;
    }
    while (j < bLines.length) {
      result.push({ op: 'insert', value: bLines[j] });
      j++;
    }
    return result;
  }

  /**
   * Word-level diff.
   */
  static words(a: string, b: string): DiffPart[] {
    const aWords = a.split(/(\s+)/);
    const bWords = b.split(/(\s+)/);
    const lcs = Diff.lcs(aWords, bWords);
    const result: DiffPart[] = [];
    let i = 0, j = 0;
    for (const [aIdx, bIdx] of lcs) {
      while (i < aIdx) { result.push({ op: 'delete', value: aWords[i] }); i++; }
      while (j < bIdx) { result.push({ op: 'insert', value: bWords[j] }); j++; }
      result.push({ op: 'equal', value: aWords[i] });
      i++; j++;
    }
    while (i < aWords.length) { result.push({ op: 'delete', value: aWords[i] }); i++; }
    while (j < bWords.length) { result.push({ op: 'insert', value: bWords[j] }); j++; }
    return result;
  }

  /**
   * Compute LCS as list of [aIdx, bIdx] pairs (in order).
   */
  private static lcs(a: string[], b: string[]): Array<[number, number]> {
    const m = a.length, n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
    // Backtrack
    const result: Array<[number, number]> = [];
    let i = m, j = n;
    while (i > 0 && j > 0) {
      if (a[i - 1] === b[j - 1]) {
        result.unshift([i - 1, j - 1]);
        i--; j--;
      } else if (dp[i - 1][j] >= dp[i][j - 1]) {
        i--;
      } else {
        j--;
      }
    }
    return result;
  }

  /**
   * Unified diff format.
   */
  static unified(a: string, b: string, context: number = 3): string {
    const parts = Diff.lines(a, b);
    const out: string[] = [];
    for (const p of parts) {
      const prefix = p.op === 'insert' ? '+' : p.op === 'delete' ? '-' : ' ';
      out.push(`${prefix}${p.value}`);
    }
    return out.join('\n');
  }

  /**
   * Count additions/deletions.
   */
  static countChanges(parts: DiffPart[]): { insertions: number; deletions: number } {
    let insertions = 0, deletions = 0;
    for (const p of parts) {
      if (p.op === 'insert') insertions++;
      else if (p.op === 'delete') deletions++;
    }
    return { insertions, deletions };
  }

  /**
   * Compute diff hunks (groups of changes with context).
   */
  static hunks(a: string, b: string, context: number = 3): Array<{ oldStart: number; newStart: number; lines: string[] }> {
    const parts = Diff.lines(a, b);
    const result: Array<{ oldStart: number; newStart: number; lines: string[] }> = [];
    let oldLine = 1, newLine = 1;
    let i = 0;
    while (i < parts.length) {
      if (parts[i].op === 'equal') { oldLine++; newLine++; i++; continue; }
      // Start of hunk
      const lines: string[] = [];
      const hunkOldStart = oldLine;
      const hunkNewStart = newLine;
      // Add leading context
      let k = Math.max(0, i - context);
      while (k < i) {
        lines.push(' ' + parts[k].value);
        k++;
      }
      // Add changes
      while (i < parts.length && parts[i].op !== 'equal') {
        const prefix = parts[i].op === 'insert' ? '+' : '-';
        lines.push(prefix + parts[i].value);
        if (parts[i].op === 'delete') oldLine++;
        else newLine++;
        i++;
      }
      // Add trailing context
      k = 0;
      while (k < context && i + k < parts.length && parts[i + k].op === 'equal') {
        lines.push(' ' + parts[i + k].value);
        oldLine++;
        newLine++;
        k++;
      }
      i += k;
      result.push({ oldStart: hunkOldStart, newStart: hunkNewStart, lines });
    }
    return result;
  }
}
