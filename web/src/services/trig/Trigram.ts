/**
 * Trigram — trigram-based similarity
 *
 * Inspired by: string-similarity trigram method
 *
 * Useful for fuzzy matching.
 */

export class Trigram {
  /**
   * Extract trigrams from string.
   */
  static extract(input: string): string[] {
    if (input.length < 3) return [];
    const result: string[] = [];
    for (let i = 0; i <= input.length - 3; i++) {
      result.push(input.slice(i, i + 3));
    }
    return result;
  }

  /**
   * Trigram set (unique).
   */
  static set(input: string): Set<string> {
    return new Set(Trigram.extract(input));
  }

  /**
   * Trigram similarity (0..1).
   * Dice coefficient on trigram sets.
   */
  static similarity(a: string, b: string): number {
    if (a === b) return 1;
    if (a.length < 3 || b.length < 3) {
      if (a === b) return 1;
      return 0;
    }
    const setA = Trigram.set(a);
    const setB = Trigram.set(b);
    let intersect = 0;
    for (const t of setA) if (setB.has(t)) intersect++;
    return (2 * intersect) / (setA.size + setB.size);
  }

  /**
   * Trigram distance (1 - similarity).
   */
  static distance(a: string, b: string): number {
    return 1 - Trigram.similarity(a, b);
  }

  /**
   * Find best match in candidates.
   */
  static findBestMatch(target: string, candidates: string[]): { match: string; score: number } {
    let best = { match: '', score: -1 };
    for (const c of candidates) {
      const s = Trigram.similarity(target, c);
      if (s > best.score) best = { match: c, score: s };
    }
    return best;
  }
}
