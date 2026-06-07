/**
 * ThemeRegistry — 6 套主题变体定义
 *
 * Each variant defines a complete CSS variable palette.
 * Inspired by: catppuccin / nord / solarized
 */

import type { ThemeVariant } from '../types';

export interface ThemePalette {
  name: string;
  label: string;
  description: string;
  cssVars: Record<string, string>;
}

export const THEME_VARIANTS: Record<ThemeVariant, ThemePalette> = {
  light: {
    name: 'light',
    label: 'Light',
    description: 'Clean default light theme',
    cssVars: {
      '--color-bg': '#ffffff',
      '--color-bg-secondary': '#fafafa',
      '--color-text': '#1f1f1f',
      '--color-text-secondary': '#595959',
      '--color-text-muted': '#8c8c8c',
      '--color-border': '#d9d9d9',
      '--color-primary': '#1890ff',
      '--color-primary-hover': '#40a9ff',
      '--color-success': '#52c41a',
      '--color-warning': '#faad14',
      '--color-error': '#ff4d4f',
      '--color-card': '#ffffff',
      '--color-card-header': '#fafafa',
      '--shadow-sm': '0 2px 4px rgba(0,0,0,0.08)',
      '--shadow-md': '0 4px 12px rgba(0,0,0,0.12)',
      '--shadow-lg': '0 8px 24px rgba(0,0,0,0.16)',
    },
  },
  dark: {
    name: 'dark',
    label: 'Dark',
    description: 'Modern dark theme',
    cssVars: {
      '--color-bg': '#1a1a1a',
      '--color-bg-secondary': '#141414',
      '--color-text': '#e8e8e8',
      '--color-text-secondary': '#b8b8b8',
      '--color-text-muted': '#707070',
      '--color-border': '#303030',
      '--color-primary': '#177ddc',
      '--color-primary-hover': '#1d8feb',
      '--color-success': '#49aa19',
      '--color-warning': '#d89614',
      '--color-error': '#dc4446',
      '--color-card': '#242424',
      '--color-card-header': '#1f1f1f',
      '--shadow-sm': '0 2px 4px rgba(0,0,0,0.2)',
      '--shadow-md': '0 4px 12px rgba(0,0,0,0.25)',
      '--shadow-lg': '0 8px 24px rgba(0,0,0,0.3)',
    },
  },
  sepia: {
    name: 'sepia',
    label: 'Sepia',
    description: 'Warm paper-like reading theme',
    cssVars: {
      '--color-bg': '#f4ecd8',
      '--color-bg-secondary': '#ebe1c6',
      '--color-text': '#5b4636',
      '--color-text-secondary': '#7d5a3c',
      '--color-text-muted': '#a08968',
      '--color-border': '#d4c4a0',
      '--color-primary': '#a0522d',
      '--color-primary-hover': '#8b4513',
      '--color-success': '#6b8e23',
      '--color-warning': '#cd853f',
      '--color-error': '#a52a2a',
      '--color-card': '#faf3e0',
      '--color-card-header': '#f0e5c8',
      '--shadow-sm': '0 2px 4px rgba(91,70,54,0.1)',
      '--shadow-md': '0 4px 12px rgba(91,70,54,0.15)',
      '--shadow-lg': '0 8px 24px rgba(91,70,54,0.2)',
    },
  },
  nord: {
    name: 'nord',
    label: 'Nord',
    description: 'Arctic, north-bluish clean palette',
    cssVars: {
      '--color-bg': '#2e3440',
      '--color-bg-secondary': '#3b4252',
      '--color-text': '#eceff4',
      '--color-text-secondary': '#e5e9f0',
      '--color-text-muted': '#7b88a1',
      '--color-border': '#434c5e',
      '--color-primary': '#88c0d0',
      '--color-primary-hover': '#8fbcbb',
      '--color-success': '#a3be8c',
      '--color-warning': '#ebcb8b',
      '--color-error': '#bf616a',
      '--color-card': '#3b4252',
      '--color-card-header': '#434c5e',
      '--shadow-sm': '0 2px 4px rgba(0,0,0,0.25)',
      '--shadow-md': '0 4px 12px rgba(0,0,0,0.32)',
      '--shadow-lg': '0 8px 24px rgba(0,0,0,0.4)',
    },
  },
  solarized: {
    name: 'solarized',
    label: 'Solarized',
    description: 'Precision colors for readability',
    cssVars: {
      '--color-bg': '#fdf6e3',
      '--color-bg-secondary': '#eee8d5',
      '--color-text': '#586e75',
      '--color-text-secondary': '#657b83',
      '--color-text-muted': '#93a1a1',
      '--color-border': '#d8d2bd',
      '--color-primary': '#268bd2',
      '--color-primary-hover': '#2aa198',
      '--color-success': '#859900',
      '--color-warning': '#b58900',
      '--color-error': '#dc322f',
      '--color-card': '#fbf2d4',
      '--color-card-header': '#eee8d5',
      '--shadow-sm': '0 2px 4px rgba(101,123,131,0.1)',
      '--shadow-md': '0 4px 12px rgba(101,123,131,0.15)',
      '--shadow-lg': '0 8px 24px rgba(101,123,131,0.2)',
    },
  },
  catppuccin: {
    name: 'catppuccin',
    label: 'Catppuccin',
    description: 'Soothing pastel theme (Mocha)',
    cssVars: {
      '--color-bg': '#1e1e2e',
      '--color-bg-secondary': '#181825',
      '--color-text': '#cdd6f4',
      '--color-text-secondary': '#bac2de',
      '--color-text-muted': '#6c7086',
      '--color-border': '#313244',
      '--color-primary': '#cba6f7',
      '--color-primary-hover': '#f5c2e7',
      '--color-success': '#a6e3a1',
      '--color-warning': '#f9e2af',
      '--color-error': '#f38ba8',
      '--color-card': '#11111b',
      '--color-card-header': '#181825',
      '--shadow-sm': '0 2px 4px rgba(0,0,0,0.3)',
      '--shadow-md': '0 4px 12px rgba(0,0,0,0.4)',
      '--shadow-lg': '0 8px 24px rgba(0,0,0,0.5)',
    },
  },
};

export const THEME_VARIANT_ORDER: ThemeVariant[] = [
  'light', 'dark', 'sepia', 'nord', 'solarized', 'catppuccin',
];

/**
 * Apply theme variant to document root.
 */
export function applyThemeVariant(variant: ThemeVariant, root: HTMLElement = document.documentElement): void {
  const palette = THEME_VARIANTS[variant];
  if (!palette) return;
  root.setAttribute('data-theme-variant', variant);
  for (const [k, v] of Object.entries(palette.cssVars)) {
    root.style.setProperty(k, v);
  }
}

/**
 * Get current applied theme variant.
 */
export function getCurrentThemeVariant(root: HTMLElement = document.documentElement): ThemeVariant {
  const v = root.getAttribute('data-theme-variant');
  if (v && v in THEME_VARIANTS) return v as ThemeVariant;
  return 'light';
}

/**
 * Get the dark-mode equivalent of a variant (used when system prefers dark).
 */
export function resolveEffectiveVariant(variant: ThemeVariant, systemPrefersDark: boolean): ThemeVariant {
  if (variant === 'system' as never) return systemPrefersDark ? 'dark' : 'light';
  if (variant === 'light' && systemPrefersDark) return 'dark';
  return variant;
}
