/**
 * Numerical — numerical methods
 */

export class Numerical {
  /**
   * Find root using bisection.
   */
  static bisection(fn: (x: number) => number, a: number, b: number, tol: number = 1e-10, maxIter: number = 100): number | null {
    let fa = fn(a);
    let fb = fn(b);
    if (fa * fb > 0) return null;
    let mid = 0;
    for (let i = 0; i < maxIter; i++) {
      mid = (a + b) / 2;
      const fmid = fn(mid);
      if (Math.abs(fmid) < tol || (b - a) / 2 < tol) return mid;
      if (fa * fmid < 0) {
        b = mid;
        fb = fmid;
      } else {
        a = mid;
        fa = fmid;
      }
    }
    return mid;
  }

  /**
   * Find root using Newton-Raphson.
   */
  static newton(fn: (x: number) => number, dfn: (x: number) => number, x0: number, tol: number = 1e-10, maxIter: number = 100): number | null {
    let x = x0;
    for (let i = 0; i < maxIter; i++) {
      const f = fn(x);
      if (Math.abs(f) < tol) return x;
      const fp = dfn(x);
      if (fp === 0) return null;
      x = x - f / fp;
    }
    return null;
  }

  /**
   * Find root using secant method.
   */
  static secant(fn: (x: number) => number, x0: number, x1: number, tol: number = 1e-10, maxIter: number = 100): number | null {
    let a = x0;
    let b = x1;
    for (let i = 0; i < maxIter; i++) {
      const fa = fn(a);
      const fb = fn(b);
      if (fb - fa === 0) return null;
      const x = b - fb * (b - a) / (fb - fa);
      if (Math.abs(fn(x)) < tol) return x;
      a = b;
      b = x;
    }
    return null;
  }

  /**
   * Numerical derivative.
   */
  static derivative(fn: (x: number) => number, x: number, h: number = 1e-7): number {
    return (fn(x + h) - fn(x - h)) / (2 * h);
  }

  /**
   * Trapezoidal integration.
   */
  static integrateTrap(fn: (x: number) => number, a: number, b: number, n: number = 100): number {
    const h = (b - a) / n;
    let sum = (fn(a) + fn(b)) / 2;
    for (let i = 1; i < n; i++) sum += fn(a + i * h);
    return sum * h;
  }

  /**
   * Simpson's rule integration.
   */
  static integrateSimpson(fn: (x: number) => number, a: number, b: number, n: number = 100): number {
    if (n % 2 === 1) n++;
    const h = (b - a) / n;
    let sum = fn(a) + fn(b);
    for (let i = 1; i < n; i++) {
      const x = a + i * h;
      sum += (i % 2 === 1 ? 4 : 2) * fn(x);
    }
    return sum * h / 3;
  }
}
