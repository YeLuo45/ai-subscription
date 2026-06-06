/**
 * NGram — n-gram tokenization
 *
 * Inspired by: natural/n-gram
 *
 * Word and character n-grams.
 */

export class NGram {
  /**
   * Word n-grams.
   */
  static words(text: string, n: number = 2): string[][] {
    const words = text.split(/\s+/).filter((w) => w.length > 0);
    if (words.length < n) return [];
    const result: string[][] = [];
    for (let i = 0; i <= words.length - n; i++) {
      result.push(words.slice(i, i + n));
    }
    return result;
  }

  /**
   * Character n-grams.
   */
  static chars(text: string, n: number = 2): string[] {
    if (text.length < n) return [];
    const result: string[] = [];
    for (let i = 0; i <= text.length - n; i++) {
      result.push(text.slice(i, i + n));
    }
    return result;
  }

  /**
   * Pad n-grams with start/end tokens.
   */
  static paddedWords(text: string, n: number = 2, pad: string = '<PAD>'): string[][] {
    const words = text.split(/\s+/).filter((w) => w.length > 0);
    const padded = [pad, ...words, pad];
    return NGram.words(padded.join(' '), n);
  }

  /**
   * Get unique n-grams.
   */
  static unique<T>(ngrams: T[][]): T[][] {
    const seen = new Set<string>();
    const result: T[][] = [];
    for (const ng of ngrams) {
      const key = ng.join('\u0001');
      if (!seen.has(key)) {
        seen.add(key);
        result.push(ng);
      }
    }
    return result;
  }

  /**
   * Frequency distribution.
   */
  static frequencies<T>(ngrams: T[][]): Map<string, number> {
    const freq = new Map<string, number>();
    for (const ng of ngrams) {
      const key = ng.join('\u0001');
      freq.set(key, (freq.get(key) ?? 0) + 1);
    }
    return freq;
  }
}
