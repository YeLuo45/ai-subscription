/**
 * Sequence — arithmetic and geometric sequences
 */

export class Sequence {
  /**
   * Generate arithmetic sequence: a, a+d, a+2d, ...
   */
  static arithmetic(a: number, d: number, n: number): number[] {
    const result: number[] = [];
    for (let i = 0; i < n; i++) result.push(a + i * d);
    return result;
  }

  /**
   * Sum of arithmetic sequence.
   */
  static arithmeticSum(a: number, d: number, n: number): number {
    return (n * (2 * a + (n - 1) * d)) / 2;
  }

  /**
   * Generate geometric sequence: a, ar, ar^2, ...
   */
  static geometric(a: number, r: number, n: number): number[] {
    const result: number[] = [];
    let v = a;
    for (let i = 0; i < n; i++) {
      result.push(v);
      v *= r;
    }
    return result;
  }

  /**
   * Sum of geometric sequence.
   */
  static geometricSum(a: number, r: number, n: number): number {
    if (r === 1) return a * n;
    return (a * (1 - r ** n)) / (1 - r);
  }

  /**
   * Infinite geometric series sum (|r| < 1).
   */
  static geometricSumInf(a: number, r: number): number | null {
    if (Math.abs(r) >= 1) return null;
    return a / (1 - r);
  }

  /**
   * Find n-th term of arithmetic.
   */
  static arithmeticNth(a: number, d: number, n: number): number {
    return a + (n - 1) * d;
  }

  /**
   * Find n-th term of geometric.
   */
  static geometricNth(a: number, r: number, n: number): number {
    return a * r ** (n - 1);
  }

  /**
   * Fibonacci (n terms).
   */
  static fibonacci(n: number): number[] {
    if (n <= 0) return [];
    if (n === 1) return [0];
    const result = [0, 1];
    for (let i = 2; i < n; i++) {
      result.push(result[i - 1] + result[i - 2]);
    }
    return result;
  }

  /**
   * Triangular numbers.
   */
  static triangular(n: number): number[] {
    const r: number[] = [];
    for (let i = 1; i <= n; i++) r.push((i * (i + 1)) / 2);
    return r;
  }

  /**
   * Square numbers.
   */
  static squares(n: number): number[] {
    const r: number[] = [];
    for (let i = 1; i <= n; i++) r.push(i * i);
    return r;
  }
}
