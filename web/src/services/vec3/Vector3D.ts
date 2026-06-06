/**
 * Vector3D — immutable 3D vector
 *
 * Inspired by: Three.js Vector3 / Unity Vector3
 *
 * Immutable: all operations return new vectors.
 */

export class Vector3D {
  readonly x: number;
  readonly y: number;
  readonly z: number;

  constructor(x: number = 0, y: number = 0, z: number = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  // ============== Static factories ==============
  static zero(): Vector3D { return new Vector3D(0, 0, 0); }
  static one(): Vector3D { return new Vector3D(1, 1, 1); }
  static up(): Vector3D { return new Vector3D(0, 1, 0); }
  static down(): Vector3D { return new Vector3D(0, -1, 0); }
  static left(): Vector3D { return new Vector3D(-1, 0, 0); }
  static right(): Vector3D { return new Vector3D(1, 0, 0); }
  static forward(): Vector3D { return new Vector3D(0, 0, 1); }
  static back(): Vector3D { return new Vector3D(0, 0, -1); }

  // ============== Arithmetic ==============
  add(v: Vector3D): Vector3D { return new Vector3D(this.x + v.x, this.y + v.y, this.z + v.z); }
  sub(v: Vector3D): Vector3D { return new Vector3D(this.x - v.x, this.y - v.y, this.z - v.z); }
  scale(s: number): Vector3D { return new Vector3D(this.x * s, this.y * s, this.z * s); }
  multiply(v: Vector3D): Vector3D { return new Vector3D(this.x * v.x, this.y * v.y, this.z * v.z); }
  negate(): Vector3D { return new Vector3D(-this.x, -this.y, -this.z); }

  // ============== Operations ==============
  dot(v: Vector3D): number { return this.x * v.x + this.y * v.y + this.z * v.z; }

  cross(v: Vector3D): Vector3D {
    return new Vector3D(
      this.y * v.z - this.z * v.y,
      this.z * v.x - this.x * v.z,
      this.x * v.y - this.y * v.x,
    );
  }

  magnitude(): number { return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z); }
  magnitudeSq(): number { return this.x * this.x + this.y * this.y + this.z * this.z; }

  normalize(): Vector3D {
    const m = this.magnitude();
    if (m === 0) return new Vector3D(0, 0, 0);
    return this.scale(1 / m);
  }

  limit(max: number): Vector3D {
    const m = this.magnitude();
    if (m > max) return this.scale(max / m);
    return this;
  }

  distance(v: Vector3D): number {
    const dx = v.x - this.x;
    const dy = v.y - this.y;
    const dz = v.z - this.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  distanceSq(v: Vector3D): number {
    const dx = v.x - this.x;
    const dy = v.y - this.y;
    const dz = v.z - this.z;
    return dx * dx + dy * dy + dz * dz;
  }

  lerp(v: Vector3D, t: number): Vector3D {
    return new Vector3D(
      this.x + (v.x - this.x) * t,
      this.y + (v.y - this.y) * t,
      this.z + (v.z - this.z) * t,
    );
  }

  /**
   * Project onto another vector.
   */
  project(v: Vector3D): Vector3D {
    const denom = v.magnitudeSq();
    if (denom === 0) return new Vector3D(0, 0, 0);
    return v.scale(this.dot(v) / denom);
  }

  /**
   * Reflect over a normal.
   */
  reflect(normal: Vector3D): Vector3D {
    const d = this.dot(normal);
    return new Vector3D(
      this.x - 2 * d * normal.x,
      this.y - 2 * d * normal.y,
      this.z - 2 * d * normal.z,
    );
  }

  /**
   * Get angle between vectors in radians.
   */
  angle(v: Vector3D): number {
    const m = this.magnitude() * v.magnitude();
    if (m === 0) return 0;
    return Math.acos(Math.max(-1, Math.min(1, this.dot(v) / m)));
  }

  toArray(): [number, number, number] { return [this.x, this.y, this.z]; }
  toString(): string { return `(${this.x}, ${this.y}, ${this.z})`; }
}
