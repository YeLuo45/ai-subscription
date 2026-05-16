/**
 * i18n - Internationalization module
 * Supports zh/en with auto-detection and localStorage persistence
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import zhData from '../locales/zh.json';
import enData from '../locales/en.json';
import { getSettings, saveSettings } from '../services/storage';

type Locale = 'zh' | 'en';
type Translations = typeof zhData;

const translations: Record<Locale, Translations> = {
  zh: zhData,
  en: enData,
};

interface I18nContextType {
  t: (key: string) => string;
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const I18nContext = createContext<I18nContextType>({
  t: () => '',
  locale: 'zh',
  setLocale: () => {},
});

function getNestedValue(obj: any, path: string): string {
  const keys = path.split('.');
  let value = obj;
  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = value[key];
    } else {
      return path; // Return key as fallback if not found
    }
  }
  return typeof value === 'string' ? value : path;
}

/**
 * Detect browser language and map to zh/en
 */
function detectBrowserLanguage(): Locale {
  if (typeof navigator === 'undefined') {
    return 'zh';
  }
  
  const browserLang = navigator.language || '';
  
  // Map browser language codes to our supported locales
  if (browserLang.startsWith('zh')) {
    return 'zh';
  }
  
  // Default to English for all other languages
  return 'en';
}

/**
 * Get initial locale from settings or auto-detect
 */
async function getInitialLocale(): Promise<Locale> {
  try {
    const settings = await getSettings();
    if (settings.locale && (settings.locale === 'zh' || settings.locale === 'en')) {
      return settings.locale;
    }
  } catch {
    // Storage not ready, use auto-detection
  }
  
  // Auto-detect based on browser language
  return detectBrowserLanguage();
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('zh');
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Initialize locale from settings or auto-detect
    getInitialLocale().then((detectedLocale) => {
      setLocaleState(detectedLocale);
      setInitialized(true);
    });
  }, []);

  async function setLocale(newLocale: Locale) {
    setLocaleState(newLocale);
    // Persist to settings
    try {
      const settings = await getSettings();
      await saveSettings({ ...settings, locale: newLocale });
    } catch (err) {
      console.error('Failed to save locale setting:', err);
    }
  }

  function t(key: string): string {
    if (!initialized) {
      // Return key during initialization to avoid hydration mismatch
      return key;
    }
    return getNestedValue(translations[locale], key);
  }

  return (
    <I18nContext.Provider value={{ t, locale, setLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

// Named export alias for backwards compatibility
export const useTranslation = useI18n;