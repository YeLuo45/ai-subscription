/**
 * Rectangle2D — 2D rectangle
 *
 * Inspired by: paper.js Rectangle
 *
 * Axis-aligned or rotated rectangle.
 */

import { type Vec2 } from '../geo2d/Geometry2D';

export class Rectangle2D {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly rotation: number;

  constructor(x: number, y: number, width: number, height: number, rotation: number = 0) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.rotation = rotation;
  }

  get minX(): number { return this.x; }
  get minY(): number { return this.y; }
  get maxX(): number { return this.x + this.width; }
  get maxY(): number { return this.y + this.height; }

  get center(): Vec2 { return { x: this.x + this.width / 2, y: this.y + this.height / 2 }; }

  area(): number { return this.width * this.height; }
  perimeter(): number { return 2 * (this.width + this.height); }

  /**
   * Is point inside (including edges)?
   */
  contains(p: Vec2): boolean {
    return p.x >= this.x && p.x <= this.maxX && p.y >= this.y && p.y <= this.maxY;
  }

  /**
   * Intersect with another rectangle.
   */
  intersects(other: Rectangle2D): boolean {
    return !(other.x > this.maxX || other.maxX < this.x || other.y > this.maxY || other.maxY < this.y);
  }

  /**
   * Get intersection rectangle.
   */
  intersection(other: Rectangle2D): Rectangle2D | null {
    if (!this.intersects(other)) return null;
    const x = Math.max(this.x, other.x);
    const y = Math.max(this.y, other.y);
    const w = Math.min(this.maxX, other.maxX) - x;
    const h = Math.min(this.maxY, other.maxY) - y;
    return new Rectangle2D(x, y, w, h);
  }

  /**
   * Union.
   */
  union(other: Rectangle2D): Rectangle2D {
    const x = Math.min(this.x, other.x);
    const y = Math.min(this.y, other.y);
    const maxX = Math.max(this.maxX, other.maxX);
    const maxY = Math.max(this.maxY, other.maxY);
    return new Rectangle2D(x, y, maxX - x, maxY - y);
  }

  /**
   * Translate.
   */
  translate(dx: number, dy: number): Rectangle2D {
    return new Rectangle2D(this.x + dx, this.y + dy, this.width, this.height, this.rotation);
  }

  /**
   * Scale around center.
   */
  scale(factor: number): Rectangle2D {
    const c = this.center;
    const w = this.width * factor;
    const h = this.height * factor;
    return new Rectangle2D(c.x - w / 2, c.y - h / 2, w, h, this.rotation);
  }

  /**
   * Get corner points.
   */
  corners(): Vec2[] {
    if (this.rotation === 0) {
      return [
        { x: this.x, y: this.y },
        { x: this.maxX, y: this.y },
        { x: this.maxX, y: this.maxY },
        { x: this.x, y: this.maxY },
      ];
    }
    const c = this.center;
    const cos = Math.cos(this.rotation);
    const sin = Math.sin(this.rotation);
    const hw = this.width / 2;
    const hh = this.height / 2;
    const local: Vec2[] = [
      { x: -hw, y: -hh },
      { x: hw, y: -hh },
      { x: hw, y: hh },
      { x: -hw, y: hh },
    ];
    return local.map((p) => ({
      x: c.x + p.x * cos - p.y * sin,
      y: c.y + p.x * sin + p.y * cos,
    }));
  }

  /**
   * Is empty?
   */
  get isEmpty(): boolean { return this.width === 0 || this.height === 0; }

  /**
   * Is square?
   */
  get isSquare(): boolean { return this.width === this.height; }
}
