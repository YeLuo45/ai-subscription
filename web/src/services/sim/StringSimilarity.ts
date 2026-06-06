/**
 * StringSimilarity — string similarity metrics
 *
 * Inspired by: string-similarity / fuse.js
 *
 * Implements:
 *   - Dice coefficient (bigrams)
 *   - Jaccard index
 *   - Cosine similarity
 */

export class StringSimilarity {
  /**
   * Dice coefficient (bigram-based).
   * Range: [0, 1]. 1 = identical.
   */
  static dice(a: string, b: string): number {
    if (a === b) return 1;
    if (a.length < 2 || b.length < 2) return 0;
    const aBigrams = new Map<string, number>();
    for (let i = 0; i < a.length - 1; i++) {
      const bg = a.slice(i, i + 2);
      aBigrams.set(bg, (aBigrams.get(bg) ?? 0) + 1);
    }
    let intersect = 0;
    for (let i = 0; i < b.length - 1; i++) {
      const bg = b.slice(i, i + 2);
      const count = aBigrams.get(bg);
      if (count && count > 0) {
        intersect++;
        aBigrams.set(bg, count - 1);
      }
    }
    return (2 * intersect) / (a.length - 1 + b.length - 1);
  }

  /**
   * Jaccard index (set-based).
   * Range: [0, 1]. 1 = identical.
   */
  static jaccard(a: string, b: string): number {
    if (a === b) return 1;
    if (a.length === 0 && b.length === 0) return 1;
    const setA = new Set(a);
    const setB = new Set(b);
    let intersect = 0;
    for (const c of setA) if (setB.has(c)) intersect++;
    const union = setA.size + setB.size - intersect;
    return union === 0 ? 1 : intersect / union;
  }

  /**
   * Cosine similarity (character-based).
   * Range: [-1, 1]. For positive vectors, [0, 1].
   */
  static cosine(a: string, b: string): number {
    if (a === b) return 1;
    if (a.length === 0 || b.length === 0) return 0;
    const countChar = (s: string): Map<string, number> => {
      const m = new Map<string, number>();
      for (const c of s) m.set(c, (m.get(c) ?? 0) + 1);
      return m;
    };
    const v1 = countChar(a);
    const v2 = countChar(b);
    let dot = 0;
    for (const [k, n] of v1) {
      if (v2.has(k)) dot += n * v2.get(k)!;
    }
    let mag1 = 0, mag2 = 0;
    for (const n of v1.values()) mag1 += n * n;
    for (const n of v2.values()) mag2 += n * n;
    if (mag1 === 0 || mag2 === 0) return 0;
    return dot / (Math.sqrt(mag1) * Math.sqrt(mag2));
  }

  /**
   * Levenshtein distance (delegated).
   */
  static levenshtein(a: string, b: string): number {
    const m = a.length, n = b.length;
    if (m === 0) return n;
    if (n === 0) return m;
    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + cost,
        );
      }
    }
    return dp[m][n];
  }

  /**
   * Levenshtein similarity (0..1, 1 = identical).
   */
  static levenshteinSim(a: string, b: string): number {
    const dist = StringSimilarity.levenshtein(a, b);
    return 1 - dist / Math.max(a.length, b.length);
  }

  /**
   * Find best match in candidates.
   */
  static findBestMatch(target: string, candidates: string[]): { match: string; score: number } {
    let best = { match: '', score: -1 };
    for (const c of candidates) {
      const s = StringSimilarity.dice(target, c);
      if (s > best.score) best = { match: c, score: s };
    }
    return best;
  }
}
