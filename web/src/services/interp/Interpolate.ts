/**
 * Interpolate — interpolation methods
 */

export class Interpolate {
  /**
   * Linear interpolation between a and b.
   */
  static linear(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  /**
   * Cosine interpolation (smoother).
   */
  static cosine(a: number, b: number, t: number): number {
    const mu = (1 - Math.cos(t * Math.PI)) / 2;
    return a * (1 - mu) + b * mu;
  }

  /**
   * Cubic interpolation.
   */
  static cubic(p0: number, p1: number, p2: number, p3: number, t: number): number {
    const t2 = t * t;
    const t3 = t2 * t;
    return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
  }

  /**
   * Step interpolation.
   */
  static step(a: number, b: number, t: number, threshold: number = 0.5): number {
    return t < threshold ? a : b;
  }

  /**
   * Linear interpolation across arrays.
   */
  static lerpArray(values: number[], t: number): number {
    if (values.length === 0) return 0;
    if (values.length === 1) return values[0];
    if (t <= 0) return values[0];
    if (t >= 1) return values[values.length - 1];
    const pos = t * (values.length - 1);
    const lo = Math.floor(pos);
    const hi = Math.ceil(pos);
    if (lo === hi) return values[lo];
    return Interpolate.linear(values[lo], values[hi], pos - lo);
  }

  /**
   * Clamp t to [0, 1].
   */
  static clamp01(t: number): number {
    return Math.max(0, Math.min(1, t));
  }

  /**
   * Smoothstep.
   */
  static smoothstep(edge0: number, edge1: number, x: number): number {
    const t = Interpolate.clamp01((x - edge0) / (edge1 - edge0));
    return t * t * (3 - 2 * t);
  }

  /**
   * Smootherstep.
   */
  static smootherstep(edge0: number, edge1: number, x: number): number {
    const t = Interpolate.clamp01((x - edge0) / (edge1 - edge0));
    return t * t * t * (t * (t * 6 - 15) + 10);
  }
}
