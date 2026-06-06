/**
 * AffineTransform — composable 2D affine transformations
 *
 * Inspired by: Three.js Object3D / SVG transform
 *
 * Chain of: translate, scale, rotate, shear.
 */

import { type Vec2 } from '../geo2d/Geometry2D';
import { Matrix2D } from '../mat2d/Matrix2D';

export class AffineTransform {
  private matrix: Matrix2D;

  constructor(matrix: Matrix2D = Matrix2D.identity()) {
    this.matrix = matrix;
  }

  /**
   * Identity transform.
   */
  static identity(): AffineTransform {
    return new AffineTransform();
  }

  /**
   * Translation.
   */
  static translate(tx: number, ty: number): AffineTransform {
    return new AffineTransform(Matrix2D.translate(tx, ty));
  }

  /**
   * Scale.
   */
  static scale(sx: number, sy: number = sx): AffineTransform {
    return new AffineTransform(Matrix2D.scale(sx, sy));
  }

  /**
   * Rotation.
   */
  static rotate(angleRad: number): AffineTransform {
    return new AffineTransform(Matrix2D.rotate(angleRad));
  }

  /**
   * Shear.
   */
  static shear(sx: number, sy: number = 0): AffineTransform {
    return new AffineTransform(new Matrix2D(1, sy, sx, 1, 0, 0));
  }

  /**
   * Compose with another transform.
   */
  compose(other: AffineTransform): AffineTransform {
    return new AffineTransform(this.matrix.multiply(other.matrix));
  }

  /**
   * Apply to point.
   */
  apply(p: Vec2): Vec2 {
    return this.matrix.apply(p);
  }

  /**
   * Apply to all points.
   */
  applyAll(points: Vec2[]): Vec2[] {
    return points.map((p) => this.apply(p));
  }

  /**
   * Inverse.
   */
  inverse(): AffineTransform | null {
    const inv = this.matrix.inverse();
    if (inv === null) return null;
    return new AffineTransform(inv);
  }

  /**
   * Get matrix.
   */
  getMatrix(): Matrix2D {
    return new Matrix2D(
      this.matrix.a, this.matrix.b, this.matrix.c, this.matrix.d, this.matrix.e, this.matrix.f,
    );
  }

  /**
   * Decompose into translate, rotate, scale (approximate).
   */
  decompose(): { translate: Vec2; rotation: number; scale: Vec2 } {
    const tx = this.matrix.e;
    const ty = this.matrix.f;
    const sx = Math.sqrt(this.matrix.a * this.matrix.a + this.matrix.b * this.matrix.b);
    const rot = Math.atan2(this.matrix.b, this.matrix.a);
    const sy = (this.matrix.a * this.matrix.d - this.matrix.b * this.matrix.c) / sx;
    return { translate: { x: tx, y: ty }, rotation: rot, scale: { x: sx, y: sy } };
  }

  /**
   * Translate by (tx, ty).
   */
  translateBy(tx: number, ty: number): AffineTransform {
    return this.compose(AffineTransform.translate(tx, ty));
  }

  /**
   * Scale by (sx, sy).
   */
  scaleBy(sx: number, sy: number = sx): AffineTransform {
    return this.compose(AffineTransform.scale(sx, sy));
  }

  /**
   * Rotate by angle.
   */
  rotateBy(angleRad: number): AffineTransform {
    return this.compose(AffineTransform.rotate(angleRad));
  }
}
