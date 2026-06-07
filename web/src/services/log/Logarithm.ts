/**
 * Logarithm — log utilities
 */

export class Logarithm {
  /**
   * Change of base.
   */
  static logBase(x: number, base: number): number {
    if (x <= 0 || base <= 0 || base === 1) return NaN;
    return Math.log(x) / Math.log(base);
  }

  /**
   * log2
   */
  static log2(x: number): number { return Math.log2(x); }

  /**
   * log10
   */
  static log10(x: number): number { return Math.log10(x); }

  /**
   * Natural log.
   */
  static ln(x: number): number { return Math.log(x); }

  /**
   * log(1 + x) for small x (numerically stable).
   */
  static log1p(x: number): number { return Math.log1p(x); }

  /**
   * exp(x) - 1 stable.
   */
  static expm1(x: number): number { return Math.expm1(x); }

  /**
   * e^x.
   */
  static exp(x: number): number { return Math.exp(x); }

  /**
   * 2^x.
   */
  static exp2(x: number): number { return Math.pow(2, x); }

  /**
   * 10^x.
   */
  static exp10(x: number): number { return Math.pow(10, x); }

  /**
   * Power with non-integer exponent: x^y.
   */
  static pow(x: number, y: number): number { return Math.pow(x, y); }

  /**
   * Log of product = log(a) + log(b).
   */
  static logProduct(a: number, b: number): number {
    return Math.log(a) + Math.log(b);
  }

  /**
   * Log of quotient = log(a) - log(b).
   */
  static logQuotient(a: number, b: number): number {
    return Math.log(a) - Math.log(b);
  }
}
