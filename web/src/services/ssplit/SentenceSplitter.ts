/**
 * SentenceSplitter — split text into sentences
 *
 * Inspired by: sbd / ssplit
 *
 * Handles:
 *   - Period, exclamation, question mark
 *   - Chinese 。！？；
 *   - Handles abbreviations (Mr., Dr., etc.)
 */

const ABBREVIATIONS = new Set([
  'mr', 'mrs', 'ms', 'dr', 'prof', 'sr', 'jr', 'st', 'mt', 'co', 'inc', 'ltd', 'vs', 'etc', 'e.g', 'i.e', 'a.m', 'p.m',
]);

export class SentenceSplitter {
  /**
   * Split into sentences.
   */
  static split(text: string): string[] {
    if (!text) return [];
    const sentences: string[] = [];
    let current = '';
    for (let i = 0; i < text.length; i++) {
      current += text[i];
      const c = text[i];
      if (c === '.' || c === '!' || c === '?' || c === '。' || c === '！' || c === '？' || c === '；') {
        // Check for abbreviation
        if (c === '.') {
          const prevWord = this.getPreviousWord(current);
          if (ABBREVIATIONS.has(prevWord.toLowerCase())) continue;
        }
        // Chinese punctuation always ends a sentence
        if (c === '。' || c === '！' || c === '？' || c === '；') {
          sentences.push(current.trim());
          current = '';
          continue;
        }
        // English: look ahead for end of sentence
        if (this.isSentenceEnd(text, i)) {
          sentences.push(current.trim());
          current = '';
        }
      }
    }
    return sentences.filter((s) => s.length > 0);
  }

  private static getPreviousWord(text: string): string {
    const m = text.match(/(\S+)\.$/);
    return m ? m[1] : '';
  }

  private static isSentenceEnd(text: string, i: number): boolean {
    // Look ahead for whitespace + capital letter (English) or end-of-text
    const next = text[i + 1];
    if (next === undefined) return true;
    if (/\s/.test(next)) {
      const after = text.slice(i + 1);
      const m = after.match(/^\s+(\S)/);
      if (m) {
        // English: next starts with capital
        if (/[A-Z]/.test(m[1])) return true;
        // CJK: any Chinese character starts a new sentence
        if (/[\u4E00-\u9FFF\u3400-\u4DBF]/.test(m[1])) return true;
      }
    }
    return false;
  }

  /**
   * Count sentences.
   */
  static count(text: string): number {
    return SentenceSplitter.split(text).length;
  }

  /**
   * Get sentence at index.
   */
  static getAt(text: string, index: number): string | null {
    const s = SentenceSplitter.split(text);
    return s[index] ?? null;
  }
}
