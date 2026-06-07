/**
 * useThemeVariant — 主题变体 hook
 *
 * - Loads themeVariant from settings
 * - Applies it to document root
 * - Exposes setThemeVariant
 */

import { useEffect, useState, useCallback } from 'react';
import { getSettings, saveSettings } from '../services/storage';
import type { ThemeVariant, ThemeMode } from '../types';
import { applyThemeVariant, resolveEffectiveVariant, THEME_VARIANTS } from '../styles/themeRegistry';

export function useThemeVariant() {
  const [variant, setVariantState] = useState<ThemeVariant>('light');
  const [mode, setModeState] = useState<ThemeMode>('light');

  // Load on mount
  useEffect(() => {
    getSettings().then((s) => {
      const v: ThemeVariant = s.themeVariant ?? 'light';
      const m: ThemeMode = s.themeMode ?? 'light';
      setVariantState(v);
      setModeState(m);
      const effective = m === 'system'
        ? resolveEffectiveVariant(v, window.matchMedia('(prefers-color-scheme: dark)').matches)
        : v;
      applyThemeVariant(effective);
    });
  }, []);

  const setVariant = useCallback(async (newVariant: ThemeVariant) => {
    setVariantState(newVariant);
    const settings = await getSettings();
    await saveSettings({ ...settings, themeVariant: newVariant });
    const effective = mode === 'system'
      ? resolveEffectiveVariant(newVariant, window.matchMedia('(prefers-color-scheme: dark)').matches)
      : newVariant;
    applyThemeVariant(effective);
  }, [mode]);

  const setMode = useCallback(async (newMode: ThemeMode) => {
    setModeState(newMode);
    const settings = await getSettings();
    await saveSettings({ ...settings, themeMode: newMode });
    const effective = newMode === 'system'
      ? resolveEffectiveVariant(variant, window.matchMedia('(prefers-color-scheme: dark)').matches)
      : variant;
    applyThemeVariant(effective);
  }, [variant]);

  return {
    variant,
    mode,
    setVariant,
    setMode,
    available: Object.values(THEME_VARIANTS).map(p => ({ id: p.name as ThemeVariant, label: p.label, description: p.description })),
  };
}
