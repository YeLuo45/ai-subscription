/**
 * Ray2D — 2D ray
 *
 * Inspired by: ray-tracing algorithms
 *
 * Half-line from origin in direction.
 * - pointAt(t) along the ray
 * - intersects(segment)
 * - intersectsBox
 */

import { type Vec2 } from '../geo2d/Geometry2D';
import { BoundingBox } from '../bbox/BoundingBox';

export class Ray2D {
  readonly origin: Vec2;
  readonly direction: Vec2;

  constructor(origin: Vec2, direction: Vec2) {
    this.origin = { ...origin };
    this.direction = { ...direction };
  }

  /**
   * Point at distance t.
   */
  pointAt(t: number): Vec2 {
    return {
      x: this.origin.x + this.direction.x * t,
      y: this.origin.y + this.direction.y * t,
    };
  }

  /**
   * Intersect with line segment.
   * Returns t > 0 intersection, or null.
   */
  intersectSegment(a: Vec2, b: Vec2): number | null {
    const v1x = this.origin.x - a.x;
    const v1y = this.origin.y - a.y;
    const v2x = b.x - a.x;
    const v2y = b.y - a.y;
    const v3x = -this.direction.y;
    const v3y = this.direction.x;
    const dot = v2x * v3x + v2y * v3y;
    if (Math.abs(dot) < 1e-10) return null;
    const t1 = (v2x * v1y - v2y * v1x) / dot;
    const t2 = (v1x * v3x + v1y * v3y) / dot;
    if (t1 >= 0 && t2 >= 0 && t2 <= 1) return t1;
    return null;
  }

  /**
   * Intersect with axis-aligned box.
   * Returns {tmin, tmax} or null if no hit.
   */
  intersectBox(box: BoundingBox): { tmin: number; tmax: number } | null {
    const invDx = 1 / this.direction.x;
    const invDy = 1 / this.direction.y;
    let tmin = -Infinity, tmax = Infinity;
    if (Math.abs(this.direction.x) < 1e-10) {
      if (this.origin.x < box.minX || this.origin.x > box.maxX) return null;
    } else {
      const t1 = (box.minX - this.origin.x) * invDx;
      const t2 = (box.maxX - this.origin.x) * invDx;
      tmin = Math.max(tmin, Math.min(t1, t2));
      tmax = Math.min(tmax, Math.max(t1, t2));
    }
    if (Math.abs(this.direction.y) < 1e-10) {
      if (this.origin.y < box.minY || this.origin.y > box.maxY) return null;
    } else {
      const t1 = (box.minY - this.origin.y) * invDy;
      const t2 = (box.maxY - this.origin.y) * invDy;
      tmin = Math.max(tmin, Math.min(t1, t2));
      tmax = Math.min(tmax, Math.max(t1, t2));
    }
    if (tmin > tmax || tmax < 0) return null;
    return { tmin, tmax };
  }

  /**
   * Reflect off a normal.
   */
  reflect(normal: Vec2): Ray2D {
    const d = this.direction.x * normal.x + this.direction.y * normal.y;
    return new Ray2D(
      this.origin,
      { x: this.direction.x - 2 * d * normal.x, y: this.direction.y - 2 * d * normal.y },
    );
  }
}
