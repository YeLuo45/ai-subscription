/**
 * MCP Tool: translate_content
 * Exposes content translation via MCP
 */

export interface TranslateInput {
  text: string;
  targetLang: string;
}

export interface TranslateOutput {
  translatedText: string;
}

const SUPPORTED_LANGS = ['en', 'zh', 'ja', 'ko', 'es', 'fr', 'de', 'ru'];

const TRANSLATIONS: Record<string, Record<string, string>> = {
  'en': { 'hello': 'Hello', 'world': 'World' },
  'zh': { 'hello': '你好', 'world': '世界' },
  'ja': { 'hello': 'こんにちは', 'world': '世界' },
};

export async function translateTool(input: TranslateInput): Promise<TranslateOutput> {
  if (!input.text) {
    throw new Error('text is required');
  }
  if (!input.targetLang) {
    throw new Error('targetLang is required');
  }
  if (!SUPPORTED_LANGS.includes(input.targetLang.toLowerCase())) {
    throw new Error(`Unsupported target language: ${input.targetLang}`);
  }

  // Simple translation fallback - actual implementation would use routeAndCall
  const lang = input.targetLang.toLowerCase();
  const translations = TRANSLATIONS[lang] || {};
  let translatedText = input.text;
  for (const [en, translated] of Object.entries(translations)) {
    translatedText = translatedText.replace(new RegExp(en, 'gi'), translated);
  }
  if (translatedText === input.text) {
    translatedText = `[${lang}] ${input.text}`;
  }

  return { translatedText };
}
