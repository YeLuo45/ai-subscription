/**
 * Color.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Color } from '../Color';

describe('Color — hex/rgb', () => {
  it('hexToRgb', () => {
    expect(Color.hexToRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 });
  });

  it('hexToRgb short', () => {
    expect(Color.hexToRgb('#f00')).toEqual({ r: 255, g: 0, b: 0 });
  });

  it('rgbToHex', () => {
    expect(Color.rgbToHex({ r: 255, g: 0, b: 0 })).toBe('#ff0000');
  });

  it('roundtrip', () => {
    const hex = '#abc123';
    expect(Color.rgbToHex(Color.hexToRgb(hex))).toBe(hex);
  });

  it('invalid hex', () => {
    expect(() => Color.hexToRgb('#xy')).toThrow();
  });
});

describe('Color — hsl', () => {
  it('rgbToHsl red', () => {
    const hsl = Color.rgbToHsl({ r: 255, g: 0, b: 0 });
    expect(hsl.h).toBeCloseTo(0, 0);
    expect(hsl.s).toBeCloseTo(100, 0);
  });

  it('rgbToHsl white', () => {
    const hsl = Color.rgbToHsl({ r: 255, g: 255, b: 255 });
    expect(hsl.l).toBe(100);
  });

  it('rgbToHsl black', () => {
    const hsl = Color.rgbToHsl({ r: 0, g: 0, b: 0 });
    expect(hsl.l).toBe(0);
  });

  it('hslToRgb', () => {
    const rgb = Color.hslToRgb({ h: 0, s: 100, l: 50 });
    expect(rgb.r).toBeCloseTo(255, 0);
  });
});

describe('Color — hsv', () => {
  it('rgbToHsv', () => {
    const hsv = Color.rgbToHsv({ r: 255, g: 0, b: 0 });
    expect(hsv.h).toBeCloseTo(0, 0);
    expect(hsv.v).toBe(100);
  });
});

describe('Color — cmyk', () => {
  it('rgbToCmyk red', () => {
    const c = Color.rgbToCmyk({ r: 255, g: 0, b: 0 });
    expect(c.m).toBe(100);
    expect(c.y).toBe(100);
    expect(c.k).toBe(0);
  });

  it('rgbToCmyk white', () => {
    const c = Color.rgbToCmyk({ r: 255, g: 255, b: 255 });
    expect(c.k).toBe(0);
  });

  it('rgbToCmyk black', () => {
    const c = Color.rgbToCmyk({ r: 0, g: 0, b: 0 });
    expect(c.k).toBe(100);
  });
});

describe('Color — utils', () => {
  it('lighten', () => {
    const lighter = Color.lighten('#888888', 10);
    expect(lighter).not.toBe('#888888');
  });

  it('darken', () => {
    const darker = Color.lighten('#888888', -10);
    expect(darker).not.toBe('#888888');
  });

  it('mix', () => {
    const m = Color.mix('#000000', '#ffffff', 50);
    expect(m).toBe('#808080');
  });

  it('luminance', () => {
    expect(Color.luminance({ r: 255, g: 255, b: 255 })).toBeCloseTo(1, 2);
    expect(Color.luminance({ r: 0, g: 0, b: 0 })).toBe(0);
  });

  it('contrastRatio', () => {
    const cr = Color.contrastRatio({ r: 255, g: 255, b: 255 }, { r: 0, g: 0, b: 0 });
    expect(cr).toBeCloseTo(21, 0);
  });
});
