/**
 * Line2D — 2D line
 *
 * Inspired by: Three.js Line3
 *
 * Infinite line through two points.
 * - shortest distance from point
 * - nearest point on line
 * - intersection with other line
 */

import { type Vec2 } from '../geo2d/Geometry2D';

export class Line2D {
  readonly a: Vec2;
  readonly b: Vec2;

  constructor(a: Vec2, b: Vec2) {
    this.a = { ...a };
    this.b = { ...b };
  }

  /**
   * Line direction (unit vector).
   */
  direction(): Vec2 {
    const dx = this.b.x - this.a.x;
    const dy = this.b.y - this.a.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return { x: 0, y: 0 };
    return { x: dx / len, y: dy / len };
  }

  /**
   * Line length.
   */
  length(): number {
    return Math.sqrt((this.b.x - this.a.x) ** 2 + (this.b.y - this.a.y) ** 2);
  }

  /**
   * Slope (m), undefined if vertical.
   */
  slope(): number | null {
    if (this.b.x === this.a.x) return null;
    return (this.b.y - this.a.y) / (this.b.x - this.a.x);
  }

  /**
   * y-intercept (b), undefined if vertical.
   */
  yIntercept(): number | null {
    const m = this.slope();
    if (m === null) return null;
    return this.a.y - m * this.a.x;
  }

  /**
   * Standard form Ax + By + C = 0.
   */
  standardForm(): { A: number; B: number; C: number } {
    const A = this.a.y - this.b.y;
    const B = this.b.x - this.a.x;
    const C = -(A * this.a.x + B * this.a.y);
    return { A, B, C };
  }

  /**
   * Distance from point to infinite line.
   */
  distanceFromPoint(p: Vec2): number {
    const { A, B, C } = this.standardForm();
    return Math.abs(A * p.x + B * p.y + C) / Math.sqrt(A * A + B * B);
  }

  /**
   * Nearest point on line to given point.
   */
  nearestPoint(p: Vec2): Vec2 {
    const dx = this.b.x - this.a.x;
    const dy = this.b.y - this.a.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return { ...this.a };
    const t = ((p.x - this.a.x) * dx + (p.y - this.a.y) * dy) / lenSq;
    return { x: this.a.x + t * dx, y: this.a.y + t * dy };
  }

  /**
   * Intersect with another line.
   * Returns intersection point or null if parallel.
   */
  intersect(other: Line2D): Vec2 | null {
    const d = (this.a.x - this.b.x) * (other.a.y - other.b.y) -
              (this.a.y - this.b.y) * (other.a.x - other.b.x);
    if (Math.abs(d) < 1e-10) return null;
    const t = ((this.a.x - other.a.x) * (other.a.y - other.b.y) -
               (this.a.y - other.a.y) * (other.a.x - other.b.x)) / d;
    return {
      x: this.a.x + t * (this.b.x - this.a.x),
      y: this.a.y + t * (this.b.y - this.a.y),
    };
  }

  /**
   * Is the line horizontal?
   */
  isHorizontal(): boolean { return this.a.y === this.b.y; }

  /**
   * Is the line vertical?
   */
  isVertical(): boolean { return this.a.x === this.b.x; }

  /**
   * Midpoint of segment.
   */
  midpoint(): Vec2 {
    return { x: (this.a.x + this.b.x) / 2, y: (this.a.y + this.b.y) / 2 };
  }
}
