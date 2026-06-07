/**
 * Complex — complex number operations
 */

export class Complex {
  re: number;
  im: number;

  constructor(re: number = 0, im: number = 0) {
    this.re = re;
    this.im = im;
  }

  static zero(): Complex { return new Complex(0, 0); }
  static one(): Complex { return new Complex(1, 0); }
  static i(): Complex { return new Complex(0, 1); }
  static fromPolar(r: number, theta: number): Complex {
    return new Complex(r * Math.cos(theta), r * Math.sin(theta));
  }

  add(c: Complex): Complex { return new Complex(this.re + c.re, this.im + c.im); }
  subtract(c: Complex): Complex { return new Complex(this.re - c.re, this.im - c.im); }
  multiply(c: Complex): Complex {
    return new Complex(this.re * c.re - this.im * c.im, this.re * c.im + this.im * c.re);
  }
  divide(c: Complex): Complex {
    const d = c.re ** 2 + c.im ** 2;
    if (d === 0) throw new Error('Division by zero');
    return new Complex((this.re * c.re + this.im * c.im) / d, (this.im * c.re - this.re * c.im) / d);
  }
  negate(): Complex { return new Complex(-this.re, -this.im); }
  conjugate(): Complex { return new Complex(this.re, -this.im); }

  magnitude(): number { return Math.sqrt(this.re ** 2 + this.im ** 2); }
  magnitudeSq(): number { return this.re ** 2 + this.im ** 2; }
  argument(): number { return Math.atan2(this.im, this.re); }

  equals(c: Complex, eps: number = 1e-10): boolean {
    return Math.abs(this.re - c.re) < eps && Math.abs(this.im - c.im) < eps;
  }

  /**
   * Power (integer n).
   */
  pow(n: number): Complex {
    let result = Complex.one();
    for (let i = 0; i < n; i++) result = result.multiply(this);
    return result;
  }

  /**
   * Square root.
   */
  sqrt(): Complex {
    const r = Math.sqrt(this.magnitude());
    const theta = this.argument() / 2;
    return Complex.fromPolar(r, theta);
  }

  /**
   * Exponential.
   */
  exp(): Complex {
    const r = Math.exp(this.re);
    return new Complex(r * Math.cos(this.im), r * Math.sin(this.im));
  }

  /**
   * Natural log.
   */
  ln(): Complex {
    return new Complex(Math.log(this.magnitude()), this.argument());
  }

  toString(): string {
    if (this.im === 0) return `${this.re}`;
    if (this.re === 0) return `${this.im}i`;
    const sign = this.im >= 0 ? '+' : '-';
    return `${this.re} ${sign} ${Math.abs(this.im)}i`;
  }
}
