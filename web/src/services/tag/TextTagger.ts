/**
 * TextTagger — simple text tagging utilities
 *
 * Inspired by: compromise / natural
 *
 * Provides simple POS-like and entity tagging.
 */

export type PosTag = 'noun' | 'verb' | 'adj' | 'adv' | 'det' | 'prep' | 'conj' | 'pron' | 'num' | 'unk';
export type EntityType = 'email' | 'url' | 'mention' | 'hashtag' | 'number' | 'date' | 'phone' | 'emoji';

export interface Tag {
  text: string;
  start: number;
  end: number;
  type: PosTag | EntityType;
}

const COMMON_NOUNS = new Set(['time', 'year', 'people', 'way', 'day', 'man', 'woman', 'thing', 'world', 'life', 'hand', 'part', 'child', 'eye', 'place', 'case', 'week', 'company', 'system', 'program', 'question', 'work', 'government', 'number', 'night', 'point', 'home', 'water', 'room', 'mother', 'area', 'money', 'story', 'fact', 'month', 'lot', 'right', 'study', 'book', 'eye', 'job', 'word', 'business', 'issue', 'side', 'kind', 'head', 'house', 'service', 'friend', 'father', 'power', 'hour', 'game', 'line', 'end', 'member', 'law', 'car', 'city', 'community']);
const COMMON_VERBS = new Set(['is', 'am', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'must', 'can', 'go', 'come', 'see', 'know', 'get', 'make', 'take', 'give', 'find', 'think', 'tell', 'become', 'show', 'leave', 'feel', 'put', 'bring', 'begin', 'keep', 'hold', 'write', 'stand', 'hear', 'let', 'mean', 'set', 'meet', 'run', 'pay', 'sit', 'speak', 'lie', 'lead', 'read', 'grow', 'lose', 'fall', 'send', 'build', 'understand', 'draw', 'break', 'spend', 'cut', 'rise', 'drive', 'buy', 'wear', 'choose', 'seek', 'use', 'work', 'play', 'love', 'want', 'need', 'help', 'start', 'stop', 'open', 'close', 'say', 'tell', 'ask', 'answer', 'try', 'want', 'like']);
const COMMON_ADJ = new Set(['good', 'new', 'first', 'last', 'long', 'great', 'little', 'own', 'other', 'old', 'right', 'big', 'high', 'low', 'large', 'next', 'early', 'young', 'important', 'few', 'public', 'bad', 'same', 'able', 'happy', 'sorry', 'best', 'worst', 'beautiful', 'nice', 'big', 'small', 'tall', 'short', 'fast', 'slow', 'hot', 'cold', 'old', 'new', 'young']);
const COMMON_ADV = new Set(['very', 'too', 'just', 'also', 'only', 'not', 'no', 'so', 'now', 'then', 'here', 'there', 'where', 'when', 'how', 'why', 'often', 'always', 'never', 'sometimes', 'usually', 'really', 'quite', 'still', 'already', 'yet', 'ever']);
const COMMON_DET = new Set(['a', 'an', 'the', 'this', 'that', 'these', 'those', 'my', 'your', 'his', 'her', 'its', 'our', 'their', 'some', 'any', 'no', 'every', 'each']);
const COMMON_PREP = new Set(['in', 'on', 'at', 'to', 'for', 'with', 'by', 'from', 'of', 'about', 'under', 'over', 'between', 'through', 'during', 'before', 'after', 'above', 'below', 'into', 'onto', 'off', 'out', 'up', 'down', 'off']);
const COMMON_CONJ = new Set(['and', 'or', 'but', 'so', 'yet', 'for', 'nor', 'because', 'if', 'when', 'while', 'although', 'though', 'since', 'unless', 'until', 'after', 'before']);
const COMMON_PRON = new Set(['i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their', 'mine', 'yours', 'hers', 'ours', 'theirs', 'this', 'that', 'these', 'those', 'who', 'whom', 'which', 'what', 'whose']);

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const URL_RE = /https?:\/\/[^\s]+/g;
const MENTION_RE = /@[[\w_]+/g;
const HASHTAG_RE = /#[\w_]+/g;
const PHONE_RE = /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
const NUMBER_RE = /\b\d+(\.\d+)?\b/g;
const DATE_RE = /\b\d{4}-\d{1,2}-\d{1,2}\b|\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g;
const EMOJI_RE = /[\u{1F300}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{27BF}]/gu;

export class TextTagger {
  /**
   * Tag parts of speech.
   */
  static posTag(text: string): Tag[] {
    const words = text.match(/\b[\w']+\b/g) ?? [];
    const tags: Tag[] = [];
    let offset = 0;
    for (const w of words) {
      const start = text.indexOf(w, offset);
      offset = start + w.length;
      const lower = w.toLowerCase();
      let type: PosTag = 'unk';
      if (COMMON_VERBS.has(lower)) type = 'verb';
      else if (COMMON_ADJ.has(lower)) type = 'adj';
      else if (COMMON_ADV.has(lower)) type = 'adv';
      else if (COMMON_DET.has(lower)) type = 'det';
      else if (COMMON_PREP.has(lower)) type = 'prep';
      else if (COMMON_CONJ.has(lower)) type = 'conj';
      else if (COMMON_PRON.has(lower)) type = 'pron';
      else if (COMMON_NOUNS.has(lower)) type = 'noun';
      else if (/^\d+$/.test(w)) type = 'num';
      tags.push({ text: w, start, end: start + w.length, type });
    }
    return tags;
  }

  /**
   * Extract entities.
   */
  static entities(text: string): Tag[] {
    const result: Tag[] = [];
    for (const [re, type] of [
      [EMAIL_RE, 'email'],
      [URL_RE, 'url'],
      [MENTION_RE, 'mention'],
      [HASHTAG_RE, 'hashtag'],
      [PHONE_RE, 'phone'],
      [NUMBER_RE, 'number'],
      [DATE_RE, 'date'],
      [EMOJI_RE, 'emoji'],
    ] as const) {
      const matches = text.matchAll(re);
      for (const m of matches) {
        if (m.index === undefined) continue;
        result.push({
          text: m[0],
          start: m.index,
          end: m.index + m[0].length,
          type: type as EntityType,
        });
      }
    }
    return result.sort((a, b) => a.start - b.start);
  }

  /**
   * Tag all (POS + entities).
   */
  static tagAll(text: string): { pos: Tag[]; entities: Tag[] } {
    return {
      pos: TextTagger.posTag(text),
      entities: TextTagger.entities(text),
    };
  }
}
