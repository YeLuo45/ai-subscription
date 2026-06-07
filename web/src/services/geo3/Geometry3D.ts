/**
 * Geometry3D — 3D geometry utilities
 */

export interface Point3 { x: number; y: number; z: number; }
export interface Sphere { cx: number; cy: number; cz: number; r: number; }
export interface Box3 { x: number; y: number; z: number; w: number; h: number; d: number; }

export class Geometry3D {
  /**
   * Distance between two 3D points.
   */
  static distance(p1: Point3, p2: Point3): number {
    return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2 + (p1.z - p2.z) ** 2);
  }

  /**
   * Sphere volume.
   */
  static sphereVolume(s: Sphere): number {
    return (4 / 3) * Math.PI * s.r ** 3;
  }

  /**
   * Sphere surface area.
   */
  static sphereSurface(s: Sphere): number {
    return 4 * Math.PI * s.r ** 2;
  }

  /**
   * Box volume.
   */
  static boxVolume(b: Box3): number {
    return b.w * b.h * b.d;
  }

  /**
   * Box surface area.
   */
  static boxSurface(b: Box3): number {
    return 2 * (b.w * b.h + b.w * b.d + b.h * b.d);
  }

  /**
   * Point inside sphere.
   */
  static pointInSphere(p: Point3, s: Sphere): boolean {
    return (p.x - s.cx) ** 2 + (p.y - s.cy) ** 2 + (p.z - s.cz) ** 2 <= s.r ** 2;
  }

  /**
   * Point inside box.
   */
  static pointInBox(p: Point3, b: Box3): boolean {
    return p.x >= b.x && p.x <= b.x + b.w
      && p.y >= b.y && p.y <= b.y + b.h
      && p.z >= b.z && p.z <= b.z + b.d;
  }

  /**
   * Two spheres intersect.
   */
  static spheresIntersect(s1: Sphere, s2: Sphere): boolean {
    const d = Geometry3D.distance({ x: s1.cx, y: s1.cy, z: s1.cz }, { x: s2.cx, y: s2.cy, z: s2.cz });
    return d <= s1.r + s2.r && d >= Math.abs(s1.r - s2.r);
  }

  /**
   * Two boxes intersect.
   */
  static boxesIntersect(b1: Box3, b2: Box3): boolean {
    return b1.x <= b2.x + b2.w && b1.x + b1.w >= b2.x
      && b1.y <= b2.y + b2.h && b1.y + b1.h >= b2.y
      && b1.z <= b2.z + b2.d && b1.z + b1.d >= b2.z;
  }

  /**
   * Tetrahedron volume.
   */
  static tetrahedronVolume(p1: Point3, p2: Point3, p3: Point3, p4: Point3): number {
    const a = { x: p2.x - p1.x, y: p2.y - p1.y, z: p2.z - p1.z };
    const b = { x: p3.x - p1.x, y: p3.y - p1.y, z: p3.z - p1.z };
    const c = { x: p4.x - p1.x, y: p4.y - p1.y, z: p4.z - p1.z };
    const cross = {
      x: a.y * b.z - a.z * b.y,
      y: a.z * b.x - a.x * b.z,
      z: a.x * b.y - a.y * b.x,
    };
    const dot = cross.x * c.x + cross.y * c.y + cross.z * c.z;
    return Math.abs(dot) / 6;
  }

  /**
   * Cylinder volume.
   */
  static cylinderVolume(r: number, h: number): number {
    return Math.PI * r ** 2 * h;
  }
}
