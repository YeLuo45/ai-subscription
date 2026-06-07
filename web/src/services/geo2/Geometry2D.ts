/**
 * Geometry2D — 2D geometry utilities
 */

export interface Point { x: number; y: number; }
export interface Circle { cx: number; cy: number; r: number; }
export interface Line2 { ax: number; ay: number; bx: number; by: number; }

export class Geometry2D {
  /**
   * Distance between two points.
   */
  static distance(p1: Point, p2: Point): number {
    return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
  }

  /**
   * Area of triangle (Shoelace).
   */
  static triangleArea(p1: Point, p2: Point, p3: Point): number {
    return Math.abs((p1.x * (p2.y - p3.y) + p2.x * (p3.y - p1.y) + p3.x * (p1.y - p2.y)) / 2);
  }

  /**
   * Area of polygon (Shoelace).
   */
  static polygonArea(points: Point[]): number {
    if (points.length < 3) return 0;
    let s = 0;
    for (let i = 0; i < points.length; i++) {
      const a = points[i];
      const b = points[(i + 1) % points.length];
      s += a.x * b.y - b.x * a.y;
    }
    return Math.abs(s / 2);
  }

  /**
   * Perimeter of polygon.
   */
  static polygonPerimeter(points: Point[]): number {
    if (points.length < 2) return 0;
    let p = 0;
    for (let i = 0; i < points.length; i++) {
      const a = points[i];
      const b = points[(i + 1) % points.length];
      p += Geometry2D.distance(a, b);
    }
    return p;
  }

  /**
   * Circle area.
   */
  static circleArea(c: Circle): number { return Math.PI * c.r ** 2; }

  /**
   * Circle circumference.
   */
  static circleCircumference(c: Circle): number { return 2 * Math.PI * c.r; }

  /**
   * Point inside circle.
   */
  static pointInCircle(p: Point, c: Circle): boolean {
    return (p.x - c.cx) ** 2 + (p.y - c.cy) ** 2 <= c.r ** 2;
  }

  /**
   * Two circles intersect.
   */
  static circlesIntersect(c1: Circle, c2: Circle): boolean {
    const d = Geometry2D.distance({ x: c1.cx, y: c1.cy }, { x: c2.cx, y: c2.cy });
    return d <= c1.r + c2.r && d >= Math.abs(c1.r - c2.r);
  }

  /**
   * Line length.
   */
  static lineLength(l: Line2): number {
    return Geometry2D.distance({ x: l.ax, y: l.ay }, { x: l.bx, y: l.by });
  }

  /**
   * Point on line segment (using projection).
   */
  static pointOnSegment(p: Point, l: Line2): Point {
    const dx = l.bx - l.ax;
    const dy = l.by - l.ay;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return { x: l.ax, y: l.ay };
    let t = ((p.x - l.ax) * dx + (p.y - l.ay) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    return { x: l.ax + t * dx, y: l.ay + t * dy };
  }

  /**
   * Check if polygon is convex.
   */
  static isConvex(points: Point[]): boolean {
    if (points.length < 3) return false;
    let sign = 0;
    for (let i = 0; i < points.length; i++) {
      const a = points[i];
      const b = points[(i + 1) % points.length];
      const c = points[(i + 2) % points.length];
      const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
      if (cross !== 0) {
        const s = Math.sign(cross);
        if (sign === 0) sign = s;
        else if (sign !== s) return false;
      }
    }
    return true;
  }
}
