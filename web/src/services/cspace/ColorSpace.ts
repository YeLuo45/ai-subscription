/**
 * ColorSpace — color space conversions
 *
 * Inspired by: chroma-js
 *
 * Supports:
 *   - HEX <-> RGB
 *   - RGB <-> HSL
 *   - RGB <-> HSV
 *   - RGB <-> CMYK
 *   - HEX <-> CMYK
 */

export interface RGB { r: number; g: number; b: number; a?: number; }
export interface HSL { h: number; s: number; l: number; a?: number; }
export interface HSV { h: number; s: number; v: number; a?: number; }
export interface CMYK { c: number; m: number; y: number; k: number; a?: number; }

export class ColorSpace {
  // ============== HEX <-> RGB ==============
  static hexToRgb(hex: string): RGB | null {
    const m = hex.replace('#', '').match(/^([\da-f]{3}|[\da-f]{6}|[\da-f]{8})$/i);
    if (!m) return null;
    let s = m[1];
    if (s.length === 3) s = s.split('').map((c) => c + c).join('');
    return {
      r: parseInt(s.slice(0, 2), 16),
      g: parseInt(s.slice(2, 4), 16),
      b: parseInt(s.slice(4, 6), 16),
      a: s.length === 8 ? parseInt(s.slice(6, 8), 16) / 255 : 1,
    };
  }

  static rgbToHex(rgb: RGB): string {
    const toHex = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0');
    let h = `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
    if (rgb.a !== undefined && rgb.a < 1) h += toHex(rgb.a * 255);
    return h;
  }

  // ============== RGB <-> HSL ==============
  static rgbToHsl(rgb: RGB): HSL {
    const r = rgb.r / 255, g = rgb.g / 255, b = rgb.b / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    let h = 0, s = 0;
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
    return { h: h * 360, s: s * 100, l: l * 100, a: rgb.a };
  }

  static hslToRgb(hsl: HSL): RGB {
    const h = hsl.h / 360, s = hsl.s / 100, l = hsl.l / 100;
    if (s === 0) {
      const v = Math.round(l * 255);
      return { r: v, g: v, b: v, a: hsl.a };
    }
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
    return {
      r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
      g: Math.round(hue2rgb(p, q, h) * 255),
      b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
      a: hsl.a,
    };
  }

  // ============== RGB <-> HSV ==============
  static rgbToHsv(rgb: RGB): HSV {
    const r = rgb.r / 255, g = rgb.g / 255, b = rgb.b / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    const s = max === 0 ? 0 : d / max;
    const v = max;
    if (d !== 0) {
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return { h: h * 360, s: s * 100, v: v * 100, a: rgb.a };
  }

  static hsvToRgb(hsv: HSV): RGB {
    const h = hsv.h / 360, s = hsv.s / 100, v = hsv.v / 100;
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    const idx = i % 6;
    const r = [v, q, p, p, t, v][idx];
    const g = [t, v, v, q, p, p][idx];
    const b = [p, p, t, v, v, q][idx];
    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255),
      a: hsv.a,
    };
  }

  // ============== RGB <-> CMYK ==============
  static rgbToCmyk(rgb: RGB): CMYK {
    const r = rgb.r / 255, g = rgb.g / 255, b = rgb.b / 255;
    const k = 1 - Math.max(r, g, b);
    if (k === 1) return { c: 0, m: 0, y: 0, k: 1, a: rgb.a };
    const c = (1 - r - k) / (1 - k);
    const m = (1 - g - k) / (1 - k);
    const y = (1 - b - k) / (1 - k);
    return { c, m, y, k, a: rgb.a };
  }

  static cmykToRgb(cmyk: CMYK): RGB {
    const r = 255 * (1 - cmyk.c) * (1 - cmyk.k);
    const g = 255 * (1 - cmyk.m) * (1 - cmyk.k);
    const b = 255 * (1 - cmyk.y) * (1 - cmyk.k);
    return { r: Math.round(r), g: Math.round(g), b: Math.round(b), a: cmyk.a };
  }
}
