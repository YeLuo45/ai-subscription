/**
 * ColorSpace.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { ColorSpace } from '../ColorSpace';

describe('ColorSpace — HEX <-> RGB', () => {
  it('hex to rgb', () => {
    const rgb = ColorSpace.hexToRgb('#ff0000');
    expect(rgb?.r).toBe(255);
    expect(rgb?.g).toBe(0);
    expect(rgb?.b).toBe(0);
  });

  it('hex 3-digit shorthand', () => {
    const rgb = ColorSpace.hexToRgb('#f00');
    expect(rgb?.r).toBe(255);
  });

  it('invalid hex', () => {
    expect(ColorSpace.hexToRgb('xyz')).toBe(null);
  });

  it('rgb to hex', () => {
    expect(ColorSpace.rgbToHex({ r: 255, g: 0, b: 0 })).toBe('#ff0000');
  });
});

describe('ColorSpace — RGB <-> HSL', () => {
  it('red to hsl', () => {
    const hsl = ColorSpace.rgbToHsl({ r: 255, g: 0, b: 0 });
    expect(hsl.h).toBe(0);
    expect(hsl.s).toBe(100);
    expect(hsl.l).toBe(50);
  });

  it('hsl to red', () => {
    const rgb = ColorSpace.hslToRgb({ h: 0, s: 100, l: 50 });
    expect(rgb.r).toBe(255);
    expect(rgb.g).toBe(0);
    expect(rgb.b).toBe(0);
  });

  it('green to hsl', () => {
    const hsl = ColorSpace.rgbToHsl({ r: 0, g: 255, b: 0 });
    expect(hsl.h).toBe(120);
  });

  it('hsl gray', () => {
    const rgb = ColorSpace.hslToRgb({ h: 0, s: 0, l: 50 });
    expect(rgb.r).toBe(rgb.g);
    expect(rgb.g).toBe(rgb.b);
  });
});

describe('ColorSpace — RGB <-> HSV', () => {
  it('red to hsv', () => {
    const hsv = ColorSpace.rgbToHsv({ r: 255, g: 0, b: 0 });
    expect(hsv.h).toBe(0);
    expect(hsv.s).toBe(100);
    expect(hsv.v).toBe(100);
  });

  it('hsv to blue', () => {
    const rgb = ColorSpace.hsvToRgb({ h: 240, s: 100, v: 100 });
    expect(rgb.b).toBe(255);
    expect(rgb.r).toBe(0);
  });

  it('black to hsv', () => {
    const hsv = ColorSpace.rgbToHsv({ r: 0, g: 0, b: 0 });
    expect(hsv.v).toBe(0);
  });
});

describe('ColorSpace — RGB <-> CMYK', () => {
  it('red to cmyk', () => {
    const c = ColorSpace.rgbToCmyk({ r: 255, g: 0, b: 0 });
    expect(c.c).toBe(0);
    expect(c.m).toBe(1);
    expect(c.y).toBe(1);
    expect(c.k).toBe(0);
  });

  it('white to cmyk', () => {
    const c = ColorSpace.rgbToCmyk({ r: 255, g: 255, b: 255 });
    expect(c.k).toBe(0);
  });

  it('black to cmyk', () => {
    const c = ColorSpace.rgbToCmyk({ r: 0, g: 0, b: 0 });
    expect(c.k).toBe(1);
  });

  it('cmyk to rgb', () => {
    const rgb = ColorSpace.cmykToRgb({ c: 0, m: 1, y: 1, k: 0 });
    expect(rgb.r).toBe(255);
    expect(rgb.g).toBe(0);
  });
});
