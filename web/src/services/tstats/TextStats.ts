/**
 * TextStats — text statistics and readability
 *
 * Inspired by: text-readability
 *
 * - Flesch reading ease
 * - Flesch-Kincaid grade level
 * - Gunning fog index
 * - Average sentence/word length
 * - Syllable count
 */

export class TextStats {
  /**
   * Count syllables in English word (heuristic).
   */
  static syllables(word: string): number {
    word = word.toLowerCase().replace(/[^a-z]/g, '');
    if (word.length === 0) return 0;
    if (word.length <= 3) return 1;
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');
    const matches = word.match(/[aeiouy]{1,2}/g);
    return matches ? matches.length : 1;
  }

  /**
   * Count total syllables in text.
   */
  static totalSyllables(text: string): number {
    const words = text.match(/\b[a-zA-Z']+\b/g) ?? [];
    return words.reduce((sum, w) => sum + TextStats.syllables(w), 0);
  }

  /**
   * Flesch reading ease (higher = easier).
   * 90-100: very easy, 60-70: standard, <30: very difficult
   */
  static fleschReadingEase(text: string): number {
    const sentences = (text.match(/[.!?]+/g) || []).length || 1;
    const words = (text.match(/\b[a-zA-Z']+\b/g) || []);
    const wordCount = words.length || 1;
    const syllables = TextStats.totalSyllables(text);
    return 206.835 - 1.015 * (wordCount / sentences) - 84.6 * (syllables / wordCount);
  }

  /**
   * Flesch-Kincaid grade level.
   */
  static fleschKincaidGrade(text: string): number {
    const sentences = (text.match(/[.!?]+/g) || []).length || 1;
    const words = (text.match(/\b[a-zA-Z']+\b/g) || []);
    const wordCount = words.length || 1;
    const syllables = TextStats.totalSyllables(text);
    return 0.39 * (wordCount / sentences) + 11.8 * (syllables / wordCount) - 15.59;
  }

  /**
   * Gunning fog index.
   */
  static gunningFog(text: string): number {
    const sentences = (text.match(/[.!?]+/g) || []).length || 1;
    const words = (text.match(/\b[a-zA-Z']+\b/g) || []);
    const wordCount = words.length || 1;
    const complexWords = words.filter((w) => TextStats.syllables(w) >= 3).length;
    return 0.4 * (wordCount / sentences + 100 * (complexWords / wordCount));
  }

  /**
   * Average word length.
   */
  static averageWordLength(text: string): number {
    const words = text.match(/\b[a-zA-Z']+\b/g) || [];
    if (words.length === 0) return 0;
    return words.reduce((s, w) => s + w.length, 0) / words.length;
  }

  /**
   * Average sentence length (words per sentence).
   */
  static averageSentenceLength(text: string): number {
    const sentences = (text.match(/[.!?]+/g) || []).length || 1;
    const words = (text.match(/\b[a-zA-Z']+\b/g) || []).length;
    return words / sentences;
  }

  /**
   * Lexical diversity (unique words / total words).
   */
  static lexicalDiversity(text: string): number {
    const words = (text.match(/\b[a-zA-Z']+\b/g) || []).map((w) => w.toLowerCase());
    if (words.length === 0) return 0;
    return new Set(words).size / words.length;
  }

  /**
   * Get all stats.
   */
  static all(text: string): {
    syllables: number;
    words: number;
    sentences: number;
    fleschReadingEase: number;
    fleschKincaidGrade: number;
    gunningFog: number;
    averageWordLength: number;
    averageSentenceLength: number;
    lexicalDiversity: number;
  } {
    const sentences = (text.match(/[.!?]+/g) || []).length || 1;
    const words = (text.match(/\b[a-zA-Z']+\b/g) || []);
    return {
      syllables: TextStats.totalSyllables(text),
      words: words.length,
      sentences,
      fleschReadingEase: TextStats.fleschReadingEase(text),
      fleschKincaidGrade: TextStats.fleschKincaidGrade(text),
      gunningFog: TextStats.gunningFog(text),
      averageWordLength: TextStats.averageWordLength(text),
      averageSentenceLength: TextStats.averageSentenceLength(text),
      lexicalDiversity: TextStats.lexicalDiversity(text),
    };
  }
}
