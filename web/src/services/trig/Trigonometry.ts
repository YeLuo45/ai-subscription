/**
 * Trigonometry — extended trig utilities
 */

export class Trigonometry {
  /**
   * Convert degrees to radians.
   */
  static degToRad(deg: number): number { return deg * Math.PI / 180; }

  /**
   * Convert radians to degrees.
   */
  static radToDeg(rad: number): number { return rad * 180 / Math.PI; }

  /**
   * Normalize angle to [0, 2*pi).
   */
  static normalize(angle: number): number {
    const twoPi = 2 * Math.PI;
    return ((angle % twoPi) + twoPi) % twoPi;
  }

  /**
   * Normalize to [-pi, pi].
   */
  static normalizeSym(angle: number): number {
    let a = ((angle + Math.PI) % (2 * Math.PI)) - Math.PI;
    if (a < -Math.PI) a += 2 * Math.PI;
    return a;
  }

  /**
   * Sin/Cos for degrees.
   */
  static sinD(deg: number): number { return Math.sin(Trigonometry.degToRad(deg)); }
  static cosD(deg: number): number { return Math.cos(Trigonometry.degToRad(deg)); }
  static tanD(deg: number): number { return Math.tan(Trigonometry.degToRad(deg)); }

  /**
   * Inverse (degrees).
   */
  static asinD(x: number): number { return Trigonometry.radToDeg(Math.asin(x)); }
  static acosD(x: number): number { return Trigonometry.radToDeg(Math.acos(x)); }
  static atanD(x: number): number { return Trigonometry.radToDeg(Math.atan(x)); }
  static atan2D(y: number, x: number): number { return Trigonometry.radToDeg(Math.atan2(y, x)); }

  /**
   * Law of cosines: c^2 = a^2 + b^2 - 2ab*cos(C). Find c.
   */
  static lawOfCosinesC(a: number, b: number, cDeg: number): number {
    return Math.sqrt(a ** 2 + b ** 2 - 2 * a * b * Trigonometry.cosD(cDeg));
  }

  /**
   * Law of sines: a/sin(A) = b/sin(B). Find b.
   */
  static lawOfSinesB(a: number, aDeg: number, bDeg: number): number {
    return a * Trigonometry.sinD(bDeg) / Trigonometry.sinD(aDeg);
  }

  /**
   * Hypotenuse from legs.
   */
  static hypotenuse(a: number, b: number): number {
    return Math.sqrt(a ** 2 + b ** 2);
  }
}
