/**
 * Triangle2D — 2D triangle
 *
 * Inspired by: paper.js Path / Three.js Triangle
 *
 * Three points.
 */

import { type Vec2 } from '../geo2d/Geometry2D';
import { Geometry2D } from '../geo2d/Geometry2D';
import { BoundingBox } from '../bbox/BoundingBox';

export class Triangle2D {
  readonly a: Vec2;
  readonly b: Vec2;
  readonly c: Vec2;

  constructor(a: Vec2, b: Vec2, c: Vec2) {
    this.a = { ...a };
    this.b = { ...b };
    this.c = { ...c };
  }

  /**
   * Get edges.
   */
  edges(): [Vec2, Vec2][] {
    return [
      [this.a, this.b],
      [this.b, this.c],
      [this.c, this.a],
    ];
  }

  /**
   * Vertices.
   */
  vertices(): Vec2[] {
    return [this.a, this.b, this.c];
  }

  /**
   * Area (signed positive if CCW).
   */
  area(): number {
    return Math.abs(Geometry2D.triangleArea(this.a, this.b, this.c));
  }

  /**
   * Perimeter.
   */
  perimeter(): number {
    return (
      Geometry2D.distance(this.a, this.b) +
      Geometry2D.distance(this.b, this.c) +
      Geometry2D.distance(this.c, this.a)
    );
  }

  /**
   * Centroid.
   */
  centroid(): Vec2 {
    return Geometry2D.centroid(this.vertices());
  }

  /**
   * Bounding box.
   */
  bounds(): BoundingBox {
    return BoundingBox.fromPoints(this.vertices());
  }

  /**
   * Is point inside?
   */
  contains(p: Vec2): boolean {
    const d1 = this.sign(p, this.a, this.b);
    const d2 = this.sign(p, this.b, this.c);
    const d3 = this.sign(p, this.c, this.a);
    const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
    const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
    return !(hasNeg && hasPos);
  }

  private sign(p1: Vec2, p2: Vec2, p3: Vec2): number {
    return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
  }

  /**
   * Is equilateral?
   */
  isEquilateral(): boolean {
    const ab = Geometry2D.distance(this.a, this.b);
    const bc = Geometry2D.distance(this.b, this.c);
    const ca = Geometry2D.distance(this.c, this.a);
    return Math.abs(ab - bc) < 1e-10 && Math.abs(bc - ca) < 1e-10;
  }

  /**
   * Is isosceles?
   */
  isIsosceles(): boolean {
    const ab = Geometry2D.distance(this.a, this.b);
    const bc = Geometry2D.distance(this.b, this.c);
    const ca = Geometry2D.distance(this.c, this.a);
    return Math.abs(ab - bc) < 1e-10 || Math.abs(bc - ca) < 1e-10 || Math.abs(ca - ab) < 1e-10;
  }

  /**
   * Is right-angled?
   */
  isRight(): boolean {
    const sides = this.sideLengths().sort((a, b) => a - b);
    return Math.abs(sides[0] ** 2 + sides[1] ** 2 - sides[2] ** 2) < 1e-10;
  }

  /**
   * Side lengths.
   */
  sideLengths(): [number, number, number] {
    return [
      Geometry2D.distance(this.a, this.b),
      Geometry2D.distance(this.b, this.c),
      Geometry2D.distance(this.c, this.a),
    ];
  }

  /**
   * Angles in radians.
   */
  angles(): [number, number, number] {
    const sides = this.sideLengths();
    const [a, b, c] = sides;
    const A = Math.acos((b * b + c * c - a * a) / (2 * b * c));
    const B = Math.acos((a * a + c * c - b * b) / (2 * a * c));
    const C = Math.PI - A - B;
    return [A, B, C];
  }

  /**
   * Translate.
   */
  translate(dx: number, dy: number): Triangle2D {
    return new Triangle2D(
      { x: this.a.x + dx, y: this.a.y + dy },
      { x: this.b.x + dx, y: this.b.y + dy },
      { x: this.c.x + dx, y: this.c.y + dy },
    );
  }

  /**
   * Equilateral triangle.
   */
  static equilateral(side: number, center: Vec2 = { x: 0, y: 0 }): Triangle2D {
    const h = (side * Math.sqrt(3)) / 2;
    return new Triangle2D(
      { x: center.x, y: center.y - (2 * h) / 3 },
      { x: center.x - side / 2, y: center.y + h / 3 },
      { x: center.x + side / 2, y: center.y + h / 3 },
    );
  }
}
