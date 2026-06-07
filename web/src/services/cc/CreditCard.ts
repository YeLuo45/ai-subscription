/**
 * CreditCard — credit card validation and parsing
 *
 * Inspired by: credit-card-type / validator
 */

const CARD_TYPES: Array<{ name: string; pattern: RegExp; lengths: number[] }> = [
  { name: 'Visa', pattern: /^4\d{12}(\d{3})?(\d{3})?$/, lengths: [13, 16, 19] },
  { name: 'Mastercard', pattern: /^(5[1-5]\d{14}|2(2[2-9]\d|[3-6]\d{2}|7([01]\d|20))\d{12})$/, lengths: [16] },
  { name: 'American Express', pattern: /^3[47]\d{13}$/, lengths: [15] },
  { name: 'Discover', pattern: /^(6011|65|64[4-9]|622)\d{12,16}$/, lengths: [16, 19] },
  { name: 'JCB', pattern: /^35(2[89]|[3-8]\d)\d{12}$/, lengths: [16, 17, 18, 19] },
  { name: 'Diners Club', pattern: /^3(0[0-5]|[68]\d)\d{11}$/, lengths: [14, 16, 19] },
  { name: 'UnionPay', pattern: /^62\d{14,17}$/, lengths: [16, 17, 18, 19] },
];

export class CreditCard {
  /**
   * Luhn algorithm check.
   */
  static luhnCheck(card: string): boolean {
    const d = card.replace(/\D/g, '');
    if (d.length < 12) return false;
    let sum = 0;
    let alt = false;
    for (let i = d.length - 1; i >= 0; i--) {
      let n = parseInt(d[i], 10);
      if (alt) {
        n *= 2;
        if (n > 9) n -= 9;
      }
      sum += n;
      alt = !alt;
    }
    return sum % 10 === 0;
  }

  /**
   * Detect card type.
   */
  static detectType(card: string): string | null {
    const d = card.replace(/\D/g, '');
    for (const t of CARD_TYPES) {
      if (t.pattern.test(d) && t.lengths.includes(d.length)) return t.name;
    }
    return null;
  }

  /**
   * Validate card.
   */
  static isValid(card: string): boolean {
    const d = card.replace(/\D/g, '');
    if (d.length < 13 || d.length > 19) return false;
    if (!CreditCard.luhnCheck(d)) return false;
    return CreditCard.detectType(d) !== null;
  }

  /**
   * Format with spaces (4-4-4-4 or 4-6-5 for Amex).
   */
  static format(card: string): string {
    const d = card.replace(/\D/g, '');
    if (d.length === 15 && (d.startsWith('34') || d.startsWith('37'))) {
      return `${d.slice(0, 4)} ${d.slice(4, 10)} ${d.slice(10)}`;
    }
    return d.match(/.{1,4}/g)?.join(' ') ?? d;
  }

  /**
   * Mask card.
   */
  static mask(card: string, visible: number = 4): string {
    const d = card.replace(/\D/g, '');
    const last = d.slice(-visible);
    return '*'.repeat(d.length - visible) + last;
  }

  /**
   * Validate CVV.
   */
  static isValidCVV(cvv: string, type: string | null = null): boolean {
    if (type === 'American Express') return /^\d{4}$/.test(cvv);
    return /^\d{3,4}$/.test(cvv);
  }

  /**
   * Validate expiry MM/YY.
   */
  static isValidExpiry(expiry: string): boolean {
    const m = /^(\d{2})\/(\d{2})$/.exec(expiry);
    if (!m) return false;
    const month = parseInt(m[1], 10);
    const year = parseInt(m[2], 10) + 2000;
    if (month < 1 || month > 12) return false;
    const now = new Date();
    const expDate = new Date(year, month, 0);
    return expDate >= now;
  }

  /**
   * Get all supported card types.
   */
  static listTypes(): string[] {
    return CARD_TYPES.map((t) => t.name);
  }
}
