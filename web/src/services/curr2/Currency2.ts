/**
 * Currency2 — advanced currency formatting
 */

export class Currency2 {
  /**
   * Format number as currency with locale.
   */
  static format(amount: number, currency: string, locale: string = 'en-US'): string {
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
      }).format(amount);
    } catch {
      return `${currency} ${amount.toFixed(2)}`;
    }
  }

  /**
   * Format with custom decimals.
   */
  static formatCustom(amount: number, decimals: number = 2, thousandsSep: string = ',', decimalSep: string = '.'): string {
    const neg = amount < 0;
    const abs = Math.abs(amount);
    const [intPart, fracPart] = abs.toFixed(decimals).split('.');
    const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSep);
    const result = fracPart ? `${grouped}${decimalSep}${fracPart}` : grouped;
    return neg ? `-${result}` : result;
  }

  /**
   * Format as percent.
   */
  static formatPercent(value: number, decimals: number = 2): string {
    return `${(value * 100).toFixed(decimals)}%`;
  }

  /**
   * Parse formatted currency string to number.
   */
  static parse(formatted: string): number {
    const cleaned = formatted.replace(/[^0-9.\-]/g, '');
    return parseFloat(cleaned);
  }

  /**
   * Format compact (K, M, B).
   */
  static formatCompact(amount: number, currency: string = 'USD', locale: string = 'en-US'): string {
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        notation: 'compact',
        maximumFractionDigits: 1,
      }).format(amount);
    } catch {
      return `${currency} ${amount}`;
    }
  }

  /**
   * Format accounting (negative in parens).
   */
  static formatAccounting(amount: number, currency: string = 'USD'): string {
    if (amount < 0) {
      return `(${Currency2.format(Math.abs(amount), currency)})`;
    }
    return Currency2.format(amount, currency);
  }
}
