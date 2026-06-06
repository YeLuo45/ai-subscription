/**
 * Geometry2D — 2D geometry helpers
 *
 * Inspired by: Three.js Vector2 / geometric algorithms
 *
 * - Distance (point to point, point to line)
 * - Angle (between vectors, in radians/degrees)
 * - Triangle area
 * - Polygon centroid
 * - Line intersection
 * - Rotate point
 */

export interface Vec2 { x: number; y: number; }

export class Geometry2D {
  /**
   * Distance between two points.
   */
  static distance(a: Vec2, b: Vec2): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Squared distance.
   */
  static distanceSq(a: Vec2, b: Vec2): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return dx * dx + dy * dy;
  }

  /**
   * Manhattan distance.
   */
  static manhattan(a: Vec2, b: Vec2): number {
    return Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
  }

  /**
   * Angle between two points (in radians, 0 to 2π).
   */
  static angle(a: Vec2, b: Vec2): number {
    return Math.atan2(b.y - a.y, b.x - a.x);
  }

  /**
   * Angle in degrees.
   */
  static angleDeg(a: Vec2, b: Vec2): number {
    return this.angle(a, b) * (180 / Math.PI);
  }

  /**
   * Angle between two vectors.
   */
  static angleBetween(u: Vec2, v: Vec2): number {
    const dot = u.x * v.x + u.y * v.y;
    const m = Math.sqrt(u.x * u.x + u.y * u.y) * Math.sqrt(v.x * v.x + v.y * v.y);
    if (m === 0) return 0;
    return Math.acos(Math.max(-1, Math.min(1, dot / m)));
  }

  /**
   * Triangle area (Heron).
   */
  static triangleArea(a: Vec2, b: Vec2, c: Vec2): number {
    return Math.abs(
      a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y),
    ) / 2;
  }

  /**
   * Polygon centroid.
   */
  static centroid(points: Vec2[]): Vec2 {
    if (points.length === 0) return { x: 0, y: 0 };
    let cx = 0, cy = 0;
    for (const p of points) {
      cx += p.x;
      cy += p.y;
    }
    return { x: cx / points.length, y: cy / points.length };
  }

  /**
   * Polygon area (signed, positive if CCW).
   */
  static polygonArea(points: Vec2[]): number {
    if (points.length < 3) return 0;
    let sum = 0;
    for (let i = 0; i < points.length; i++) {
      const a = points[i];
      const b = points[(i + 1) % points.length];
      sum += (b.x - a.x) * (b.y + a.y);
    }
    return -sum / 2;
  }

  /**
   * Rotate point around origin.
   */
  static rotate(p: Vec2, angleRad: number): Vec2 {
    const c = Math.cos(angleRad);
    const s = Math.sin(angleRad);
    return { x: p.x * c - p.y * s, y: p.x * s + p.y * c };
  }

  /**
   * Rotate point around pivot.
   */
  static rotateAround(p: Vec2, pivot: Vec2, angleRad: number): Vec2 {
    const dx = p.x - pivot.x;
    const dy = p.y - pivot.y;
    const c = Math.cos(angleRad);
    const s = Math.sin(angleRad);
    return {
      x: pivot.x + dx * c - dy * s,
      y: pivot.y + dx * s + dy * c,
    };
  }

  /**
   * Line-line intersection. Returns null if parallel.
   */
  static lineIntersect(p1: Vec2, p2: Vec2, p3: Vec2, p4: Vec2): Vec2 | null {
    const d = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
    if (d === 0) return null;
    const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / d;
    return {
      x: p1.x + t * (p2.x - p1.x),
      y: p1.y + t * (p2.y - p1.y),
    };
  }

  /**
   * Distance from point to line segment.
   */
  static pointToSegment(p: Vec2, a: Vec2, b: Vec2): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return this.distance(p, a);
    let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    return this.distance(p, { x: a.x + t * dx, y: a.y + t * dy });
  }

  /**
   * Linear interpolation.
   */
  static lerp(a: Vec2, b: Vec2, t: number): Vec2 {
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  }
}
