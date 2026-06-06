/**
 * ConvexHull — compute convex hull of points
 *
 * Inspired by: Andrew's monotone chain / Graham scan
 *
 * O(n log n) convex hull algorithm.
 */

import { type Vec2 } from '../geo2d/Geometry2D';

export class ConvexHull {
  /**
   * Compute convex hull using Andrew's monotone chain.
   * Returns points in CCW order.
   */
  static compute(points: Vec2[]): Vec2[] {
    if (points.length <= 1) return [...points];
    const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
    const n = sorted.length;

    const lower: Vec2[] = [];
    for (const p of sorted) {
      while (lower.length >= 2 && this.cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
        lower.pop();
      }
      lower.push(p);
    }

    const upper: Vec2[] = [];
    for (let i = n - 1; i >= 0; i--) {
      const p = sorted[i];
      while (upper.length >= 2 && this.cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
        upper.pop();
      }
      upper.push(p);
    }

    lower.pop();
    upper.pop();
    return [...lower, ...upper];
  }

  /**
   * Cross product of (b - a) x (c - a).
   */
  private static cross(a: Vec2, b: Vec2, c: Vec2): number {
    return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  }

  /**
   * Hull area.
   */
  static area(hull: Vec2[]): number {
    if (hull.length < 3) return 0;
    let sum = 0;
    for (let i = 0; i < hull.length; i++) {
      const a = hull[i];
      const b = hull[(i + 1) % hull.length];
      sum += (b.x - a.x) * (b.y + a.y);
    }
    return Math.abs(sum / 2);
  }

  /**
   * Hull perimeter.
   */
  static perimeter(hull: Vec2[]): number {
    if (hull.length < 2) return 0;
    let sum = 0;
    for (let i = 0; i < hull.length; i++) {
      const a = hull[i];
      const b = hull[(i + 1) % hull.length];
      sum += Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
    }
    return sum;
  }

  /**
   * Is a point inside the hull? (assumes CCW order)
   */
  static contains(hull: Vec2[], p: Vec2): boolean {
    if (hull.length < 3) return false;
    let sign = 0;
    for (let i = 0; i < hull.length; i++) {
      const a = hull[i];
      const b = hull[(i + 1) % hull.length];
      const cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
      if (cross !== 0) {
        const s = cross > 0 ? 1 : -1;
        if (sign === 0) sign = s;
        else if (sign !== s) return false;
      }
    }
    return true;
  }
}
