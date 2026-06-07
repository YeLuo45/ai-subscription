/**
 * Polynomial — polynomial evaluation and root finding
 *
 * Coefficients in ascending order: p[0] + p[1]*x + p[2]*x^2 + ...
 */

export class Polynomial {
  private _coeffs: number[];

  constructor(coeffs: number[]) {
    this._coeffs = [...coeffs];
  }

  /**
   * Evaluate at x using Horner's method.
   */
  evaluate(x: number): number {
    let result = 0;
    for (let i = this._coeffs.length - 1; i >= 0; i--) {
      result = result * x + this._coeffs[i];
    }
    return result;
  }

  /**
   * Get degree.
   */
  degree(): number {
    return this._coeffs.length - 1;
  }

  /**
   * Get coefficients.
   */
  coefficients(): number[] {
    return [...this._coeffs];
  }

  /**
   * Derivative as new Polynomial.
   */
  derivative(): Polynomial {
    const d: number[] = [];
    for (let i = 1; i < this._coeffs.length; i++) {
      d.push(this._coeffs[i] * i);
    }
    return new Polynomial(d);
  }

  /**
   * Add another polynomial.
   */
  add(other: Polynomial): Polynomial {
    const len = Math.max(this._coeffs.length, other._coeffs.length);
    const result: number[] = [];
    for (let i = 0; i < len; i++) {
      result.push((this._coeffs[i] ?? 0) + (other._coeffs[i] ?? 0));
    }
    return new Polynomial(result);
  }

  /**
   * Multiply by scalar.
   */
  scale(s: number): Polynomial {
    return new Polynomial(this._coeffs.map((c) => c * s));
  }

  /**
   * Multiply two polynomials.
   */
  multiply(other: Polynomial): Polynomial {
    const result = new Array(this._coeffs.length + other._coeffs.length - 1).fill(0);
    for (let i = 0; i < this._coeffs.length; i++) {
      for (let j = 0; j < other._coeffs.length; j++) {
        result[i + j] += this._coeffs[i] * other._coeffs[j];
      }
    }
    return new Polynomial(result);
  }

  /**
   * To string (formatted).
   */
  toString(): string {
    const parts: string[] = [];
    for (let i = 0; i < this._coeffs.length; i++) {
      const c = this._coeffs[i];
      if (c === 0) continue;
      let term: string;
      if (i === 0) term = `${c}`;
      else if (i === 1) term = `${c}x`;
      else term = `${c}x^${i}`;
      parts.push(term);
    }
    return parts.length === 0 ? '0' : parts.join(' + ');
  }

  /**
   * Find root (Newton-Raphson).
   */
  findRoot(guess: number, tolerance: number = 1e-10, maxIter: number = 100): number | null {
    const deriv = this.derivative();
    let x = guess;
    for (let i = 0; i < maxIter; i++) {
      const f = this.evaluate(x);
      if (Math.abs(f) < tolerance) return x;
      const fp = deriv.evaluate(x);
      if (fp === 0) return null;
      x = x - f / fp;
    }
    return null;
  }

  /**
   * Compose: this(other(x)).
   */
  compose(other: Polynomial): Polynomial {
    let result = new Polynomial([0]);
    for (let i = this._coeffs.length - 1; i >= 0; i--) {
      result = result.multiply(other).add(new Polynomial([this._coeffs[i]]));
    }
    return result;
  }
}
