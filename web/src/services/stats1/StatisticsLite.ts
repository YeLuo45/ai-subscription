/**
 * StatisticsLite — basic statistics
 */

export class StatisticsLite {
  /**
   * Sum of values.
   */
  static sum(values: number[]): number {
    return values.reduce((a, b) => a + b, 0);
  }

  /**
   * Mean (average).
   */
  static mean(values: number[]): number {
    if (values.length === 0) return 0;
    return StatisticsLite.sum(values) / values.length;
  }

  /**
   * Median.
   */
  static median(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid];
  }

  /**
   * Mode (most frequent).
   */
  static mode(values: number[]): number[] {
    if (values.length === 0) return [];
    const counts = new Map<number, number>();
    for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
    let maxCount = 0;
    for (const c of counts.values()) if (c > maxCount) maxCount = c;
    if (maxCount === 1) return [];
    const result: number[] = [];
    for (const [v, c] of counts.entries()) if (c === maxCount) result.push(v);
    return result;
  }

  /**
   * Variance (population).
   */
  static variance(values: number[]): number {
    if (values.length === 0) return 0;
    const m = StatisticsLite.mean(values);
    const ss = values.reduce((acc, v) => acc + (v - m) ** 2, 0);
    return ss / values.length;
  }

  /**
   * Standard deviation (population).
   */
  static stdev(values: number[]): number {
    return Math.sqrt(StatisticsLite.variance(values));
  }

  /**
   * Min, max, mean, median, count in one.
   */
  static summary(values: number[]): { min: number; max: number; mean: number; median: number; count: number; sum: number; stdev: number } {
    return {
      min: values.length === 0 ? 0 : Math.min(...values),
      max: values.length === 0 ? 0 : Math.max(...values),
      mean: StatisticsLite.mean(values),
      median: StatisticsLite.median(values),
      count: values.length,
      sum: StatisticsLite.sum(values),
      stdev: StatisticsLite.stdev(values),
    };
  }

  /**
   * Percentile (0-100).
   */
  static percentile(values: number[], p: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const idx = (p / 100) * (sorted.length - 1);
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) return sorted[lo];
    return sorted[lo] + (idx - lo) * (sorted[hi] - sorted[lo]);
  }

  /**
   * Z-score normalization.
   */
  static zscore(values: number[]): number[] {
    const m = StatisticsLite.mean(values);
    const s = StatisticsLite.stdev(values);
    if (s === 0) return values.map(() => 0);
    return values.map((v) => (v - m) / s);
  }

  /**
   * Correlation coefficient.
   */
  static correlation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) return 0;
    const mx = StatisticsLite.mean(x);
    const my = StatisticsLite.mean(y);
    let num = 0, dx2 = 0, dy2 = 0;
    for (let i = 0; i < x.length; i++) {
      num += (x[i] - mx) * (y[i] - my);
      dx2 += (x[i] - mx) ** 2;
      dy2 += (y[i] - my) ** 2;
    }
    return num / Math.sqrt(dx2 * dy2);
  }
}
