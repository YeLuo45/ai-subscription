/**
 * Currency — currency formatting and conversion utilities
 *
 * Inspired by: dinero.js / currency.js
 *
 * Supports: ISO 4217 codes, locale formatting, math operations
 */

export interface Money {
  amount: number;  // in cents
  currency: string;
}

const CURRENCY_META: Record<string, { symbol: string; decimals: number; name: string }> = {
  USD: { symbol: '$', decimals: 2, name: 'US Dollar' },
  EUR: { symbol: '€', decimals: 2, name: 'Euro' },
  GBP: { symbol: '£', decimals: 2, name: 'British Pound' },
  JPY: { symbol: '¥', decimals: 0, name: 'Japanese Yen' },
  CNY: { symbol: '¥', decimals: 2, name: 'Chinese Yuan' },
  CHF: { symbol: 'Fr', decimals: 2, name: 'Swiss Franc' },
  CAD: { symbol: '$', decimals: 2, name: 'Canadian Dollar' },
  AUD: { symbol: '$', decimals: 2, name: 'Australian Dollar' },
  HKD: { symbol: '$', decimals: 2, name: 'Hong Kong Dollar' },
  INR: { symbol: '₹', decimals: 2, name: 'Indian Rupee' },
  KRW: { symbol: '₩', decimals: 0, name: 'South Korean Won' },
  BTC: { symbol: '₿', decimals: 8, name: 'Bitcoin' },
};

export class Currency {
  /**
   * Get currency metadata.
   */
  static meta(code: string): { symbol: string; decimals: number; name: string } | null {
    return CURRENCY_META[code.toUpperCase()] ?? null;
  }

  /**
   * List supported currencies.
   */
  static list(): string[] {
    return Object.keys(CURRENCY_META);
  }

  /**
   * Check if currency code is supported.
   */
  static isSupported(code: string): boolean {
    return code.toUpperCase() in CURRENCY_META;
  }

  /**
   * Create Money from decimal amount.
   */
  static fromDecimal(amount: number, currency: string): Money {
    const meta = CURRENCY_META[currency.toUpperCase()];
    if (!meta) throw new Error(`Unsupported currency: ${currency}`);
    return { amount: Math.round(amount * Math.pow(10, meta.decimals)), currency: currency.toUpperCase() };
  }

  /**
   * Convert Money to decimal.
   */
  static toDecimal(money: Money): number {
    const meta = CURRENCY_META[money.currency];
    if (!meta) return money.amount;
    return money.amount / Math.pow(10, meta.decimals);
  }

  /**
   * Add two Money.
   */
  static add(a: Money, b: Money): Money {
    if (a.currency !== b.currency) throw new Error('Currency mismatch');
    return { amount: a.amount + b.amount, currency: a.currency };
  }

  /**
   * Subtract.
   */
  static subtract(a: Money, b: Money): Money {
    if (a.currency !== b.currency) throw new Error('Currency mismatch');
    return { amount: a.amount - b.amount, currency: a.currency };
  }

  /**
   * Multiply.
   */
  static multiply(money: Money, factor: number): Money {
    return { amount: Math.round(money.amount * factor), currency: money.currency };
  }

  /**
   * Format money for display.
   */
  static format(money: Money, locale: string = 'en-US'): string {
    const meta = CURRENCY_META[money.currency];
    if (!meta) return `${money.amount} ${money.currency}`;
    const decimal = money.amount / Math.pow(10, meta.decimals);
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: money.currency,
      }).format(decimal);
    } catch {
      return `${meta.symbol}${decimal.toFixed(meta.decimals)}`;
    }
  }

  /**
   * Convert between currencies.
   */
  static convert(money: Money, targetCurrency: string, rate: number): Money {
    const targetDecimals = CURRENCY_META[targetCurrency.toUpperCase()]?.decimals ?? 2;
    const sourceDecimals = CURRENCY_META[money.currency]?.decimals ?? 2;
    const decimal = money.amount / Math.pow(10, sourceDecimals);
    const targetAmount = decimal * rate;
    return {
      amount: Math.round(targetAmount * Math.pow(10, targetDecimals)),
      currency: targetCurrency.toUpperCase(),
    };
  }
}
