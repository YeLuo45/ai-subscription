/**
 * BoundingBox — 2D axis-aligned bounding box
 *
 * Inspired by: bounding-box
 */

export interface BBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class BoundingBox {
  /**
   * Create from two points.
   */
  static fromPoints(x1: number, y1: number, x2: number, y2: number): BBox {
    return {
      x: Math.min(x1, x2),
      y: Math.min(y1, y2),
      width: Math.abs(x2 - x1),
      height: Math.abs(y2 - y1),
    };
  }

  /**
   * Create from many points.
   */
  static fromPointsList(points: Array<[number, number]>): BBox {
    if (points.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
    let minX = points[0][0], minY = points[0][1], maxX = minX, maxY = minY;
    for (const [x, y] of points) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }

  /**
   * Check intersection.
   */
  static intersects(a: BBox, b: BBox): boolean {
    return !(a.x + a.width < b.x || b.x + b.width < a.x || a.y + a.height < b.y || b.y + b.height < a.y);
  }

  /**
   * Compute union.
   */
  static union(a: BBox, b: BBox): BBox {
    const minX = Math.min(a.x, b.x);
    const minY = Math.min(a.y, b.y);
    const maxX = Math.max(a.x + a.width, b.x + b.width);
    const maxY = Math.max(a.y + a.height, b.y + b.height);
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }

  /**
   * Compute intersection.
   */
  static intersection(a: BBox, b: BBox): BBox | null {
    const minX = Math.max(a.x, b.x);
    const minY = Math.max(a.y, b.y);
    const maxX = Math.min(a.x + a.width, b.x + b.width);
    const maxY = Math.min(a.y + a.height, b.y + b.height);
    if (maxX <= minX || maxY <= minY) return null;
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }

  /**
   * Check if point is inside.
   */
  static contains(b: BBox, x: number, y: number): boolean {
    return x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height;
  }

  /**
   * Area.
   */
  static area(b: BBox): number {
    return b.width * b.height;
  }

  /**
   * Perimeter.
   */
  static perimeter(b: BBox): number {
    return 2 * (b.width + b.height);
  }

  /**
   * Center.
   */
  static center(b: BBox): { x: number; y: number } {
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  }

  /**
   * Check if BBox is empty.
   */
  static isEmpty(b: BBox): boolean {
    return b.width === 0 && b.height === 0;
  }
}
