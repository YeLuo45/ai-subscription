import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { zh } from './zh';
import { en } from './en';
import { getSettings } from '../services/storage';

type Translations = typeof zh;
type Locale = 'zh' | 'en';

const translations: Record<Locale, Translations> = { zh, en };

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

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('zh');

  useEffect(() => {
    getSettings().then(settings => {
      if (settings.locale && (settings.locale === 'zh' || settings.locale === 'en')) {
        setLocaleState(settings.locale);
      }
    });
  }, []);

  function setLocale(newLocale: Locale) {
    setLocaleState(newLocale);
    // Save to settings
    getSettings().then(settings => {
      import('../services/storage').then(({ saveSettings }) => {
        saveSettings({ ...settings, locale: newLocale });
      });
    });
  }

  function t(key: string): string {
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
