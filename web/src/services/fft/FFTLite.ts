/**
 * FFTLite — Cooley-Tukey FFT
 */

type Complex = { re: number; im: number };

function c(re: number, im: number = 0): Complex { return { re, im }; }
function add(a: Complex, b: Complex): Complex { return c(a.re + b.re, a.im + b.im); }
function sub(a: Complex, b: Complex): Complex { return c(a.re - b.re, a.im - b.im); }
function mul(a: Complex, b: Complex): Complex { return c(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re); }

export class FFTLite {
  /**
   * Pad arr to next power of 2.
   */
  static padToPowerOfTwo(arr: number[]): number[] {
    let n = 1;
    while (n < arr.length) n *= 2;
    return [...arr, ...new Array(n - arr.length).fill(0)];
  }

  /**
   * FFT (iterative).
   */
  static fft(arr: Complex[]): Complex[] {
    const n = arr.length;
    if (n <= 1) return arr;
    // bit reversal
    const a = [...arr];
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) [a[i], a[j]] = [a[j], a[i]];
    }
    for (let len = 2; len <= n; len *= 2) {
      const ang = -2 * Math.PI / len;
      const wlen = c(Math.cos(ang), Math.sin(ang));
      for (let i = 0; i < n; i += len) {
        let w = c(1, 0);
        for (let j = 0; j < len / 2; j++) {
          const u = a[i + j];
          const v = mul(w, a[i + j + len / 2]);
          a[i + j] = add(u, v);
          a[i + j + len / 2] = sub(u, v);
          w = mul(w, wlen);
        }
      }
    }
    return a;
  }

  /**
   * Inverse FFT.
   */
  static ifft(arr: Complex[]): Complex[] {
    const n = arr.length;
    const conjugated = arr.map((x) => c(x.re, -x.im));
    const result = FFTLite.fft(conjugated);
    return result.map((x) => c(x.re / n, -x.im / n));
  }

  /**
   * Real-only FFT (returns magnitudes).
   */
  static realFft(arr: number[]): number[] {
    const padded = FFTLite.padToPowerOfTwo(arr);
    const complex = padded.map((v) => c(v, 0));
    const result = FFTLite.fft(complex);
    return result.map((x) => Math.sqrt(x.re * x.re + x.im * x.im));
  }

  /**
   * Polynomial multiplication using FFT.
   */
  static polyMul(a: number[], b: number[]): number[] {
    const result: number[] = new Array(a.length + b.length - 1).fill(0);
    for (let i = 0; i < a.length; i++) {
      for (let j = 0; j < b.length; j++) {
        result[i + j] += a[i] * b[j];
      }
    }
    return result;
  }
}
