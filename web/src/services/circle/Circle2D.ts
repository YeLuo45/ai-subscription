/**
 * Circle2D — 2D circle
 *
 * Inspired by: Three.js CircleGeometry
 *
 * Circle defined by center and radius.
 */

import { type Vec2 } from '../geo2d/Geometry2D';

export class Circle2D {
  readonly center: Vec2;
  readonly radius: number;

  constructor(center: Vec2, radius: number) {
    if (radius < 0) throw new Error('radius must be >= 0');
    this.center = { ...center };
    this.radius = radius;
  }

  /**
   * Area.
   */
  area(): number { return Math.PI * this.radius * this.radius; }

  /**
   * Circumference.
   */
  circumference(): number { return 2 * Math.PI * this.radius; }

  /**
   * Diameter.
   */
  diameter(): number { return 2 * this.radius; }

  /**
   * Is point inside circle?
   */
  contains(p: Vec2): boolean {
    const dx = p.x - this.center.x;
    const dy = p.y - this.center.y;
    return dx * dx + dy * dy <= this.radius * this.radius;
  }

  /**
   * Distance from point to circumference (0 if on, positive outside).
   */
  distanceFromPoint(p: Vec2): number {
    const dx = p.x - this.center.x;
    const dy = p.y - this.center.y;
    return Math.sqrt(dx * dx + dy * dy) - this.radius;
  }

  /**
   * Bounding box.
   */
  bounds(): { minX: number; minY: number; maxX: number; maxY: number } {
    return {
      minX: this.center.x - this.radius,
      minY: this.center.y - this.radius,
      maxX: this.center.x + this.radius,
      maxY: this.center.y + this.radius,
    };
  }

  /**
   * Point on circle at angle.
   */
  pointAt(angleRad: number): Vec2 {
    return {
      x: this.center.x + this.radius * Math.cos(angleRad),
      y: this.center.y + this.radius * Math.sin(angleRad),
    };
  }

  /**
   * Intersect with another circle. Returns 0, 1, or 2 points.
   */
  intersect(other: Circle2D): Vec2[] {
    const dx = other.center.x - this.center.x;
    const dy = other.center.y - this.center.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > this.radius + other.radius) return [];
    if (dist < Math.abs(this.radius - other.radius)) return [];
    if (dist === 0 && this.radius === other.radius) return [];
    const a = (this.radius * this.radius - other.radius * other.radius + dist * dist) / (2 * dist);
    const h = Math.sqrt(this.radius * this.radius - a * a);
    const px = this.center.x + (a * dx) / dist;
    const py = this.center.y + (a * dy) / dist;
    if (h === 0) return [{ x: px, y: py }];
    return [
      { x: px + (h * dy) / dist, y: py - (h * dx) / dist },
      { x: px - (h * dy) / dist, y: py + (h * dx) / dist },
    ];
  }

  /**
   * Is this circle contained within another?
   */
  isContainedIn(other: Circle2D): boolean {
    const dx = other.center.x - this.center.x;
    const dy = other.center.y - this.center.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist + this.radius <= other.radius;
  }

  /**
   * Do circles overlap?
   */
  overlaps(other: Circle2D): boolean {
    const dx = other.center.x - this.center.x;
    const dy = other.center.y - this.center.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < this.radius + other.radius;
  }

  /**
   * Generate polygon approximation.
   */
  toPolygon(segments: number = 32): Vec2[] {
    const points: Vec2[] = [];
    for (let i = 0; i < segments; i++) {
      const a = (i / segments) * 2 * Math.PI;
      points.push(this.pointAt(a));
    }
    return points;
  }

  /**
   * Unit circle at origin.
   */
  static unit(radius: number = 1): Circle2D {
    return new Circle2D({ x: 0, y: 0 }, radius);
  }
}
