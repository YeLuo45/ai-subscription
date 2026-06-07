/**
 * Trigonometry.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Trigonometry } from '../Trigonometry';

describe('Trigonometry — conversion', () => {
  it('degToRad 180', () => {
    expect(Trigonometry.degToRad(180)).toBeCloseTo(Math.PI, 5);
  });

  it('radToDeg pi', () => {
    expect(Trigonometry.radToDeg(Math.PI)).toBeCloseTo(180, 5);
  });

  it('normalize', () => {
    expect(Trigonometry.normalize(7)).toBeCloseTo(7 - 2 * Math.PI, 5);
  });

  it('normalizeSym', () => {
    // 3*pi - 2*pi = pi (within [-pi, pi])
    expect(Trigonometry.normalizeSym(3 * Math.PI)).toBeCloseTo(-Math.PI, 5);
  });
});

describe('Trigonometry — deg versions', () => {
  it('sinD 90', () => {
    expect(Trigonometry.sinD(90)).toBeCloseTo(1, 5);
  });

  it('cosD 0', () => {
    expect(Trigonometry.cosD(0)).toBeCloseTo(1, 5);
  });

  it('tanD 45', () => {
    expect(Trigonometry.tanD(45)).toBeCloseTo(1, 5);
  });

  it('asinD 0.5', () => {
    expect(Trigonometry.asinD(0.5)).toBeCloseTo(30, 5);
  });

  it('atan2D', () => {
    expect(Trigonometry.atan2D(1, 0)).toBeCloseTo(90, 5);
  });
});

describe('Trigonometry — laws', () => {
  it('lawOfCosinesC 3-4-90', () => {
    expect(Trigonometry.lawOfCosinesC(3, 4, 90)).toBeCloseTo(5, 5);
  });

  it('lawOfSinesB', () => {
    // Triangle with A=30, a=5, B=60 -> b = 5 * sin(60)/sin(30) = 5 * sqrt(3) / 1 ~ 8.66
    expect(Trigonometry.lawOfSinesB(5, 30, 60)).toBeCloseTo(8.66, 1);
  });

  it('hypotenuse 3-4', () => {
    expect(Trigonometry.hypotenuse(3, 4)).toBe(5);
  });
});
