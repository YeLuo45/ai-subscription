/**
 * Ellipse2D — 2D ellipse
 *
 * Inspired by: paper.js Path / SVG ellipse
 *
 * Defined by center, semi-major and semi-minor axes, rotation.
 */

import { type Vec2 } from '../geo2d/Geometry2D';

export class Ellipse2D {
  readonly center: Vec2;
  readonly rx: number;
  readonly ry: number;
  readonly rotation: number;

  constructor(center: Vec2, rx: number, ry: number, rotation: number = 0) {
    if (rx < 0 || ry < 0) throw new Error('rx and ry must be >= 0');
    this.center = { ...center };
    this.rx = rx;
    this.ry = ry;
    this.rotation = rotation;
  }

  /**
   * Area.
   */
  area(): number { return Math.PI * this.rx * this.ry; }

  /**
   * Approximate perimeter (Ramanujan).
   */
  perimeter(): number {
    const a = this.rx, b = this.ry;
    if (a === b) return 2 * Math.PI * a;
    const h = Math.pow((a - b) / (a + b), 2);
    return Math.PI * (a + b) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));
  }

  /**
   * Is point inside (axis-aligned approximation)?
   */
  contains(p: Vec2): boolean {
    if (this.rotation === 0) {
      const nx = (p.x - this.center.x) / this.rx;
      const ny = (p.y - this.center.y) / this.ry;
      return nx * nx + ny * ny <= 1;
    }
    const cos = Math.cos(-this.rotation);
    const sin = Math.sin(-this.rotation);
    const dx = p.x - this.center.x;
    const dy = p.y - this.center.y;
    const lx = dx * cos - dy * sin;
    const ly = dx * sin + dy * cos;
    const nx = lx / this.rx;
    const ny = ly / this.ry;
    return nx * nx + ny * ny <= 1;
  }

  /**
   * Get bounding box (with rotation).
   */
  bounds(): { minX: number; minY: number; maxX: number; maxY: number } {
    if (this.rotation === 0) {
      return {
        minX: this.center.x - this.rx,
        minY: this.center.y - this.ry,
        maxX: this.center.x + this.rx,
        maxY: this.center.y + this.ry,
      };
    }
    // For rotated ellipse, use axis-aligned bound of the rotated bounding box
    const cos = Math.cos(this.rotation);
    const sin = Math.sin(this.rotation);
    const xMax = Math.sqrt(this.rx * this.rx * cos * cos + this.ry * this.ry * sin * sin);
    const yMax = Math.sqrt(this.rx * this.rx * sin * sin + this.ry * this.ry * cos * cos);
    return {
      minX: this.center.x - xMax,
      minY: this.center.y - yMax,
      maxX: this.center.x + xMax,
      maxY: this.center.y + yMax,
    };
  }

  /**
   * Point on ellipse at angle.
   */
  pointAt(angleRad: number): Vec2 {
    const c = Math.cos(angleRad);
    const s = Math.sin(angleRad);
    const localX = this.rx * c;
    const localY = this.ry * s;
    const cos = Math.cos(this.rotation);
    const sin = Math.sin(this.rotation);
    return {
      x: this.center.x + localX * cos - localY * sin,
      y: this.center.y + localX * sin + localY * cos,
    };
  }

  /**
   * Eccentricity.
   */
  eccentricity(): number {
    if (this.rx === 0 || this.ry === 0) return 0;
    const a = Math.max(this.rx, this.ry);
    const b = Math.min(this.rx, this.ry);
    if (a === b) return 0;
    return Math.sqrt(1 - (b * b) / (a * a));
  }

  /**
   * Is a circle (rx == ry)?
   */
  isCircle(): boolean { return this.rx === this.ry; }

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
}
