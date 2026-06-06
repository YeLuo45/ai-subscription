/**
 * ColorMixer — color blending and manipulation
 *
 * Inspired by: chroma-js mix
 *
 * - Mix two colors
 * - Lighten/darken
 * - Saturate/desaturate
 * - Invert/complement
 * - Get luminance/contrast ratio
 */

import { ColorSpace, type RGB } from '../cspace/ColorSpace';

export class ColorMixer {
  /**
   * Linear interpolation between two RGB colors.
   */
  static mix(a: RGB, b: RGB, ratio: number = 0.5): RGB {
    const r = ratio < 0 ? 0 : ratio > 1 ? 1 : ratio;
    return {
      r: Math.round(a.r + (b.r - a.r) * r),
      g: Math.round(a.g + (b.g - a.g) * r),
      b: Math.round(a.b + (b.b - a.b) * r),
      a: (a.a ?? 1) * r + (b.a ?? 1) * (1 - r),
    };
  }

  /**
   * Lighten by amount (0-1).
   */
  static lighten(c: RGB, amount: number = 0.2): RGB {
    const white: RGB = { r: 255, g: 255, b: 255, a: c.a };
    return this.mix(c, white, amount);
  }

  /**
   * Darken by amount.
   */
  static darken(c: RGB, amount: number = 0.2): RGB {
    const black: RGB = { r: 0, g: 0, b: 0, a: c.a };
    return this.mix(c, black, amount);
  }

  /**
   * Saturate by amount (-1 to 1).
   */
  static saturate(c: RGB, amount: number = 0.1): RGB {
    const hsl = ColorSpace.rgbToHsl(c);
    hsl.s = Math.max(0, Math.min(100, hsl.s + amount * 100));
    return ColorSpace.hslToRgb(hsl);
  }

  /**
   * Desaturate by amount.
   */
  static desaturate(c: RGB, amount: number = 0.1): RGB {
    return this.saturate(c, -amount);
  }

  /**
   * Get complement (opposite hue).
   */
  static complement(c: RGB): RGB {
    const hsl = ColorSpace.rgbToHsl(c);
    hsl.h = (hsl.h + 180) % 360;
    return ColorSpace.hslToRgb(hsl);
  }

  /**
   * Invert (255 - value).
   */
  static invert(c: RGB): RGB {
    return { r: 255 - c.r, g: 255 - c.g, b: 255 - c.b, a: c.a };
  }

  /**
   * Get luminance (0-1) per WCAG.
   */
  static luminance(c: RGB): number {
    const channels = [c.r, c.g, c.b].map((v) => {
      const n = v / 255;
      return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  }

  /**
   * Get contrast ratio (1-21) per WCAG.
   */
  static contrast(c1: RGB, c2: RGB): number {
    const l1 = this.luminance(c1);
    const l2 = this.luminance(c2);
    const [bright, dark] = l1 > l2 ? [l1, l2] : [l2, l1];
    return (bright + 0.05) / (dark + 0.05);
  }

  /**
   * Rotate hue by degrees.
   */
  static rotateHue(c: RGB, degrees: number): RGB {
    const hsl = ColorSpace.rgbToHsl(c);
    hsl.h = (hsl.h + degrees + 360) % 360;
    return ColorSpace.hslToRgb(hsl);
  }

  /**
   * Generate triadic (3 evenly-spaced) colors.
   */
  static triadic(c: RGB): [RGB, RGB, RGB] {
    return [c, this.rotateHue(c, 120), this.rotateHue(c, 240)];
  }

  /**
   * Generate complementary + 2 split-complements.
   */
  static splitComplement(c: RGB): [RGB, RGB, RGB] {
    return [c, this.rotateHue(c, 150), this.rotateHue(c, 210)];
  }

  /**
   * Generate analogous colors.
   */
  static analogous(c: RGB, count: number = 3): RGB[] {
    const step = 30;
    const result: RGB[] = [];
    for (let i = 0; i < count; i++) {
      result.push(this.rotateHue(c, (i - Math.floor(count / 2)) * step));
    }
    return result;
  }

  /**
   * Get grayscale (luma).
   */
  static grayscale(c: RGB): RGB {
    const v = Math.round(0.299 * c.r + 0.587 * c.g + 0.114 * c.b);
    return { r: v, g: v, b: v, a: c.a };
  }
}
