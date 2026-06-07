/**
 * Percent — percentage calculations
 */

export class Percent {
  /**
   * What is X% of Y?
   */
  static of(percent: number, value: number): number {
    return (percent / 100) * value;
  }

  /**
   * X is what % of Y?
   */
  static whatPercent(x: number, y: number): number {
    if (y === 0) return NaN;
    return (x / y) * 100;
  }

  /**
   * Percent change from old to new.
   */
  static change(oldVal: number, newVal: number): number {
    if (oldVal === 0) return newVal === 0 ? 0 : Infinity;
    return ((newVal - oldVal) / oldVal) * 100;
  }

  /**
   * Increase by X%.
   */
  static increase(value: number, percent: number): number {
    return value * (1 + percent / 100);
  }

  /**
   * Decrease by X%.
   */
  static decrease(value: number, percent: number): number {
    return value * (1 - percent / 100);
  }

  /**
   * Add value and its percentage to total.
   */
  static addPercent(value: number, percent: number): number {
    return value + Percent.of(percent, value);
  }

  /**
   * Subtract value and its percentage from total.
   */
  static subPercent(value: number, percent: number): number {
    return value - Percent.of(percent, value);
  }

  /**
   * Difference between two values as percent of average.
   */
  static diff(a: number, b: number): number {
    const avg = (a + b) / 2;
    if (avg === 0) return 0;
    return Math.abs(a - b) / avg * 100;
  }

  /**
   * Format percent.
   */
  static format(p: number, decimals: number = 2): string {
    return `${p.toFixed(decimals)}%`;
  }
}
