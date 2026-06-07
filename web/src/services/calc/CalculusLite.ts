/**
 * CalculusLite — symbolic calculus
 *
 * Polynomials only.
 */

export class CalculusLite {
  /**
   * Symbolic derivative of polynomial coefficients (ascending order).
   */
  static derivative(coeffs: number[]): number[] {
    return coeffs.map((c, i) => c * i).slice(1);
  }

  /**
   * Symbolic integral of polynomial coefficients (ascending order, C=0).
   */
  static integral(coeffs: number[]): number[] {
    return [0, ...coeffs.map((c, i) => c / (i + 1))];
  }

  /**
   * Evaluate derivative at point.
   */
  static derivativeAt(coeffs: number[], x: number): number {
    const d = CalculusLite.derivative(coeffs);
    let result = 0;
    for (let i = d.length - 1; i >= 0; i--) {
      result = result * x + d[i];
    }
    return result;
  }

  /**
   * Evaluate function at point.
   */
  static evaluate(coeffs: number[], x: number): number {
    let result = 0;
    for (let i = coeffs.length - 1; i >= 0; i--) {
      result = result * x + coeffs[i];
    }
    return result;
  }

  /**
   * Symbolic definite integral [a, b].
   */
  static integralDefinite(coeffs: number[], a: number, b: number): number {
    const icoeffs = CalculusLite.integral(coeffs);
    return CalculusLite.evaluate(icoeffs, b) - CalculusLite.evaluate(icoeffs, a);
  }

  /**
   * Critical points (where derivative = 0).
   */
  static criticalPoints(coeffs: number[]): number[] {
    const d = CalculusLite.derivative(coeffs);
    if (d.length === 0) return [];
    if (d.length === 1) return [];
    // Quadratic: ax + b = 0 -> x = -b/a
    if (d.length === 2) {
      return [-d[0] / d[1]];
    }
    return [];
  }

  /**
   * Limits (numerical).
   */
  static limit(fn: (x: number) => number, x0: number, direction: 'left' | 'right' | 'both' = 'both'): number {
    const h = 1e-7;
    if (direction === 'left') return fn(x0 - h);
    if (direction === 'right') return fn(x0 + h);
    return (fn(x0 + h) + fn(x0 - h)) / 2;
  }

  /**
   * Check if sequence converges (numerical).
   */
  static converges(fn: (n: number) => number, threshold: number = 1e-6): boolean {
    let prev = fn(1);
    for (let i = 2; i < 100; i++) {
      const cur = fn(i);
      if (Math.abs(cur - prev) < threshold) return true;
      prev = cur;
    }
    return false;
  }
}
