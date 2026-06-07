/**
 * PolynomialFit — polynomial regression
 */

export class PolynomialFit {
  /**
   * Linear regression y = ax + b.
   * Returns { a, b, r2 }.
   */
  static linear(x: number[], y: number[]): { a: number; b: number; r2: number } {
    const n = x.length;
    if (n !== y.length || n === 0) throw new Error('Length mismatch');
    const sx = x.reduce((a, b) => a + b, 0);
    const sy = y.reduce((a, b) => a + b, 0);
    const sxy = x.reduce((a, x, i) => a + x * y[i], 0);
    const sxx = x.reduce((a, x) => a + x * x, 0);
    const aVal = (n * sxy - sx * sy) / (n * sxx - sx * sx);
    const bVal = (sy - aVal * sx) / n;
    const mean = sy / n;
    const ssTot = y.reduce((a, y) => a + (y - mean) ** 2, 0);
    const ssRes = y.reduce((a, y, i) => a + (y - (aVal * x[i] + bVal)) ** 2, 0);
    const r2 = 1 - ssRes / ssTot;
    return { a: aVal, b: bVal, r2 };
  }

  /**
   * Quadratic regression y = ax^2 + bx + c.
   */
  static quadratic(x: number[], y: number[]): { a: number; b: number; c: number } {
    const n = x.length;
    if (n !== y.length || n < 3) throw new Error('Need at least 3 points');
    let sx = 0, sx2 = 0, sx3 = 0, sx4 = 0;
    let sy = 0, sxy = 0, sx2y = 0;
    for (let i = 0; i < n; i++) {
      const xi = x[i];
      const yi = y[i];
      sx += xi;
      sx2 += xi * xi;
      sx3 += xi ** 3;
      sx4 += xi ** 4;
      sy += yi;
      sxy += xi * yi;
      sx2y += xi * xi * yi;
    }
    // Solve 3x3 system via Cramer's rule
    // System columns: [n, sx, sx2], unknown order: [c, b, a]
    const det = (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) =>
      a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
    const m = det(n, sx, sx2, sx, sx2, sx3, sx2, sx3, sx4);
    const mc = det(sy, sx, sx2, sxy, sx2, sx3, sx2y, sx3, sx4);
    const mb = det(n, sy, sx2, sx, sxy, sx3, sx2, sx2y, sx4);
    const ma = det(n, sx, sy, sx, sx2, sxy, sx2, sx3, sx2y);
    return { a: ma / m, b: mb / m, c: mc / m };
  }

  /**
   * Mean of y.
   */
  static mean(y: number[]): number {
    if (y.length === 0) return 0;
    return y.reduce((a, b) => a + b, 0) / y.length;
  }
}
