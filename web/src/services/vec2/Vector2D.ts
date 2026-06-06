/**
 * Vector2D — immutable 2D vector
 *
 * Inspired by: Three.js Vector2 / Unity Vector2
 *
 * Immutable: all operations return new vectors.
 */

export class Vector2D {
  readonly x: number;
  readonly y: number;

  constructor(x: number = 0, y: number = 0) {
    this.x = x;
    this.y = y;
  }

  // ============== Static factories ==============
  static zero(): Vector2D { return new Vector2D(0, 0); }
  static one(): Vector2D { return new Vector2D(1, 1); }
  static up(): Vector2D { return new Vector2D(0, 1); }
  static down(): Vector2D { return new Vector2D(0, -1); }
  static left(): Vector2D { return new Vector2D(-1, 0); }
  static right(): Vector2D { return new Vector2D(1, 0); }

  static fromAngle(angleRad: number, magnitude: number = 1): Vector2D {
    return new Vector2D(Math.cos(angleRad) * magnitude, Math.sin(angleRad) * magnitude);
  }

  // ============== Arithmetic ==============
  add(v: Vector2D): Vector2D { return new Vector2D(this.x + v.x, this.y + v.y); }
  sub(v: Vector2D): Vector2D { return new Vector2D(this.x - v.x, this.y - v.y); }
  scale(s: number): Vector2D { return new Vector2D(this.x * s, this.y * s); }
  multiply(v: Vector2D): Vector2D { return new Vector2D(this.x * v.x, this.y * v.y); }
  negate(): Vector2D { return new Vector2D(-this.x, -this.y); }
  divide(s: number): Vector2D { return new Vector2D(this.x / s, this.y / s); }
  divideV(v: Vector2D): Vector2D { return new Vector2D(this.x / v.x, this.y / v.y); }

  // ============== Operations ==============
  dot(v: Vector2D): number { return this.x * v.x + this.y * v.y; }
  cross(v: Vector2D): number { return this.x * v.y - this.y * v.x; }

  magnitude(): number { return Math.sqrt(this.x * this.x + this.y * this.y); }
  magnitudeSq(): number { return this.x * this.x + this.y * this.y; }

  normalize(): Vector2D {
    const m = this.magnitude();
    if (m === 0) return new Vector2D(0, 0);
    return this.scale(1 / m);
  }

  limit(max: number): Vector2D {
    const m = this.magnitude();
    if (m > max) return this.scale(max / m);
    return this;
  }

  /**
   * Angle in radians.
   */
  angle(): number { return Math.atan2(this.y, this.x); }

  /**
   * Distance to another vector.
   */
  distance(v: Vector2D): number {
    const dx = v.x - this.x;
    const dy = v.y - this.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  distanceSq(v: Vector2D): number {
    const dx = v.x - this.x;
    const dy = v.y - this.y;
    return dx * dx + dy * dy;
  }

  /**
   * Linear interpolation.
   */
  lerp(v: Vector2D, t: number): Vector2D {
    return new Vector2D(
      this.x + (v.x - this.x) * t,
      this.y + (v.y - this.y) * t,
    );
  }

  /**
   * Reflect over a normal vector.
   */
  reflect(normal: Vector2D): Vector2D {
    const d = this.dot(normal);
    return new Vector2D(this.x - 2 * d * normal.x, this.y - 2 * d * normal.y);
  }

  /**
   * Rotate by angle in radians.
   */
  rotate(angleRad: number): Vector2D {
    const c = Math.cos(angleRad);
    const s = Math.sin(angleRad);
    return new Vector2D(this.x * c - this.y * s, this.x * s + this.y * c);
  }

  /**
   * Perpendicular vector (90 deg CCW).
   */
  perpendicular(): Vector2D { return new Vector2D(-this.y, this.x); }

  /**
   * Project onto another vector.
   */
  project(v: Vector2D): Vector2D {
    const denom = v.magnitudeSq();
    if (denom === 0) return new Vector2D(0, 0);
    return v.scale(this.dot(v) / denom);
  }

  /**
   * Convert to array.
   */
  toArray(): [number, number] { return [this.x, this.y]; }

  /**
   * Check equality within epsilon.
   */
  equals(v: Vector2D, epsilon: number = 0): boolean {
    return Math.abs(this.x - v.x) <= epsilon && Math.abs(this.y - v.y) <= epsilon;
  }

  toString(): string { return `(${this.x}, ${this.y})`; }
}
