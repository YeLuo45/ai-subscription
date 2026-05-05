/**
 * Language Detection Utility
 * Simple charset analysis for detecting language from text
 * No external libraries required
 */

// Supported languages
export type Language = 'EN' | 'ZH' | 'TW' | 'JP' | 'KR' | 'DE' | 'FR' | 'ES' | 'RU' | 'AR';

export const LANGUAGE_LABELS: Record<Language, string> = {
  EN: 'English',
  ZH: '简体中文',
  TW: '繁体中文',
  JP: '日语',
  KR: '韩语',
  DE: '德语',
  FR: '法语',
  ES: '西班牙语',
  RU: '俄语',
  AR: '阿拉伯语',
};

export const LANGUAGE_COLORS: Record<Language, string> = {
  EN: 'blue',
  ZH: 'red',
  TW: 'orange',
  JP: 'pink',
  KR: 'green',
  DE: 'purple',
  FR: 'cyan',
  ES: 'gold',
  RU: ' volcano',
  AR: 'lime',
};

// Character ranges for each language
const CHAR_RANGES: Array<{ lang: Language; ranges: [number, number][] }> = [
  { lang: 'AR', ranges: [[0x0600, 0x06FF], [0x0750, 0x077F], [0x08A0, 0x08FF]] },
  { lang: 'JP', ranges: [[0x3040, 0x309F], [0x30A0, 0x30FF], [0x4E00, 0x9FFF]] },
  { lang: 'KR', ranges: [[0xAC00, 0xD7AF], [0x1100, 0x11FF]] },
  { lang: 'ZH', ranges: [[0x4E00, 0x9FFF]] },
  { lang: 'TW', ranges: [[0x4E00, 0x9FFF]] }, // Shared with ZH
  { lang: 'RU', ranges: [[0x0400, 0x04FF]] },
  { lang: 'DE', ranges: [] }, // Latin script, handled specially
  { lang: 'FR', ranges: [] }, // Latin script, handled specially
  { lang: 'ES', ranges: [] }, // Latin script, handled specially
  { lang: 'EN', ranges: [] }, // Latin script, handled specially
];

// Latin script character pattern
const LATIN_PATTERN = /^[a-zA-Z\s.,!?;:'"()-]+$/;

function getCharCode(char: string): number {
  return char.charCodeAt(0);
}

function isInRange(charCode: number, ranges: [number, number][]): boolean {
  return ranges.some(([start, end]) => charCode >= start && charCode <= end);
}

/**
 * Detect language from text using character set analysis
 * Returns the detected language code (EN, ZH, JP, etc.)
 */
export function detectLanguage(text: string): Language {
  if (!text || text.trim().length === 0) {
    return 'EN'; // Default
  }

  const charCounts: Record<Language, number> = {
    EN: 0, ZH: 0, TW: 0, JP: 0, KR: 0, DE: 0, FR: 0, ES: 0, RU: 0, AR: 0,
  };

  const latinChars: number[] = [];
  let hasNonAscii = false;

  for (const char of text) {
    const code = getCharCode(char);
    
    // Check for Arabic
    if (isInRange(code, CHAR_RANGES.find(r => r.lang === 'AR')!.ranges)) {
      charCounts['AR']++;
      continue;
    }

    // Check for Japanese
    if (isInRange(code, CHAR_RANGES.find(r => r.lang === 'JP')!.ranges)) {
      charCounts['JP']++;
      continue;
    }

    // Check for Korean
    if (isInRange(code, CHAR_RANGES.find(r => r.lang === 'KR')!.ranges)) {
      charCounts['KR']++;
      continue;
    }

    // Check for Chinese (CJK Unified Ideographs)
    // This is checked after JP and KR to avoid false positives
    if (isInRange(code, [[0x4E00, 0x9FFF]])) {
      // Japanese kanji also in this range, need additional check
      // Japanese hiragana/katakana ranges are unique
      const isJapaneseRange = CHAR_RANGES.find(r => r.lang === 'JP')!.ranges
        .some(([start, end]) => code >= start && code <= end);
      if (!isJapaneseRange) {
        charCounts['ZH']++;
        continue;
      }
    }

    // Check for Russian/Cyrillic
    if (isInRange(code, CHAR_RANGES.find(r => r.lang === 'RU')!.ranges)) {
      charCounts['RU']++;
      continue;
    }

    // Latin script (English, German, French, Spanish)
    if ((code >= 0x0000 && code <= 0x007F) || LATIN_PATTERN.test(char)) {
      if (code > 127) {
        hasNonAscii = true;
      }
      latinChars.push(code);
      continue;
    }
  }

  // Check Latin-based languages using common word patterns
  const latinCount = latinChars.length;
  if (latinCount > text.length * 0.3 || Object.values(charCounts).every(c => c === 0)) {
    // Determine specific Latin-based language
    const lowerText = text.toLowerCase();
    
    // German indicators
    if (/\b(der|die|das|und|ist|nicht|mit|von|zu|haben|werden|aus)\b/.test(lowerText)) {
      return 'DE';
    }
    
    // French indicators
    if (/\b(le|la|les|de|du|des|et|est|un|une|que|qui|pour|dans)\b/.test(lowerText)) {
      return 'FR';
    }
    
    // Spanish indicators
    if (/\b(el|la|los|las|de|del|que|es|un|una|y|en|por|para|con)\b/.test(lowerText)) {
      return 'ES';
    }

    // Default to English for Latin script
    return 'EN';
  }

  // Find the language with the highest count
  let maxLang: Language = 'EN';
  let maxCount = 0;

  for (const [lang, count] of Object.entries(charCounts)) {
    if (count > maxCount) {
      maxCount = count;
      maxLang = lang as Language;
    }
  }

  // If no clear winner, default to English
  if (maxCount < text.length * 0.1) {
    return 'EN';
  }

  return maxLang;
}

/**
 * Get all target languages for translation selection
 */
export function getTargetLanguageOptions(): Array<{ value: Language; label: string }> {
  return Object.entries(LANGUAGE_LABELS).map(([value, label]) => ({
    value: value as Language,
    label,
  }));
}
