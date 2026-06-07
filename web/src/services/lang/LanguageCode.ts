/**
 * LanguageCode — ISO 639-1 language codes
 */

interface LanguageInfo {
  code: string;
  name: string;
  nativeName: string;
  family: string;
  direction: 'ltr' | 'rtl';
}

const LANGUAGES: LanguageInfo[] = [
  { code: 'en', name: 'English', nativeName: 'English', family: 'Indo-European', direction: 'ltr' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', family: 'Sino-Tibetan', direction: 'ltr' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', family: 'Indo-European', direction: 'ltr' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', family: 'Indo-European', direction: 'ltr' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', family: 'Semitic', direction: 'rtl' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', family: 'Indo-European', direction: 'ltr' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', family: 'Indo-European', direction: 'ltr' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', family: 'Indo-European', direction: 'ltr' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', family: 'Japonic', direction: 'ltr' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', family: 'Indo-European', direction: 'ltr' },
  { code: 'fr', name: 'French', nativeName: 'Français', family: 'Indo-European', direction: 'ltr' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', family: 'Koreanic', direction: 'ltr' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', family: 'Indo-European', direction: 'ltr' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', family: 'Turkic', direction: 'ltr' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', family: 'Austroasiatic', direction: 'ltr' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', family: 'Semitic', direction: 'rtl' },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی', family: 'Indo-European', direction: 'rtl' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', family: 'Indo-European', direction: 'rtl' },
];

export class LanguageCode {
  static list(): LanguageInfo[] {
    return [...LANGUAGES];
  }

  static findByCode(code: string): LanguageInfo | null {
    return LANGUAGES.find((l) => l.code === code.toLowerCase()) ?? null;
  }

  static findByName(name: string): LanguageInfo | null {
    const lower = name.toLowerCase();
    return LANGUAGES.find((l) => l.name.toLowerCase() === lower) ?? null;
  }

  static listRTL(): LanguageInfo[] {
    return LANGUAGES.filter((l) => l.direction === 'rtl');
  }

  static listByFamily(family: string): LanguageInfo[] {
    return LANGUAGES.filter((l) => l.family === family);
  }

  static isRTL(code: string): boolean {
    const lang = LanguageCode.findByCode(code);
    return lang?.direction === 'rtl';
  }

  static isValid(code: string): boolean {
    return LanguageCode.findByCode(code) !== null;
  }
}
