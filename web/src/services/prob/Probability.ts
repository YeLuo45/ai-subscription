/**
 * Probability — probability utilities
 */

export class Probability {
  /**
   * P(A and B) for independent events.
   */
  static independentAnd(pA: number, pB: number): number {
    return pA * pB;
  }

  /**
   * P(A or B) for independent events.
   */
  static independentOr(pA: number, pB: number): number {
    return pA + pB - pA * pB;
  }

  /**
   * P(A or B) for mutually exclusive events.
   */
  static exclusiveOr(pA: number, pB: number): number {
    return pA + pB;
  }

  /**
   * Conditional P(A|B) = P(A and B) / P(B).
   */
  static conditional(pAandB: number, pB: number): number {
    if (pB === 0) return 0;
    return pAandB / pB;
  }

  /**
   * Bayes: P(A|B) = P(B|A) * P(A) / P(B).
   */
  static bayes(pBA: number, pA: number, pB: number): number {
    if (pB === 0) return 0;
    return (pBA * pA) / pB;
  }

  /**
   * Binomial probability.
   */
  static binomial(n: number, k: number, p: number): number {
    return Probability.combinations(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k);
  }

  /**
   * Combinations helper.
   */
  private static combinations(n: number, k: number): number {
    if (k > n || k < 0) return 0;
    k = Math.min(k, n - k);
    let result = 1;
    for (let i = 0; i < k; i++) result = (result * (n - i)) / (i + 1);
    return result;
  }

  /**
   * Poisson probability.
   */
  static poisson(k: number, lambda: number): number {
    if (lambda <= 0) return 0;
    return (Math.exp(-lambda) * Math.pow(lambda, k)) / Probability.factorial(k);
  }

  private static factorial(n: number): number {
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return r;
  }

  /**
   * Normal distribution PDF.
   */
  static normalPdf(x: number, mu: number = 0, sigma: number = 1): number {
    return Math.exp(-((x - mu) ** 2) / (2 * sigma ** 2)) / (sigma * Math.sqrt(2 * Math.PI));
  }

  /**
   * Standard normal CDF (approximation).
   */
  static normalCdf(x: number, mu: number = 0, sigma: number = 1): number {
    const z = (x - mu) / (sigma * Math.sqrt(2));
    return 0.5 * (1 + Probability._erf(z));
  }

  private static _erf(x: number): number {
    // Abramowitz approximation
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;
    const sign = x >= 0 ? 1 : -1;
    const ax = Math.abs(x);
    const t = 1 / (1 + p * ax);
    const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
    return sign * y;
  }

  /**
   * Expected value of a discrete distribution.
   */
  static expectedValue(values: number[], probs: number[]): number {
    return values.reduce((sum, v, i) => sum + v * probs[i], 0);
  }

  /**
   * Variance of a discrete distribution.
   */
  static variance(values: number[], probs: number[]): number {
    const mean = Probability.expectedValue(values, probs);
    return values.reduce((sum, v, i) => sum + probs[i] * (v - mean) ** 2, 0);
  }
}
