/**
 * WordCounter — word, character, line counter
 *
 * Inspired by: word-count / wc
 *
 * Counts:
 *   - words (whitespace-delimited)
 *   - characters (with/without spaces)
 *   - lines (LF or CRLF)
 *   - sentences
 *   - paragraphs
 */

export class WordCounter {
  /**
   * Count words.
   */
  static words(text: string): number {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter((w) => w.length > 0).length;
  }

  /**
   * Count characters (including spaces).
   */
  static characters(text: string): number {
    return [...text].length;
  }

  /**
   * Count characters (excluding spaces).
   */
  static charactersNoSpaces(text: string): number {
    return [...text].filter((c) => !/\s/.test(c)).length;
  }

  /**
   * Count lines.
   */
  static lines(text: string): number {
    if (text === '') return 0;
    return text.split(/\r\n|\r|\n/).length;
  }

  /**
   * Count non-empty lines.
   */
  static nonEmptyLines(text: string): number {
    if (text === '') return 0;
    return text.split(/\r\n|\r|\n/).filter((l) => l.trim().length > 0).length;
  }

  /**
   * Count sentences.
   */
  static sentences(text: string): number {
    if (!text) return 0;
    const matches = text.match(/[^.!?。！？]+[.!?。！？]+/g);
    return matches ? matches.length : 0;
  }

  /**
   * Count paragraphs.
   */
  static paragraphs(text: string): number {
    if (!text) return 0;
    return text.split(/\r\n\r\n|\n\n|\r\r/).filter((p) => p.trim().length > 0).length;
  }

  /**
   * Get all statistics.
   */
  static all(text: string): {
    words: number;
    characters: number;
    charactersNoSpaces: number;
    lines: number;
    sentences: number;
    paragraphs: number;
    readingTimeMin: number;
  } {
    const w = WordCounter.words(text);
    return {
      words: w,
      characters: WordCounter.characters(text),
      charactersNoSpaces: WordCounter.charactersNoSpaces(text),
      lines: WordCounter.lines(text),
      sentences: WordCounter.sentences(text),
      paragraphs: WordCounter.paragraphs(text),
      readingTimeMin: Math.ceil(w / 200),
    };
  }

  /**
   * Average word length.
   */
  static averageWordLength(text: string): number {
    const w = WordCounter.words(text);
    if (w === 0) return 0;
    const total = text.split(/\s+/).filter((s) => s.length > 0).reduce((sum, word) => sum + word.length, 0);
    return total / w;
  }

  /**
   * Longest word.
   */
  static longestWord(text: string): string {
    const words = text.match(/\S+/g) ?? [];
    if (words.length === 0) return '';
    return words.reduce((a, b) => (a.length >= b.length ? a : b));
  }
}
