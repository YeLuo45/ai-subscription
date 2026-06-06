/**
 * PaletteGenerator.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { PaletteGenerator } from '../PaletteGenerator';

const red = { r: 255, g: 0, b: 0 };
const blue = { r: 0, g: 0, b: 255 };
const white = { r: 255, g: 255, b: 255 };

describe('PaletteGenerator — sequential', () => {
  it('count = 1', () => {
    const p = PaletteGenerator.sequential(red, blue, 1);
    expect(p.length).toBe(1);
  });

  it('count = 5', () => {
    const p = PaletteGenerator.sequential(red, blue, 5);
    expect(p.length).toBe(5);
    expect(p[0].r).toBe(255);
    expect(p[4].b).toBe(255);
  });
});

describe('PaletteGenerator — diverging', () => {
  it('generates from 3 anchors', () => {
    const p = PaletteGenerator.diverging(red, white, blue, 5);
    expect(p.length).toBe(5);
  });
});

describe('PaletteGenerator — qualitative', () => {
  it('count colors', () => {
    const p = PaletteGenerator.qualitative(red, 5);
    expect(p.length).toBe(5);
  });

  it('first is base', () => {
    const p = PaletteGenerator.qualitative(red, 3);
    expect(p[0].r).toBe(255);
  });
});

describe('PaletteGenerator — random/pastel', () => {
  it('random with seed', () => {
    const p = PaletteGenerator.random(5, 42);
    expect(p.length).toBe(5);
    // Same seed = same output
    const p2 = PaletteGenerator.random(5, 42);
    expect(p[0]).toEqual(p2[0]);
  });

  it('pastel', () => {
    const p = PaletteGenerator.pastel(5, 42);
    expect(p.length).toBe(5);
    expect(p[0].r).toBeGreaterThanOrEqual(128);
  });
});

describe('PaletteGenerator — material/shades', () => {
  it('material 5 colors', () => {
    const p = PaletteGenerator.material(200, 5);
    expect(p.length).toBe(5);
  });

  it('shades', () => {
    const p = PaletteGenerator.shades(red, 5);
    expect(p.length).toBe(5);
  });

  it('tints', () => {
    const p = PaletteGenerator.tints(red, 5);
    expect(p[0]).toEqual(red);
  });

  it('tones', () => {
    const p = PaletteGenerator.tones(red, 5);
    expect(p.length).toBe(5);
  });
});
