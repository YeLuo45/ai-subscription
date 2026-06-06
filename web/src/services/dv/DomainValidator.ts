/**
 * DomainValidator — domain and email validator
 *
 * Inspired by: is-email / validator
 *
 * - Email format
 * - Domain format
 * - URL format
 */

const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const URL_RE = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/[^\s]*)?$/;

export class DomainValidator {
  /**
   * Validate email.
   */
  static isEmail(input: string): boolean {
    if (input.length > 254) return false;
    return EMAIL_RE.test(input);
  }

  /**
   * Validate domain (without protocol).
   */
  static isDomain(input: string): boolean {
    if (!input || input.length > 253) return false;
    const labels = input.split('.');
    if (labels.length < 2) return false;
    for (const l of labels) {
      if (l.length < 1 || l.length > 63) return false;
      if (!/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(l)) return false;
    }
    return true;
  }

  /**
   * Validate URL.
   */
  static isUrl(input: string): boolean {
    if (!input) return false;
    return URL_RE.test(input);
  }

  /**
   * Is HTTPS?
   */
  static isHttps(url: string): boolean {
    return /^https:\/\//.test(url);
  }

  /**
   * Is HTTP?
   */
  static isHttp(url: string): boolean {
    return /^https?:\/\//.test(url);
  }

  /**
   * Extract domain from email.
   */
  emailDomain(email: string): string | null {
    const at = email.lastIndexOf('@');
    if (at < 0) return null;
    return email.slice(at + 1);
  }

  /**
   * Extract domain from URL.
   */
  static urlDomain(url: string): string | null {
    try {
      const m = url.match(/^https?:\/\/([^\/]+)/);
      return m ? m[1] : null;
    } catch {
      return null;
    }
  }

  /**
   * Has MX-like TLD (valid TLDs)?
   */
  static hasValidTld(domain: string): boolean {
    const tld = domain.split('.').pop() ?? '';
    return tld.length >= 2 && /^[a-zA-Z]+$/.test(tld);
  }

  /**
   * Get email local part.
   */
  static emailLocal(email: string): string | null {
    const at = email.lastIndexOf('@');
    if (at < 0) return null;
    return email.slice(0, at);
  }
}
