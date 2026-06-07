/**
 * FuzzySearch — fuzzy string matching
 *
 * Inspired by: fzf / fuzzy
 *
 * - Subsequence matching (chars in order)
 * - Score based on position, consecutive, case
 * - Multi-pattern (AND)
 */

export interface FuzzyMatch {
  text: string;
  score: number;
  indices: number[];
}

export class FuzzySearch {
  /**
   * Compute match score (-1 if no match).
   */
  static score(pattern: string, text: string, caseSensitive: boolean = false): number {
    if (pattern.length === 0) return 1;
    const p = caseSensitive ? pattern : pattern.toLowerCase();
    const t = caseSensitive ? text : text.toLowerCase();
    if (p.length > t.length) return -1;
    let pIdx = 0, score = 0, prevMatch = -1, consecutive = 0;
    for (let i = 0; i < t.length && pIdx < p.length; i++) {
      if (t[i] === p[pIdx]) {
        if (prevMatch === i - 1) {
          score += 5;
          consecutive++;
        } else {
          score += 1;
          consecutive = 0;
        }
        if (i === 0 || /[ _\-./]/.test(t[i - 1])) score += 3;
        if (text[i] === text[i].toUpperCase() && text[i] !== text[i].toLowerCase()) score += 2;
        prevMatch = i;
        pIdx++;
      }
    }
    if (pIdx < p.length) return -1;
    // Length penalty
    score -= text.length * 0.01;
    return score;
  }

  /**
   * Find indices of pattern in text.
   */
  static findIndices(pattern: string, text: string, caseSensitive: boolean = false): number[] {
    if (pattern.length === 0) return [];
    const p = caseSensitive ? pattern : pattern.toLowerCase();
    const t = caseSensitive ? text : text.toLowerCase();
    const indices: number[] = [];
    let pIdx = 0;
    for (let i = 0; i < t.length && pIdx < p.length; i++) {
      if (t[i] === p[pIdx]) {
        indices.push(i);
        pIdx++;
      }
    }
    return pIdx < p.length ? [] : indices;
  }

  /**
   * Match a list of texts.
   */
  static match(pattern: string, texts: string[], limit: number = 10, caseSensitive: boolean = false): FuzzyMatch[] {
    const results: FuzzyMatch[] = [];
    for (const text of texts) {
      const s = FuzzySearch.score(pattern, text, caseSensitive);
      if (s >= 0) {
        results.push({ text, score: s, indices: FuzzySearch.findIndices(pattern, text, caseSensitive) });
      }
    }
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  /**
   * Multi-pattern AND.
   */
  static matchMulti(patterns: string[], text: string, caseSensitive: boolean = false): boolean {
    for (const p of patterns) {
      if (FuzzySearch.findIndices(p, text, caseSensitive).length === 0) return false;
    }
    return true;
  }

  /**
   * Highlight matched characters.
   */
  static highlight(text: string, indices: number[]): string {
    if (indices.length === 0) return text;
    const set = new Set(indices);
    let out = '';
    for (let i = 0; i < text.length; i++) {
      if (set.has(i)) out += `**${text[i]}**`;
      else out += text[i];
    }
    return out;
  }

  /**
   * Check if pattern is subsequence of text.
   */
  static isSubsequence(pattern: string, text: string, caseSensitive: boolean = false): boolean {
    if (pattern.length === 0) return true;
    const p = caseSensitive ? pattern : pattern.toLowerCase();
    const t = caseSensitive ? text : text.toLowerCase();
    let pIdx = 0;
    for (let i = 0; i < t.length; i++) {
      if (t[i] === p[pIdx]) pIdx++;
      if (pIdx === p.length) return true;
    }
    return false;
  }
}
