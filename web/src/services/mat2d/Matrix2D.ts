/**
 * Matrix2D — 3x3 matrix for 2D affine transformations
 *
 * Inspired by: gl-matrix / Three.js Matrix3
 *
 * 2D affine = 3x3 matrix [a c e; b d f; 0 0 1]
 */

import { type Vec2 } from '../geo2d/Geometry2D';

export class Matrix2D {
  // 6 elements: a c e b d f (row-major)
  private m: number[];

  constructor(a: number = 1, b: number = 0, c: number = 0, d: number = 1, e: number = 0, f: number = 0) {
    this.m = [a, c, e, b, d, f];
  }

  get a(): number { return this.m[0]; }
  get c(): number { return this.m[1]; }
  get e(): number { return this.m[2]; }
  get b(): number { return this.m[3]; }
  get d(): number { return this.m[4]; }
  get f(): number { return this.m[5]; }

  /**
   * Identity matrix.
   */
  static identity(): Matrix2D {
    return new Matrix2D(1, 0, 0, 1, 0, 0);
  }

  /**
   * Translation matrix.
   */
  static translate(tx: number, ty: number): Matrix2D {
    return new Matrix2D(1, 0, 0, 1, tx, ty);
  }

  /**
   * Scaling matrix.
   */
  static scale(sx: number, sy: number = sx): Matrix2D {
    return new Matrix2D(sx, 0, 0, sy, 0, 0);
  }

  /**
   * Rotation matrix.
   */
  static rotate(angleRad: number): Matrix2D {
    const c = Math.cos(angleRad);
    const s = Math.sin(angleRad);
    return new Matrix2D(c, s, -s, c, 0, 0);
  }

  /**
   * Multiply two matrices: this * other.
   */
  multiply(other: Matrix2D): Matrix2D {
    const [a1, c1, e1, b1, d1, f1] = this.m;
    const [a2, c2, e2, b2, d2, f2] = other.m;
    return new Matrix2D(
      a1 * a2 + c1 * b2,           // a
      b1 * a2 + d1 * b2,           // b
      a1 * c2 + c1 * d2,           // c
      b1 * c2 + d1 * d2,           // d
      a1 * e2 + c1 * f2 + e1,      // e
      b1 * e2 + d1 * f2 + f1,      // f
    );
  }

  /**
   * Apply matrix to point.
   */
  apply(p: Vec2): Vec2 {
    return {
      x: this.a * p.x + this.c * p.y + this.e,
      y: this.b * p.x + this.d * p.y + this.f,
    };
  }

  /**
   * Inverse matrix (assuming invertible).
   */
  inverse(): Matrix2D | null {
    const det = this.a * this.d - this.b * this.c;
    if (det === 0) return null;
    const inv = 1 / det;
    const a = this.d * inv;
    const b = -this.b * inv;
    const c = -this.c * inv;
    const d = this.a * inv;
    const e = (this.c * this.f - this.d * this.e) * inv;
    const f = (this.b * this.e - this.a * this.f) * inv;
    return new Matrix2D(a, b, c, d, e, f);
  }

  /**
   * Get determinant.
   */
  determinant(): number {
    return this.a * this.d - this.b * this.c;
  }

  /**
   * To array (6 elements).
   */
  toArray(): number[] {
    return [...this.m];
  }

  /**
   * To 3x3 array.
   */
  toMatrix3(): number[][] {
    return [
      [this.m[0], this.m[1], this.m[2]],
      [this.m[3], this.m[4], this.m[5]],
      [0, 0, 1],
    ];
  }
}
