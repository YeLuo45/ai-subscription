/**
 * Interpolate.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Interpolate } from '../Interpolate';

describe('Interpolate — basic', () => {
  it('linear', () => {
    expect(Interpolate.linear(0, 10, 0.5)).toBe(5);
  });

  it('linear endpoints', () => {
    expect(Interpolate.linear(0, 10, 0)).toBe(0);
    expect(Interpolate.linear(0, 10, 1)).toBe(10);
  });

  it('cosine', () => {
    expect(Interpolate.cosine(0, 10, 0.5)).toBeCloseTo(5, 5);
  });

  it('cubic', () => {
    expect(Interpolate.cubic(0, 0, 10, 10, 0.5)).toBeCloseTo(5, 0);
  });

  it('step', () => {
    expect(Interpolate.step(0, 10, 0.3)).toBe(0);
    expect(Interpolate.step(0, 10, 0.7)).toBe(10);
  });
});

describe('Interpolate — array', () => {
  it('lerpArray', () => {
    expect(Interpolate.lerpArray([0, 10, 20], 0.5)).toBe(10);
  });

  it('lerpArray t=0', () => {
    expect(Interpolate.lerpArray([0, 10, 20], 0)).toBe(0);
  });

  it('lerpArray t=1', () => {
    expect(Interpolate.lerpArray([0, 10, 20], 1)).toBe(20);
  });
});

describe('Interpolate — smooth', () => {
  it('clamp01', () => {
    expect(Interpolate.clamp01(-0.5)).toBe(0);
    expect(Interpolate.clamp01(1.5)).toBe(1);
  });

  it('smoothstep', () => {
    expect(Interpolate.smoothstep(0, 1, 0.5)).toBe(0.5);
    expect(Interpolate.smoothstep(0, 1, 0)).toBe(0);
    expect(Interpolate.smoothstep(0, 1, 1)).toBe(1);
  });

  it('smootherstep', () => {
    expect(Interpolate.smootherstep(0, 1, 0.5)).toBe(0.5);
  });
});
