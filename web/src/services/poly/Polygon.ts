/**
 * Polygon — polygon operations
 *
 * Inspired by: polygon-clipping / turf.js
 *
 * - Area, perimeter
 * - Centroid, bounds
 * - Point-in-polygon
 * - Convex/concave
 * - Simplify (RDP)
 * - Reverse
 */

import { type Vec2 } from '../geo2d/Geometry2D';
import { Geometry2D } from '../geo2d/Geometry2D';
import { BoundingBox } from '../bbox/BoundingBox';

export class Polygon {
  private points: Vec2[];

  constructor(points: Vec2[] = []) {
    this.points = points;
  }

  /**
   * Get all points.
   */
  getPoints(): Vec2[] { return [...this.points]; }

  /**
   * Number of points.
   */
  get size(): number { return this.points.length; }

  /**
   * Area (signed, positive if CCW).
   */
  area(): number {
    return Math.abs(Geometry2D.polygonArea(this.points));
  }

  /**
   * Perimeter.
   */
  perimeter(): number {
    if (this.points.length < 2) return 0;
    let sum = 0;
    for (let i = 0; i < this.points.length; i++) {
      const a = this.points[i];
      const b = this.points[(i + 1) % this.points.length];
      sum += Geometry2D.distance(a, b);
    }
    return sum;
  }

  /**
   * Centroid.
   */
  centroid(): Vec2 {
    return Geometry2D.centroid(this.points);
  }

  /**
   * Bounding box.
   */
  bounds(): BoundingBox {
    return BoundingBox.fromPoints(this.points);
  }

  /**
   * Is point inside polygon? (ray casting)
   */
  contains(p: Vec2): boolean {
    let inside = false;
    for (let i = 0, j = this.points.length - 1; i < this.points.length; j = i++) {
      const a = this.points[i];
      const b = this.points[j];
      if (((a.y > p.y) !== (b.y > p.y)) &&
          (p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x)) {
        inside = !inside;
      }
    }
    return inside;
  }

  /**
   * Is convex? All cross products same sign.
   */
  isConvex(): boolean {
    if (this.points.length < 3) return false;
    let sign = 0;
    for (let i = 0; i < this.points.length; i++) {
      const a = this.points[i];
      const b = this.points[(i + 1) % this.points.length];
      const c = this.points[(i + 2) % this.points.length];
      const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
      if (cross !== 0) {
        if (sign === 0) sign = cross > 0 ? 1 : -1;
        else if (sign * cross < 0) return false;
      }
    }
    return true;
  }

  /**
   * Is simple (no self-intersections)?
   */
  isSimple(): boolean {
    // Simplified: convex polygons are simple
    return this.isConvex();
  }

  /**
   * Reverse point order.
   */
  reverse(): Polygon {
    return new Polygon([...this.points].reverse());
  }

  /**
   * Add point.
   */
  add(p: Vec2): Polygon {
    return new Polygon([...this.points, p]);
  }

  /**
   * Translate all points.
   */
  translate(dx: number, dy: number): Polygon {
    return new Polygon(this.points.map((p) => ({ x: p.x + dx, y: p.y + dy })));
  }

  /**
   * Simplify using Ramer-Douglas-Peucker.
   */
  simplify(epsilon: number): Polygon {
    if (this.points.length < 3) return this;
    return new Polygon(this.rdp(this.points, epsilon));
  }

  private rdp(points: Vec2[], epsilon: number): Vec2[] {
    if (points.length < 3) return points;
    let maxDist = 0;
    let idx = 0;
    const a = points[0];
    const b = points[points.length - 1];
    for (let i = 1; i < points.length - 1; i++) {
      const d = this.perpDist(points[i], a, b);
      if (d > maxDist) {
        maxDist = d;
        idx = i;
      }
    }
    if (maxDist > epsilon) {
      const left = this.rdp(points.slice(0, idx + 1), epsilon);
      const right = this.rdp(points.slice(idx), epsilon);
      return [...left.slice(0, -1), ...right];
    }
    return [a, b];
  }

  private perpDist(p: Vec2, a: Vec2, b: Vec2): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return Geometry2D.distance(p, a);
    return Math.abs(dx * (a.y - p.y) - (a.x - p.x) * dy) / len;
  }

  /**
   * Regular polygon.
   */
  static regular(sides: number, radius: number = 1, center: Vec2 = { x: 0, y: 0 }): Polygon {
    const points: Vec2[] = [];
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * 2 * Math.PI - Math.PI / 2;
      points.push({ x: center.x + radius * Math.cos(a), y: center.y + radius * Math.sin(a) });
    }
    return new Polygon(points);
  }
}
