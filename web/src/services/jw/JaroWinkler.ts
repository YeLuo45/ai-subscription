/**
 * JaroWinkler — Jaro-Winkler string similarity
 *
 * Inspired by: jaro-winkler
 *
 * Range [0, 1]. 1 = identical.
 * Gives more weight to common prefix (max 4 chars).
 */

export class JaroWinkler {
  /**
   * Jaro similarity (base).
   */
  static jaro(a: string, b: string): number {
    if (a === b) return 1;
    if (a.length === 0 || b.length === 0) return 0;
    const matchDistance = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1);
    const aMatches: boolean[] = new Array(a.length).fill(false);
    const bMatches: boolean[] = new Array(b.length).fill(false);
    let matches = 0;
    for (let i = 0; i < a.length; i++) {
      const start = Math.max(0, i - matchDistance);
      const end = Math.min(i + matchDistance + 1, b.length);
      for (let j = start; j < end; j++) {
        if (bMatches[j]) continue;
        if (a[i] !== b[j]) continue;
        aMatches[i] = true;
        bMatches[j] = true;
        matches++;
        break;
      }
    }
    if (matches === 0) return 0;
    let transpositions = 0;
    let k = 0;
    for (let i = 0; i < a.length; i++) {
      if (!aMatches[i]) continue;
      while (!bMatches[k]) k++;
      if (a[i] !== b[k]) transpositions++;
      k++;
    }
    transpositions = transpositions / 2;
    return (
      matches / a.length +
      matches / b.length +
      (matches - transpositions) / matches
    ) / 3;
  }

  /**
   * Jaro-Winkler similarity (boosts common prefix).
   */
  static similarity(a: string, b: string, prefixScale: number = 0.1): number {
    const j = JaroWinkler.jaro(a, b);
    let prefix = 0;
    for (let i = 0; i < Math.min(4, a.length, b.length); i++) {
      if (a[i] === b[i]) prefix++;
      else break;
    }
    return j + prefix * prefixScale * (1 - j);
  }

  /**
   * Jaro distance (1 - similarity).
   */
  static distance(a: string, b: string): number {
    return 1 - JaroWinkler.similarity(a, b);
  }
}
