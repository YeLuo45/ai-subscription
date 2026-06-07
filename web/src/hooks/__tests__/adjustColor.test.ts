/**
 * adjustColor.test.ts — Personalization color adjust helper
 */

import { describe, it, expect } from 'vitest';
import { adjustColor } from '../../utils/color';

describe('adjustColor', () => {
  it('lightens', () => {
    const c = adjustColor('#808080', 10);
    expect(c).toBe('#8a8a8a');
  });

  it('darkens', () => {
    const c = adjustColor('#808080', -10);
    expect(c).toBe('#767676');
  });

  it('clamps to 255', () => {
    const c = adjustColor('#ffffff', 10);
    expect(c).toBe('#ffffff');
  });

  it('clamps to 0', () => {
    const c = adjustColor('#000000', -10);
    expect(c).toBe('#000000');
  });

  it('preserves non-hex input', () => {
    expect(adjustColor('rgb(1,2,3)', 10)).toBe('rgb(1,2,3)');
  });

  it('rounds channel values', () => {
    const c = adjustColor('#888888', 0);
    expect(c).toBe('#888888');
  });
});
