/**
 * i18n - Internationalization module
 * Supports zh/en/th/vi/id/de/fr/es with auto-detection and localStorage persistence
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import zhData from '../locales/zh.json';
import enData from '../locales/en.json';
import thData from '../locales/th.json';
import viData from '../locales/vi.json';
import idData from '../locales/id.json';
import deData from '../locales/de.json';
import frData from '../locales/fr.json';
import esData from '../locales/es.json';
import { getSettings, saveSettings } from '../services/storage';

type Locale = 'en' | 'zh' | 'th' | 'vi' | 'id' | 'de' | 'fr' | 'es';
type Translations = typeof zhData;

const translations: Record<Locale, Translations> = {
  en: enData,
  zh: zhData,
  th: thData,
  vi: viData,
  id: idData,
  de: deData,
  fr: frData,
  es: esData,
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
 * Detect browser language and map to our supported locales
 */
function detectBrowserLanguage(): Locale {
  if (typeof navigator === 'undefined') {
    return 'en';
  }
  
  const browserLang = navigator.language || '';
  const lang = browserLang.toLowerCase();
  
  // Map browser language codes to our supported locales
  if (lang.startsWith('zh')) return 'zh';
  if (lang.startsWith('th')) return 'th';
  if (lang.startsWith('vi')) return 'vi';
  if (lang.startsWith('id')) return 'id';
  if (lang.startsWith('de')) return 'de';
  if (lang.startsWith('fr')) return 'fr';
  if (lang.startsWith('es')) return 'es';
  
  // Default to English
  return 'en';
}

/**
 * Get initial locale from settings or auto-detect
 */
async function getInitialLocale(): Promise<Locale> {
  try {
    const settings = await getSettings();
    const supportedLocales: Locale[] = ['en', 'zh', 'th', 'vi', 'id', 'de', 'fr', 'es'];
    if (settings.locale && supportedLocales.includes(settings.locale as Locale)) {
      return settings.locale as Locale;
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