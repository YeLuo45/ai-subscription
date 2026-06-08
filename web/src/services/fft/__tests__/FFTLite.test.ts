/**
 * FFTLite.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { FFTLite } from '../FFTLite';

describe('FFTLite — basic', () => {
  it('pad to power of 2', () => {
    expect(FFTLite.padToPowerOfTwo([1, 2, 3]).length).toBe(4);
    expect(FFTLite.padToPowerOfTwo([1, 2, 3, 4, 5]).length).toBe(8);
  });

  it('FFT of impulse', () => {
    const r = FFTLite.fft([{ re: 1, im: 0 }, { re: 0, im: 0 }, { re: 0, im: 0 }, { re: 0, im: 0 }]);
    expect(r[0].re).toBeCloseTo(1, 5);
    expect(r[1].re).toBeCloseTo(1, 5);
  });

  it('IFFT identity', () => {
    const arr = [{ re: 1, im: 0 }, { re: 2, im: 0 }, { re: 3, im: 0 }, { re: 4, im: 0 }];
    const ft = FFTLite.fft(arr);
    const back = FFTLite.ifft(ft);
    expect(back[0].re).toBeCloseTo(1, 5);
    expect(back[3].re).toBeCloseTo(4, 5);
  });
});

describe('FFTLite — real', () => {
  it('realFft magnitudes', () => {
    const m = FFTLite.realFft([1, 0, 0, 0]);
    expect(m[0]).toBeCloseTo(1, 5);
  });

  it('realFft constant', () => {
    const m = FFTLite.realFft([5, 5, 5, 5]);
    // DC component = sum = 20
    expect(m[0]).toBeCloseTo(20, 5);
  });
});

describe('FFTLite — poly mul', () => {
  it('basic', () => {
    // (1 + x) * (1 + 2x) = 1 + 3x + 2x^2
    expect(FFTLite.polyMul([1, 1], [1, 2])).toEqual([1, 3, 2]);
  });

  it('zero poly', () => {
    expect(FFTLite.polyMul([0], [1, 2, 3])).toEqual([0, 0, 0]);
  });
});
