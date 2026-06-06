/**
 * ColorMixer.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { ColorMixer } from '../ColorMixer';

const red = { r: 255, g: 0, b: 0 };
const blue = { r: 0, g: 0, b: 255 };

describe('ColorMixer — mix', () => {
  it('midpoint', () => {
    const m = ColorMixer.mix(red, blue, 0.5);
    expect(m.r).toBe(128);
    expect(m.b).toBe(128);
  });

  it('endpoints', () => {
    expect(ColorMixer.mix(red, blue, 0).r).toBe(255);
    expect(ColorMixer.mix(red, blue, 1).b).toBe(255);
  });
});

describe('ColorMixer — lighten/darken', () => {
  it('lighten moves toward white', () => {
    const c = ColorMixer.lighten(red, 0.5);
    expect(c.r).toBe(255);
    expect(c.g).toBe(128);
  });

  it('darken moves toward black', () => {
    const c = ColorMixer.darken(red, 0.5);
    expect(c.r).toBe(128);
    expect(c.g).toBe(0);
  });
});

describe('ColorMixer — saturate/desaturate', () => {
  it('saturate red to 100', () => {
    const c = ColorMixer.saturate({ r: 200, g: 100, b: 100 }, 0.5);
    expect(c).toBeDefined();
  });

  it('desaturate', () => {
    const c = ColorMixer.desaturate(red, 0.5);
    expect(c).toBeDefined();
  });
});

describe('ColorMixer — invert/complement', () => {
  it('invert', () => {
    const c = ColorMixer.invert(red);
    expect(c.r).toBe(0);
    expect(c.g).toBe(255);
  });

  it('complement', () => {
    const c = ColorMixer.complement(red);
    expect(c).toBeDefined();
  });
});

describe('ColorMixer — luminance/contrast', () => {
  it('white luminance is 1', () => {
    expect(ColorMixer.luminance({ r: 255, g: 255, b: 255 })).toBeCloseTo(1, 3);
  });

  it('black luminance is 0', () => {
    expect(ColorMixer.luminance({ r: 0, g: 0, b: 0 })).toBe(0);
  });

  it('contrast B/W is 21', () => {
    expect(ColorMixer.contrast({ r: 255, g: 255, b: 255 }, { r: 0, g: 0, b: 0 })).toBeCloseTo(21, 0);
  });
});

describe('ColorMixer — schemes', () => {
  it('triadic', () => {
    const [a, b, c] = ColorMixer.triadic(red);
    expect(a).toEqual(red);
    expect(b).toBeDefined();
    expect(c).toBeDefined();
  });

  it('splitComplement', () => {
    const colors = ColorMixer.splitComplement(red);
    expect(colors.length).toBe(3);
  });

  it('analogous', () => {
    const colors = ColorMixer.analogous(red, 5);
    expect(colors.length).toBe(5);
  });
});

describe('ColorMixer — grayscale', () => {
  it('gray', () => {
    const g = ColorMixer.grayscale(red);
    expect(g.r).toBe(g.g);
    expect(g.g).toBe(g.b);
  });
});
