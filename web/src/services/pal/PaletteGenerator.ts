/**
 * PaletteGenerator — color palette generation
 *
 * Inspired by: chroma-js scale / colorbrewer
 *
 * Generate palettes:
 *   - Sequential
 *   - Diverging
 *   - Qualitative
 *   - Pastel / Random
 */

import { type RGB } from '../cspace/ColorSpace';
import { ColorSpace } from '../cspace/ColorSpace';

export type PaletteType = 'sequential' | 'diverging' | 'qualitative' | 'random' | 'pastel';

export class PaletteGenerator {
  /**
   * Generate palette of N colors between two anchor colors.
   */
  static sequential(start: RGB, end: RGB, count: number): RGB[] {
    const result: RGB[] = [];
    for (let i = 0; i < count; i++) {
      const ratio = count === 1 ? 0 : i / (count - 1);
      result.push(this.lerp(start, end, ratio));
    }
    return result;
  }

  /**
   * Diverging palette: 3 anchors (low, mid, high).
   */
  static diverging(low: RGB, mid: RGB, high: RGB, count: number): RGB[] {
    const halfCount = Math.ceil(count / 2);
    const lower = this.sequential(low, mid, halfCount);
    const upper = this.sequential(mid, high, count - halfCount + 1).slice(1);
    return [...lower, ...upper];
  }

  /**
   * Qualitative palette with HSL hue rotation.
   */
  static qualitative(base: RGB, count: number): RGB[] {
    const result: RGB[] = [];
    const hueStep = 360 / count;
    for (let i = 0; i < count; i++) {
      const hsl = ColorSpace.rgbToHsl(base);
      hsl.h = (hsl.h + i * hueStep) % 360;
      result.push(ColorSpace.hslToRgb(hsl));
    }
    return result;
  }

  /**
   * Generate random palette.
   */
  static random(count: number, seed?: number): RGB[] {
    const rng = seed !== undefined ? this.seededRng(seed) : Math.random;
    const result: RGB[] = [];
    for (let i = 0; i < count; i++) {
      result.push({
        r: Math.floor(rng() * 256),
        g: Math.floor(rng() * 256),
        b: Math.floor(rng() * 256),
      });
    }
    return result;
  }

  /**
   * Pastel palette (high lightness, low saturation).
   */
  static pastel(count: number, seed?: number): RGB[] {
    const rng = seed !== undefined ? this.seededRng(seed) : Math.random;
    const result: RGB[] = [];
    for (let i = 0; i < count; i++) {
      result.push({
        r: Math.floor(rng() * 128) + 128,
        g: Math.floor(rng() * 128) + 128,
        b: Math.floor(rng() * 128) + 128,
      });
    }
    return result;
  }

  /**
   * Material Design palette (hue-only, fixed saturation/lightness).
   */
  static material(hue: number, count: number = 10): RGB[] {
    const result: RGB[] = [];
    const saturations = [0.95, 0.9, 0.85, 0.8, 0.75, 0.7, 0.65, 0.6, 0.55, 0.5];
    const lightnesses = [0.2, 0.27, 0.34, 0.41, 0.48, 0.55, 0.62, 0.69, 0.76, 0.83];
    for (let i = 0; i < count && i < saturations.length; i++) {
      result.push({
        r: Math.round(this.hslToRgbComponent(hue, saturations[i], lightnesses[i])),
        g: 0,
        b: 0,
      });
    }
    // Convert each hsl result to RGB properly
    return saturations.slice(0, count).map((s, i) => {
      const l = lightnesses[i] ?? 0.5;
      return ColorSpace.hslToRgb({ h: hue, s: s * 100, l: l * 100 });
    });
  }

  /**
   * Shade palette: same hue, varied lightness.
   */
  static shades(base: RGB, count: number = 10): RGB[] {
    const hsl = ColorSpace.rgbToHsl(base);
    const result: RGB[] = [];
    for (let i = 0; i < count; i++) {
      const l = 10 + (i * 80) / (count - 1);
      result.push(ColorSpace.hslToRgb({ h: hsl.h, s: hsl.s, l }));
    }
    return result;
  }

  /**
   * Tint palette: same hue, mixed with white.
   */
  static tints(base: RGB, count: number = 10): RGB[] {
    const white: RGB = { r: 255, g: 255, b: 255 };
    return this.sequential(base, white, count);
  }

  /**
   * Tone palette: same hue, mixed with gray.
   */
  static tones(base: RGB, count: number = 10): RGB[] {
    const gray: RGB = { r: 128, g: 128, b: 128 };
    return this.sequential(base, gray, count);
  }

  private static lerp(a: RGB, b: RGB, t: number): RGB {
    return {
      r: Math.round(a.r + (b.r - a.r) * t),
      g: Math.round(a.g + (b.g - a.g) * t),
      b: Math.round(a.b + (b.b - a.b) * t),
    };
  }

  private static hslToRgbComponent(h: number, s: number, l: number): number {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    return Math.round(c * 255);
  }

  private static seededRng(seed: number): () => number {
    let s = seed;
    return () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  }
}
