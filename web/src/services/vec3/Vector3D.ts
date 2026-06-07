/**
 * Vector3D — 3D vector operations
 */

export class Vector3D {
  x: number;
  y: number;
  z: number;

  constructor(x: number = 0, y: number = 0, z: number = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  static zero(): Vector3D { return new Vector3D(0, 0, 0); }
  static one(): Vector3D { return new Vector3D(1, 1, 1); }
  static up(): Vector3D { return new Vector3D(0, 1, 0); }
  static right(): Vector3D { return new Vector3D(1, 0, 0); }
  static forward(): Vector3D { return new Vector3D(0, 0, 1); }
  static fromArray(arr: number[]): Vector3D { return new Vector3D(arr[0] ?? 0, arr[1] ?? 0, arr[2] ?? 0); }

  add(v: Vector3D): Vector3D { return new Vector3D(this.x + v.x, this.y + v.y, this.z + v.z); }
  subtract(v: Vector3D): Vector3D { return new Vector3D(this.x - v.x, this.y - v.y, this.z - v.z); }
  scale(s: number): Vector3D { return new Vector3D(this.x * s, this.y * s, this.z * s); }
  multiply(v: Vector3D): Vector3D { return new Vector3D(this.x * v.x, this.y * v.y, this.z * v.z); }
  negate(): Vector3D { return new Vector3D(-this.x, -this.y, -this.z); }

  dot(v: Vector3D): number { return this.x * v.x + this.y * v.y + this.z * v.z; }

  cross(v: Vector3D): Vector3D {
    return new Vector3D(
      this.y * v.z - this.z * v.y,
      this.z * v.x - this.x * v.z,
      this.x * v.y - this.y * v.x
    );
  }

  magnitude(): number { return Math.sqrt(this.x ** 2 + this.y ** 2 + this.z ** 2); }
  magnitudeSq(): number { return this.x ** 2 + this.y ** 2 + this.z ** 2; }

  normalize(): Vector3D {
    const m = this.magnitude();
    if (m === 0) return Vector3D.zero();
    return this.scale(1 / m);
  }

  distanceTo(v: Vector3D): number {
    return Math.sqrt((this.x - v.x) ** 2 + (this.y - v.y) ** 2 + (this.z - v.z) ** 2);
  }

  /**
   * Reflect around normal.
   */
  reflect(normal: Vector3D): Vector3D {
    return this.subtract(normal.scale(2 * this.dot(normal)));
  }

  /**
   * Project onto another vector.
   */
  project(v: Vector3D): Vector3D {
    const denom = v.magnitudeSq();
    if (denom === 0) return Vector3D.zero();
    return v.scale(this.dot(v) / denom);
  }

  /**
   * Angle between two vectors (radians).
   */
  angleTo(v: Vector3D): number {
    const m = this.magnitude() * v.magnitude();
    if (m === 0) return 0;
    const c = this.dot(v) / m;
    return Math.acos(Math.max(-1, Math.min(1, c)));
  }

  equals(v: Vector3D, eps: number = 1e-10): boolean {
    return Math.abs(this.x - v.x) < eps && Math.abs(this.y - v.y) < eps && Math.abs(this.z - v.z) < eps;
  }

  toArray(): number[] { return [this.x, this.y, this.z]; }
  toString(): string { return `(${this.x}, ${this.y}, ${this.z})`; }
}
