/**
 * StatisticsLite2 — advanced statistics
 */

export class StatisticsLite2 {
  /**
   * Skewness.
   */
  static skewness(values: number[]): number {
    if (values.length < 3) return 0;
    const n = values.length;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    let m2 = 0;
    let m3 = 0;
    for (const v of values) {
      const d = v - mean;
      m2 += d * d;
      m3 += d * d * d;
    }
    m2 /= n;
    m3 /= n;
    if (m2 === 0) return 0;
    return m3 / Math.pow(m2, 1.5);
  }

  /**
   * Kurtosis (excess).
   */
  static kurtosis(values: number[]): number {
    if (values.length < 4) return 0;
    const n = values.length;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    let m2 = 0;
    let m4 = 0;
    for (const v of values) {
      const d = v - mean;
      m2 += d * d;
      m4 += d * d * d * d;
    }
    m2 /= n;
    m4 /= n;
    if (m2 === 0) return 0;
    return m4 / (m2 * m2) - 3;
  }

  /**
   * Covariance.
   */
  static covariance(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;
    const n = x.length;
    const mx = x.reduce((a, b) => a + b, 0) / n;
    const my = y.reduce((a, b) => a + b, 0) / n;
    let s = 0;
    for (let i = 0; i < n; i++) s += (x[i] - mx) * (y[i] - my);
    return s / n;
  }

  /**
   * Sample covariance.
   */
  static covarianceSample(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length < 2) return 0;
    const n = x.length;
    const mx = x.reduce((a, b) => a + b, 0) / n;
    const my = y.reduce((a, b) => a + b, 0) / n;
    let s = 0;
    for (let i = 0; i < n; i++) s += (x[i] - mx) * (y[i] - my);
    return s / (n - 1);
  }

  /**
   * Sample variance.
   */
  static varianceSample(values: number[]): number {
    if (values.length < 2) return 0;
    const n = values.length;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    let s = 0;
    for (const v of values) s += (v - mean) ** 2;
    return s / (n - 1);
  }

  /**
   * Quartiles (Q1, Q2, Q3).
   */
  static quartiles(values: number[]): { q1: number; q2: number; q3: number } {
    if (values.length === 0) return { q1: 0, q2: 0, q3: 0 };
    const sorted = [...values].sort((a, b) => a - b);
    return {
      q1: StatisticsLite2.percentileSorted(sorted, 25),
      q2: StatisticsLite2.percentileSorted(sorted, 50),
      q3: StatisticsLite2.percentileSorted(sorted, 75),
    };
  }

  private static percentileSorted(sorted: number[], p: number): number {
    const idx = (p / 100) * (sorted.length - 1);
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) return sorted[lo];
    return sorted[lo] + (idx - lo) * (sorted[hi] - sorted[lo]);
  }

  /**
   * IQR (interquartile range).
   */
  static iqr(values: number[]): number {
    const q = StatisticsLite2.quartiles(values);
    return q.q3 - q.q1;
  }

  /**
   * Detect outliers (1.5 * IQR rule).
   */
  static outliers(values: number[]): number[] {
    const q = StatisticsLite2.quartiles(values);
    const range = q.q3 - q.q1;
    const lo = q.q1 - 1.5 * range;
    const hi = q.q3 + 1.5 * range;
    return values.filter((v) => v < lo || v > hi);
  }

  /**
   * Normalize to [0, 1] (min-max).
   */
  static minMax(values: number[]): number[] {
    if (values.length === 0) return [];
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (min === max) return values.map(() => 0);
    return values.map((v) => (v - min) / (max - min));
  }
}
