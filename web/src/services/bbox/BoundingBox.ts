/**
 * BoundingBox — axis-aligned bounding box
 *
 * Inspired by: turf.js bbox
 *
 * - min/max
 * - union/intersection
 * - contains point
 * - area/perimeter
 */

export interface Point { x: number; y: number; }

export class BoundingBox {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;

  constructor(minX: number, minY: number, maxX: number, maxY: number) {
    if (maxX < minX || maxY < minY) {
      throw new Error('BoundingBox: max must be >= min');
    }
    this.minX = minX;
    this.minY = minY;
    this.maxX = maxX;
    this.maxY = maxY;
  }

  get width(): number { return this.maxX - this.minX; }
  get height(): number { return this.maxY - this.minY; }
  get area(): number { return this.width * this.height; }
  get perimeter(): number { return 2 * (this.width + this.height); }
  get center(): Point { return { x: (this.minX + this.maxX) / 2, y: (this.minY + this.maxY) / 2 }; }

  /**
   * Compute bounding box from array of points.
   */
  static fromPoints(points: Point[]): BoundingBox {
    if (points.length === 0) {
      return new BoundingBox(0, 0, 0, 0);
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of points) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    return new BoundingBox(minX, minY, maxX, maxY);
  }

  /**
   * Union of two boxes.
   */
  union(other: BoundingBox): BoundingBox {
    return new BoundingBox(
      Math.min(this.minX, other.minX),
      Math.min(this.minY, other.minY),
      Math.max(this.maxX, other.maxX),
      Math.max(this.maxY, other.maxY),
    );
  }

  /**
   * Intersection of two boxes (or null if disjoint).
   */
  intersection(other: BoundingBox): BoundingBox | null {
    const minX = Math.max(this.minX, other.minX);
    const minY = Math.max(this.minY, other.minY);
    const maxX = Math.min(this.maxX, other.maxX);
    const maxY = Math.min(this.maxY, other.maxY);
    if (maxX < minX || maxY < minY) return null;
    return new BoundingBox(minX, minY, maxX, maxY);
  }

  /**
   * Does box contain point?
   */
  contains(p: Point): boolean {
    return p.x >= this.minX && p.x <= this.maxX && p.y >= this.minY && p.y <= this.maxY;
  }

  /**
   * Does box contain another box?
   */
  containsBox(other: BoundingBox): boolean {
    return this.minX <= other.minX && this.minY <= other.minY &&
           this.maxX >= other.maxX && this.maxY >= other.maxY;
  }

  /**
   * Do boxes overlap?
   */
  overlaps(other: BoundingBox): boolean {
    return this.intersection(other) !== null;
  }

  /**
   * Expand by amount.
   */
  expand(amount: number): BoundingBox {
    return new BoundingBox(
      this.minX - amount,
      this.minY - amount,
      this.maxX + amount,
      this.maxY + amount,
    );
  }

  /**
   * Scale around center.
   */
  scale(factor: number): BoundingBox {
    const c = this.center;
    const w = (this.width * factor) / 2;
    const h = (this.height * factor) / 2;
    return new BoundingBox(c.x - w, c.y - h, c.x + w, c.y + h);
  }

  /**
   * Translate by (dx, dy).
   */
  translate(dx: number, dy: number): BoundingBox {
    return new BoundingBox(this.minX + dx, this.minY + dy, this.maxX + dx, this.maxY + dy);
  }

  /**
   * Is empty (zero size)?
   */
  get isEmpty(): boolean {
    return this.width === 0 && this.height === 0;
  }

  /**
   * Get corners.
   */
  get corners(): Point[] {
    return [
      { x: this.minX, y: this.minY },
      { x: this.maxX, y: this.minY },
      { x: this.maxX, y: this.maxY },
      { x: this.minX, y: this.maxY },
    ];
  }
}
