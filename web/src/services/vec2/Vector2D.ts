/**
 * Vector2D — 2D vector operations
 */

export class Vector2D {
  x: number;
  y: number;

  constructor(x: number = 0, y: number = 0) {
    this.x = x;
    this.y = y;
  }

  static zero(): Vector2D { return new Vector2D(0, 0); }
  static one(): Vector2D { return new Vector2D(1, 1); }
  static fromArray(arr: number[]): Vector2D { return new Vector2D(arr[0] ?? 0, arr[1] ?? 0); }

  add(v: Vector2D): Vector2D { return new Vector2D(this.x + v.x, this.y + v.y); }
  subtract(v: Vector2D): Vector2D { return new Vector2D(this.x - v.x, this.y - v.y); }
  scale(s: number): Vector2D { return new Vector2D(this.x * s, this.y * s); }
  multiply(v: Vector2D): Vector2D { return new Vector2D(this.x * v.x, this.y * v.y); }
  negate(): Vector2D { return new Vector2D(-this.x, -this.y); }

  dot(v: Vector2D): number { return this.x * v.x + this.y * v.y; }
  cross(v: Vector2D): number { return this.x * v.y - this.y * v.x; }
  magnitude(): number { return Math.sqrt(this.x ** 2 + this.y ** 2); }
  magnitudeSq(): number { return this.x ** 2 + this.y ** 2; }

  normalize(): Vector2D {
    const m = this.magnitude();
    if (m === 0) return Vector2D.zero();
    return this.scale(1 / m);
  }

  distanceTo(v: Vector2D): number {
    return Math.sqrt((this.x - v.x) ** 2 + (this.y - v.y) ** 2);
  }

  angle(): number { return Math.atan2(this.y, this.x); }

  angleTo(v: Vector2D): number {
    return Math.atan2(v.y - this.y, v.x - this.x);
  }

  rotate(angle: number): Vector2D {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return new Vector2D(this.x * c - this.y * s, this.x * s + this.y * c);
  }

  lerp(v: Vector2D, t: number): Vector2D {
    return new Vector2D(this.x + (v.x - this.x) * t, this.y + (v.y - this.y) * t);
  }

  equals(v: Vector2D, eps: number = 1e-10): boolean {
    return Math.abs(this.x - v.x) < eps && Math.abs(this.y - v.y) < eps;
  }

  toArray(): number[] { return [this.x, this.y]; }
  toString(): string { return `(${this.x}, ${this.y})`; }
}
