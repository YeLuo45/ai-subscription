/**
 * themeRegistry.test.ts — Theme variant registry tests
 */

import { describe, it, expect } from 'vitest';
import { THEME_VARIANTS, THEME_VARIANT_ORDER, applyThemeVariant, getCurrentThemeVariant, resolveEffectiveVariant } from '../themeRegistry';

describe('THEME_VARIANTS — structure', () => {
  it('has 6 variants', () => {
    expect(Object.keys(THEME_VARIANTS).length).toBe(6);
  });

  it('variant order has 6', () => {
    expect(THEME_VARIANT_ORDER.length).toBe(6);
  });

  it('all variants have required fields', () => {
    for (const v of Object.values(THEME_VARIANTS)) {
      expect(v.name).toBeTruthy();
      expect(v.label).toBeTruthy();
      expect(v.description).toBeTruthy();
      expect(v.cssVars['--color-bg']).toBeTruthy();
      expect(v.cssVars['--color-text']).toBeTruthy();
      expect(v.cssVars['--color-primary']).toBeTruthy();
    }
  });

  it('all variants have same number of CSS vars', () => {
    const counts = Object.values(THEME_VARIANTS).map((v) => Object.keys(v.cssVars).length);
    const set = new Set(counts);
    expect(set.size).toBe(1);
  });
});

describe('THEME_VARIANTS — specific palettes', () => {
  it('light: white bg', () => {
    expect(THEME_VARIANTS.light.cssVars['--color-bg']).toBe('#ffffff');
  });

  it('dark: dark bg', () => {
    expect(THEME_VARIANTS.dark.cssVars['--color-bg']).toMatch(/^#[0-9a-f]{2}[0-9a-f]/i);
  });

  it('sepia: warm tone', () => {
    expect(THEME_VARIANTS.sepia.cssVars['--color-bg']).toMatch(/#f4ecd8/i);
  });

  it('nord: arctic blue', () => {
    expect(THEME_VARIANTS.nord.cssVars['--color-bg']).toBe('#2e3440');
  });

  it('solarized: warm cream', () => {
    expect(THEME_VARIANTS.solarized.cssVars['--color-bg']).toBe('#fdf6e3');
  });

  it('catppuccin: dark mocha', () => {
    expect(THEME_VARIANTS.catppuccin.cssVars['--color-bg']).toBe('#1e1e2e');
  });
});

describe('applyThemeVariant', () => {
  it('sets data-theme-variant attribute', () => {
    const root = document.createElement('div');
    applyThemeVariant('nord', root);
    expect(root.getAttribute('data-theme-variant')).toBe('nord');
  });

  it('sets CSS variables', () => {
    const root = document.createElement('div');
    applyThemeVariant('sepia', root);
    expect(root.style.getPropertyValue('--color-bg')).toBe('#f4ecd8');
  });

  it('overrides previous variant', () => {
    const root = document.createElement('div');
    applyThemeVariant('dark', root);
    applyThemeVariant('light', root);
    expect(root.style.getPropertyValue('--color-bg')).toBe('#ffffff');
  });

  it('ignores unknown variant', () => {
    const root = document.createElement('div');
    applyThemeVariant('nonexistent' as any, root);
    expect(root.getAttribute('data-theme-variant')).toBe(null);
  });
});

describe('getCurrentThemeVariant', () => {
  it('returns current variant', () => {
    const root = document.createElement('div');
    root.setAttribute('data-theme-variant', 'catppuccin');
    expect(getCurrentThemeVariant(root)).toBe('catppuccin');
  });

  it('returns light as default', () => {
    const root = document.createElement('div');
    expect(getCurrentThemeVariant(root)).toBe('light');
  });
});

describe('resolveEffectiveVariant', () => {
  it('returns variant if no system dark', () => {
    expect(resolveEffectiveVariant('sepia', false)).toBe('sepia');
  });

  it('returns dark if variant is light and system prefers dark', () => {
    expect(resolveEffectiveVariant('light', true)).toBe('dark');
  });

  it('keeps variant if dark and system prefers dark', () => {
    expect(resolveEffectiveVariant('nord', true)).toBe('nord');
  });
});
