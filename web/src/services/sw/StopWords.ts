/**
 * StopWords — stopword detection and removal
 *
 * Inspired by: stopword / natural
 *
 * Common stopwords in multiple languages.
 */

const ENGLISH_STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
  'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
  'to', 'was', 'were', 'will', 'with', 'i', 'me', 'my', 'we', 'our',
  'you', 'your', 'they', 'them', 'this', 'these', 'those', 'but', 'or',
  'if', 'then', 'else', 'when', 'where', 'why', 'how', 'all', 'any',
  'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
  'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
  'can', 'will', 'just', 'should', 'now', 'have', 'had', 'do', 'does',
  'did', 'doing', 'would', 'could', 'should', 'about', 'above', 'after',
  'again', 'against', 'am', 'before', 'below', 'between', 'down', 'during',
  'further', 'into', 'once', 'out', 'over', 'under', 'until', 'up',
  'what', 'which', 'who', 'whom', 'why', 'is', 'am', 'are', 'was', 'were',
  'be', 'been', 'being', 'here', 'there', 'where',
]);

const CHINESE_STOPWORDS = new Set([
  '的', '了', '和', '是', '在', '就', '也', '都', '及', '与',
  '或', '但', '而', '于', '为', '对', '以', '及', '把', '被',
  '不', '没', '未', '无', '很', '太', '非常', '更', '最',
  '这', '那', '此', '它', '他', '她', '我', '你', '们', '自己',
  '一个', '一些', '这个', '那个', '这些', '那些',
  '上', '下', '里', '外', '前', '后', '中', '内', '间',
]);

export type StopwordLanguage = 'en' | 'zh';

export class StopWords {
  private stopwords: Set<string>;

  constructor(language: StopwordLanguage = 'en', extra: string[] = []) {
    this.stopwords = new Set();
    if (language === 'en') {
      for (const w of ENGLISH_STOPWORDS) this.stopwords.add(w);
    } else if (language === 'zh') {
      for (const w of CHINESE_STOPWORDS) this.stopwords.add(w);
    }
    for (const w of extra) this.stopwords.add(w.toLowerCase());
  }

  /**
   * Is word a stopword?
   */
  isStopword(word: string): boolean {
    return this.stopwords.has(word.toLowerCase());
  }

  /**
   * Remove stopwords from array.
   */
  remove(words: string[]): string[] {
    return words.filter((w) => !this.isStopword(w));
  }

  /**
   * Remove from text.
   */
  removeFromText(text: string): string {
    return text.split(/\s+/).filter((w) => !this.isStopword(w)).join(' ');
  }

  /**
   * Filter stopwords.
   */
  filter(words: string[]): string[] {
    return words.filter((w) => this.isStopword(w));
  }

  /**
   * Get all stopwords.
   */
  all(): string[] {
    return Array.from(this.stopwords);
  }

  /**
   * Size of stopword set.
   */
  get size(): number {
    return this.stopwords.size;
  }

  /**
   * Add custom stopword.
   */
  add(word: string): void {
    this.stopwords.add(word.toLowerCase());
  }

  /**
   * Remove custom stopword.
   */
  removeWord(word: string): void {
    this.stopwords.delete(word.toLowerCase());
  }
}
