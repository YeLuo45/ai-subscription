/**
 * useTranslation Hook
 * Manages article translation using LLM
 */

import { useState, useCallback } from 'react';
import { routeAndCall } from "../../../shared/lib/ai/llm-router";
import { detectLanguage, type Language } from '../lib/languageDetect';
import * as translationDB from '../db/translationDB';
import type { TranslationSettings } from '../db/translationDB';
import { message } from 'antd';

interface TranslationResult {
  title: string;
  description: string;
}

interface UseTranslationReturn {
  translating: boolean;
  translation: TranslationResult | null;
  sourceLang: Language;
  error: string | null;
  translate: (articleId: string, title: string, description: string) => Promise<TranslationResult | null>;
  clearTranslation: () => void;
}

// Default translation settings
const DEFAULT_SETTINGS: TranslationSettings = {
  targetLanguage: 'ZH',
  translationService: 'gemini',
};

// Load settings from localStorage
function loadSettings(): TranslationSettings {
  try {
    const saved = localStorage.getItem('translation_settings');
    if (saved) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    }
  } catch {
    // ignore
  }
  return DEFAULT_SETTINGS;
}

// Save settings to localStorage
function saveSettings(settings: TranslationSettings): void {
  localStorage.setItem('translation_settings', JSON.stringify(settings));
}

/**
 * Get the target language label for prompts
 */
function getTargetLangLabel(lang: Language): string {
  const labels: Record<Language, string> = {
    EN: 'English',
    ZH: 'Simplified Chinese',
    TW: 'Traditional Chinese',
    JP: 'Japanese',
    KR: 'Korean',
    DE: 'German',
    FR: 'French',
    ES: 'Spanish',
    RU: 'Russian',
    AR: 'Arabic',
  };
  return labels[lang];
}

/**
 * Build translation prompt for LLM
 */
function buildTranslationPrompt(
  title: string,
  description: string,
  sourceLang: Language,
  targetLang: Language
): string {
  const targetLabel = getTargetLangLabel(targetLang);
  const sourceLabel = getTargetLangLabel(sourceLang);
  
  return `You are a professional translator. Translate the following article title and summary from ${sourceLabel} to ${targetLabel}.

Return a JSON object with this exact structure:
{
  "translatedTitle": "<translated title>",
  "translatedDescription": "<translated description>"
}

Rules:
- Translate only the title and description
- Keep the same tone and style
- Preserve any special characters or formatting
- If the text is already in ${targetLabel}, return it as-is
- Do not add any explanation or additional text

Original text:
Title: ${title}
Description: ${description}`;
}

/**
 * Parse LLM response to extract translation
 */
function parseTranslationResponse(text: string): TranslationResult | null {
  try {
    // Try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*?"translatedTitle"[\s\S]*?"translatedDescription"[\s\S]*?\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.translatedTitle && parsed.translatedDescription) {
        return {
          title: parsed.translatedTitle,
          description: parsed.translatedDescription,
        };
      }
    }
    
    // Fallback: try direct JSON parse
    const parsed = JSON.parse(text);
    if (parsed.translatedTitle && parsed.translatedDescription) {
      return {
        title: parsed.translatedTitle,
        description: parsed.translatedDescription,
      };
    }
  } catch {
    // parsing failed
  }
  
  return null;
}

export function useTranslation(): UseTranslationReturn {
  const [translating, setTranslating] = useState(false);
  const [translation, setTranslation] = useState<TranslationResult | null>(null);
  const [sourceLang, setSourceLang] = useState<Language>('EN');
  const [error, setError] = useState<string | null>(null);

  const translate = useCallback(async (
    articleId: string,
    title: string,
    description: string
  ): Promise<TranslationResult | null> => {
    setTranslating(true);
    setError(null);

    try {
      // Detect source language
      const detectedLang = detectLanguage(title + ' ' + description);
      setSourceLang(detectedLang);

      // Load translation settings
      const settings = loadSettings();
      const { targetLanguage, translationService } = settings;

      // Skip if source and target are the same
      if (detectedLang === targetLanguage) {
        message.info('Source and target languages are the same');
        setTranslation({ title, description });
        return { title, description };
      }

      // Check cache first
      const cached = await translationDB.getCachedTranslation(
        title + description,
        detectedLang,
        targetLanguage,
        translationService
      );

      if (cached) {
        message.success('Translation loaded from cache');
        setTranslation({
          title: cached.translatedTitle,
          description: cached.translatedDescription,
        });
        return {
          title: cached.translatedTitle,
          description: cached.translatedDescription,
        };
      }

      // Call LLM for translation
      const prompt = buildTranslationPrompt(title, description, detectedLang, targetLanguage);

      let result;
      if (translationService === 'deepl') {
        // DeepL uses a different approach - in a real implementation,
        // you would call the DeepL API directly
        // For now, fall back to gemini
        result = await routeAndCall({
          taskType: 'translation',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          maxTokens: 1000,
        });
      } else {
        // Gemini Flash
        result = await routeAndCall({
          taskType: 'translation',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          maxTokens: 1000,
        });
      }

      const translationResult = parseTranslationResponse(result.text);

      if (!translationResult) {
        throw new Error('Failed to parse translation response');
      }

      // Save to cache
      await translationDB.saveTranslation(
        title + description,
        detectedLang,
        targetLanguage,
        translationResult.title,
        translationResult.description,
        translationService
      );

      setTranslation(translationResult);
      return translationResult;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Translation failed';
      setError(errorMessage);
      message.error(errorMessage);
      return null;
    } finally {
      setTranslating(false);
    }
  }, []);

  const clearTranslation = useCallback(() => {
    setTranslation(null);
    setSourceLang('EN');
    setError(null);
  }, []);

  return {
    translating,
    translation,
    sourceLang,
    error,
    translate,
    clearTranslation,
  };
}

// Export settings helpers
export const translationSettings = {
  get: loadSettings,
  set: saveSettings,
};
