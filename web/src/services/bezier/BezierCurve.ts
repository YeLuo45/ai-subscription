/**
 * BezierCurve — Bezier curve
 *
 * Inspired by: bezier-js
 *
 * Supports:
 *   - Linear (2 points)
 *   - Quadratic (3 points)
 *   - Cubic (4 points)
 */

import { type Vec2 } from '../geo2d/Geometry2D';

export type BezierType = 'linear' | 'quadratic' | 'cubic';

export class BezierCurve {
  readonly type: BezierType;
  readonly points: Vec2[];

  constructor(type: BezierType, points: Vec2[]) {
    const expected = { linear: 2, quadratic: 3, cubic: 4 }[type];
    if (points.length !== expected) {
      throw new Error(`${type} requires ${expected} points, got ${points.length}`);
    }
    this.type = type;
    this.points = points.map((p) => ({ ...p }));
  }

  /**
   * Evaluate curve at parameter t in [0, 1].
   */
  evaluate(t: number): Vec2 {
    if (t < 0) t = 0;
    if (t > 1) t = 1;
    switch (this.type) {
      case 'linear': return this.linear(t);
      case 'quadratic': return this.quadratic(t);
      case 'cubic': return this.cubic(t);
    }
  }

  private linear(t: number): Vec2 {
    return {
      x: this.lerp(this.points[0].x, this.points[1].x, t),
      y: this.lerp(this.points[0].y, this.points[1].y, t),
    };
  }

  private quadratic(t: number): Vec2 {
    const [p0, p1, p2] = this.points;
    const u = 1 - t;
    return {
      x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
      y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
    };
  }

  private cubic(t: number): Vec2 {
    const [p0, p1, p2, p3] = this.points;
    const u = 1 - t;
    const uu = u * u;
    const tt = t * t;
    return {
      x: uu * u * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + tt * t * p3.x,
      y: uu * u * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + tt * t * p3.y,
    };
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  /**
   * Sample curve at N points.
   */
  sample(count: number): Vec2[] {
    const result: Vec2[] = [];
    for (let i = 0; i < count; i++) {
      result.push(this.evaluate(i / (count - 1)));
    }
    return result;
  }

  /**
   * Start point.
   */
  start(): Vec2 { return { ...this.points[0] }; }

  /**
   * End point.
   */
  end(): Vec2 { return { ...this.points[this.points.length - 1] }; }

  /**
   * Get control points.
   */
  controlPoints(): Vec2[] { return this.points.map((p) => ({ ...p })); }

  /**
   * Approximate length via polyline.
   */
  length(samples: number = 100): number {
    const pts = this.sample(samples);
    let len = 0;
    for (let i = 1; i < pts.length; i++) {
      const dx = pts[i].x - pts[i - 1].x;
      const dy = pts[i].y - pts[i - 1].y;
      len += Math.sqrt(dx * dx + dy * dy);
    }
    return len;
  }

  /**
   * Tangent vector at t.
   */
  tangent(t: number): Vec2 {
    if (t < 0) t = 0;
    if (t > 1) t = 1;
    const eps = 1e-4;
    const a = this.evaluate(Math.max(0, t - eps));
    const b = this.evaluate(Math.min(1, t + eps));
    return { x: b.x - a.x, y: b.y - a.y };
  }

  /**
   * Bounding box of sample points.
   */
  bounds(samples: number = 32): { minX: number; minY: number; maxX: number; maxY: number } {
    const pts = this.sample(samples);
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of pts) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    return { minX, minY, maxX, maxY };
  }
}
