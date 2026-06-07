/**
 * Color — color space conversions
 *
 * Inspired by: color-convert / chroma-js
 *
 * Supports: hex, rgb, hsl, hsv, cmyk
 */

export interface RGB { r: number; g: number; b: number; }
export interface HSL { h: number; s: number; l: number; }
export interface HSV { h: number; s: number; v: number; }
export interface CMYK { c: number; m: number; y: number; k: number; }

export class Color {
  /**
   * Parse hex to RGB.
   */
  static hexToRgb(hex: string): RGB {
    let h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    if (h.length !== 6) throw new Error('Invalid hex');
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    };
  }

  /**
   * RGB to hex.
   */
  static rgbToHex(rgb: RGB): string {
    const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
    return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
  }

  /**
   * RGB to HSL.
   */
  static rgbToHsl({ r, g, b }: RGB): HSL {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return { h: h * 360, s: s * 100, l: l * 100 };
  }

  /**
   * HSL to RGB.
   */
  static hslToRgb({ h, s, l }: HSL): RGB {
    h /= 360; s /= 100; l /= 100;
    let r: number, g: number, b: number;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return { r: r * 255, g: g * 255, b: b * 255 };
  }

  /**
   * RGB to HSV.
   */
  static rgbToHsv({ r, g, b }: RGB): HSV {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    const v = max;
    const s = max === 0 ? 0 : d / max;
    if (d !== 0) {
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return { h: h * 360, s: s * 100, v: v * 100 };
  }

  /**
   * RGB to CMYK.
   */
  static rgbToCmyk({ r, g, b }: RGB): CMYK {
    const rn = r / 255, gn = g / 255, bn = b / 255;
    const k = 1 - Math.max(rn, gn, bn);
    if (k === 1) return { c: 0, m: 0, y: 0, k: 100 };
    return {
      c: ((1 - rn - k) / (1 - k)) * 100,
      m: ((1 - gn - k) / (1 - k)) * 100,
      y: ((1 - bn - k) / (1 - k)) * 100,
      k: k * 100,
    };
  }

  /**
   * Lighten/darken HSL.
   */
  static lighten(hex: string, amount: number): string {
    const rgb = Color.hexToRgb(hex);
    const hsl = Color.rgbToHsl(rgb);
    hsl.l = Math.max(0, Math.min(100, hsl.l + amount));
    return Color.rgbToHex(Color.hslToRgb(hsl));
  }

  /**
   * Mix two colors.
   */
  static mix(a: string, b: string, weight: number = 50): string {
    const rgb1 = Color.hexToRgb(a);
    const rgb2 = Color.hexToRgb(b);
    const w = weight / 100;
    return Color.rgbToHex({
      r: rgb1.r * (1 - w) + rgb2.r * w,
      g: rgb1.g * (1 - w) + rgb2.g * w,
      b: rgb1.b * (1 - w) + rgb2.b * w,
    });
  }

  /**
   * Calculate relative luminance.
   */
  static luminance({ r, g, b }: RGB): number {
    const norm = (c: number) => {
      c /= 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * norm(r) + 0.7152 * norm(g) + 0.0722 * norm(b);
  }

  /**
   * Contrast ratio.
   */
  static contrastRatio(a: RGB, b: RGB): number {
    const l1 = Color.luminance(a);
    const l2 = Color.luminance(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }
}
