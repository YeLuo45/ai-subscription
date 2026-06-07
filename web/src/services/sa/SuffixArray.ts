/**
 * SuffixArray — suffix array for string pattern search
 *
 * Inspired by: suffix-array
 *
 * - Build sorted suffix array
 * - Find all occurrences of pattern (binary search)
 * - Longest repeated substring
 */

export class SuffixArray {
  private sa: number[] = [];
  private text: string = '';

  /**
   * Build suffix array.
   */
  build(text: string): void {
    this.text = text;
    const n = text.length;
    this.sa = Array.from({ length: n }, (_, i) => i);
    // Sort by cyclic rank
    this.sa.sort((a, b) => {
      for (let i = 0; i < n; i++) {
        const ca = (a + i < n) ? text.charCodeAt(a + i) : -1;
        const cb = (b + i < n) ? text.charCodeAt(b + i) : -1;
        if (ca !== cb) return ca - cb;
        if ((a + i >= n) || (b + i >= n)) return (a - b);
      }
      return 0;
    });
  }

  /**
   * Get sorted suffix array.
   */
  get array(): number[] {
    return this.sa;
  }

  /**
   * Find all occurrences of pattern.
   */
  findAll(pattern: string): number[] {
    if (this.sa.length === 0) return [];
    const lo = this._lowerBound(pattern);
    const hi = this._upperBound(pattern);
    if (lo >= hi) return [];
    const result: number[] = [];
    for (let i = lo; i < hi; i++) result.push(this.sa[i]);
    return result.sort((a, b) => a - b);
  }

  /**
   * Count occurrences.
   */
  count(pattern: string): number {
    return this.findAll(pattern).length;
  }

  /**
   * Check if pattern exists.
   */
  contains(pattern: string): boolean {
    return this.count(pattern) > 0;
  }

  /**
   * Longest repeated substring.
   */
  longestRepeatedSubstring(): { text: string; length: number } {
    if (this.sa.length === 0) return { text: '', length: 0 };
    const n = this.text.length;
    let bestLen = 0, bestStart = 0;
    for (let i = 0; i < n - 1; i++) {
      const lcp = this._lcp(this.sa[i], this.sa[i + 1]);
      if (lcp > bestLen) {
        bestLen = lcp;
        bestStart = this.sa[i];
      }
    }
    return { text: this.text.slice(bestStart, bestStart + bestLen), length: bestLen };
  }

  private _lcp(a: number, b: number): number {
    let n = 0;
    while (a + n < this.text.length && b + n < this.text.length &&
           this.text[a + n] === this.text[b + n]) n++;
    return n;
  }

  private _compare(pos: number, pattern: string): number {
    const n = this.text.length - pos;
    const m = pattern.length;
    const len = Math.min(n, m);
    for (let i = 0; i < len; i++) {
      const c1 = this.text.charCodeAt(pos + i);
      const c2 = pattern.charCodeAt(i);
      if (c1 !== c2) return c1 - c2;
    }
    // All compared chars match. If pattern is shorter/equal, pattern is a prefix → 0
    if (m <= n) return 0;
    // Suffix ended before pattern → suffix is less
    return -1;
  }

  private _lowerBound(pattern: string): number {
    let lo = 0, hi = this.sa.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (this._compare(this.sa[mid], pattern) < 0) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  private _upperBound(pattern: string): number {
    let lo = 0, hi = this.sa.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (this._compare(this.sa[mid], pattern) <= 0) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }
}
