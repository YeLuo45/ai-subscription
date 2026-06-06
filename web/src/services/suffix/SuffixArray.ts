/**
 * SuffixArray — sorted suffixes of a string
 *
 * Inspired by: classic string indexing structure
 *
 * Naive O(n^2 log n) construction: generate all suffix strings,
 * sort them, store their starting positions.
 *
 * For practical usage with small/medium strings, this is fast enough.
 * For large strings, consider SA-IS or DC3.
 *
 * Supports: build, search, longestRepeatedSubstring, LCP array.
 */

export class SuffixArray {
  private text: string = '';
  private sa: number[] = [];

  constructor(text: string = '') {
    if (text) this.build(text);
  }

  /** Build from text. */
  build(text: string): void {
    this.text = text;
    const n = text.length;
    this.sa = Array.from({ length: n }, (_, i) => i);
    this.sa.sort((a, b) => {
      const sa = text.slice(a);
      const sb = text.slice(b);
      if (sa < sb) return -1;
      if (sa > sb) return 1;
      return 0;
    });
  }

  /** Get the sorted suffix starting positions. */
  getArray(): readonly number[] { return this.sa; }

  /** Get suffix at given SA index. */
  suffixAt(index: number): string {
    return this.text.slice(this.sa[index]);
  }

  /** Binary search: find all occurrences of pattern. Returns starting indices. */
  search(pattern: string): number[] {
    if (!pattern) return [];
    const result: number[] = [];
    let lo = 0, hi = this.sa.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      const s = this.text.slice(this.sa[mid], this.sa[mid] + pattern.length);
      if (s < pattern) lo = mid + 1;
      else hi = mid;
    }
    // Found lower bound
    let i = lo;
    while (i < this.sa.length) {
      const s = this.text.slice(this.sa[i], this.sa[i] + pattern.length);
      if (s === pattern) {
        result.push(this.sa[i]);
        i += 1;
      } else if (s.startsWith(pattern)) {
        result.push(this.sa[i]);
        i += 1;
      } else {
        break;
      }
    }
    return result;
  }

  /** Longest repeated substring (LRS). */
  longestRepeatedSubstring(): { substring: string; length: number } {
    const lcp = this.lcpArray();
    let bestIdx = 0, bestLen = 0;
    for (let i = 0; i < lcp.length; i++) {
      if (lcp[i] > bestLen) {
        bestLen = lcp[i];
        bestIdx = i;
      }
    }
    return { substring: this.text.slice(this.sa[bestIdx], this.sa[bestIdx] + bestLen), length: bestLen };
  }

  /** LCP array: longest common prefix of adjacent suffixes. */
  lcpArray(): number[] {
    const n = this.sa.length;
    const lcp = new Array(Math.max(0, n - 1)).fill(0);
    for (let i = 0; i < n - 1; i++) {
      const a = this.sa[i], b = this.sa[i + 1];
      let k = 0;
      while (a + k < n && b + k < n && this.text[a + k] === this.text[b + k]) k += 1;
      lcp[i] = k;
    }
    return lcp;
  }

  /** Size in bytes (approximate). */
  size(): number {
    return this.sa.length * 4 + this.text.length * 2;
  }
}
