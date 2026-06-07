/**
 * MoneyCalc — money math using cents (integers)
 */

export class MoneyCalc {
  /**
   * Convert dollars to cents.
   */
  static toCents(dollars: number): number {
    return Math.round(dollars * 100);
  }

  /**
   * Convert cents to dollars.
   */
  static fromCents(cents: number): number {
    return cents / 100;
  }

  /**
   * Add money.
   */
  static add(a: number, b: number): number {
    return MoneyCalc.toCents(a) + MoneyCalc.toCents(b);
  }

  /**
   * Subtract.
   */
  static subtract(a: number, b: number): number {
    return MoneyCalc.toCents(a) - MoneyCalc.toCents(b);
  }

  /**
   * Multiply by scalar.
   */
  static multiply(a: number, factor: number): number {
    return Math.round(MoneyCalc.toCents(a) * factor);
  }

  /**
   * Distribute total evenly, with remainder distributed to first n items.
   */
  static distribute(total: number, n: number): number[] {
    const totalCents = MoneyCalc.toCents(total);
    const base = Math.floor(totalCents / n);
    const remainder = totalCents - base * n;
    const result: number[] = [];
    for (let i = 0; i < n; i++) {
      result.push(base + (i < remainder ? 1 : 0));
    }
    return result;
  }

  /**
   * Allocate by ratios (proportional, with remainder distributed to largest fractional parts).
   */
  static allocate(total: number, ratios: number[]): number[] {
    const totalCents = MoneyCalc.toCents(total);
    const sum = ratios.reduce((a, b) => a + b, 0);
    if (sum === 0) return ratios.map(() => 0);
    const exact = ratios.map((r) => (r / sum) * totalCents);
    const floors = exact.map((v) => Math.floor(v));
    let remainder = totalCents - floors.reduce((a, b) => a + b, 0);
    // Sort indices by fractional part (descending) and give 1 cent to top 'remainder' items
    const indices = exact.map((_, i) => i).sort((a, b) => (exact[b] - floors[b]) - (exact[a] - floors[a]));
    const result = [...floors];
    for (let i = 0; i < remainder; i++) result[indices[i]]++;
    return result;
  }

  /**
   * Simple interest.
   */
  static simpleInterest(principal: number, rate: number, time: number): number {
    return Math.round(principal * rate * time);
  }

  /**
   * Compound interest.
   */
  static compoundInterest(principal: number, rate: number, periods: number, timesPerPeriod: number = 1): number {
    return Math.round(principal * Math.pow(1 + rate / timesPerPeriod, timesPerPeriod * periods));
  }

  /**
   * Apply tax to amount.
   */
  static applyTax(amount: number, taxRate: number): number {
    return Math.round(amount * (1 + taxRate));
  }

  /**
   * Discount.
   */
  static discount(amount: number, discountRate: number): number {
    return Math.round(amount * (1 - discountRate));
  }
}
