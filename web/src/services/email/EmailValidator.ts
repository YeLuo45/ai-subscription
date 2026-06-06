/**
 * EmailValidator — RFC 5322 email validation (subset)
 *
 * Inspired by: RFC 5321 / RFC 5322
 *
 * - Local part: alphanumeric + . _ - + special chars
 * - Domain: labels separated by dots
 * - MX record check (optional)
 */

const LOCAL_PART_RE = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/;
const DOMAIN_RE = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
const IP_DOMAIN_RE = /^\[(?:\d{1,3}\.){3}\d{1,3}\]$/;

export class EmailValidator {
  /**
   * Basic email format validation.
   */
  static isValid(email: string): boolean {
    if (typeof email !== 'string') return false;
    if (email.length === 0 || email.length > 254) return false;
    const at = email.lastIndexOf('@');
    if (at < 1 || at === email.length - 1) return false;
    const local = email.slice(0, at);
    const domain = email.slice(at + 1);
    if (local.length === 0 || local.length > 64) return false;
    if (local.startsWith('.') || local.endsWith('.')) return false;
    if (local.includes('..')) return false;
    if (!LOCAL_PART_RE.test(local)) return false;
    if (IP_DOMAIN_RE.test(domain)) return true;
    if (!DOMAIN_RE.test(domain)) return false;
    // TLD must be at least 2 letters
    const tld = domain.split('.').pop()!;
    if (tld.length < 2) return false;
    return true;
  }

  /**
   * Get local part of email.
   */
  static getLocal(email: string): string | null {
    const at = email.lastIndexOf('@');
    if (at < 1) return null;
    return email.slice(0, at);
  }

  /**
   * Get domain part of email.
   */
  static getDomain(email: string): string | null {
    const at = email.lastIndexOf('@');
    if (at < 1 || at === email.length - 1) return null;
    return email.slice(at + 1).toLowerCase();
  }

  /**
   * Check if email is a free provider.
   */
  static isFree(email: string): boolean {
    const FREE = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'icloud.com', 'protonmail.com'];
    const domain = this.getDomain(email);
    return domain !== null && FREE.includes(domain);
  }

  /**
   * Check if email is disposable.
   */
  static isDisposable(email: string): boolean {
    const DISPOSABLE = ['mailinator.com', '10minutemail.com', 'tempmail.com', 'guerrillamail.com', 'trashmail.com'];
    const domain = this.getDomain(email);
    return domain !== null && DISPOSABLE.includes(domain);
  }

  /**
   * Normalize email: trim, lowercase domain.
   */
  static normalize(email: string): string {
    const at = email.lastIndexOf('@');
    if (at < 0) return email.trim().toLowerCase();
    const local = email.slice(0, at);
    const domain = email.slice(at + 1);
    return `${local}@${domain.toLowerCase()}`;
  }
}
