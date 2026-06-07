/**
 * ICAAN — simplified ICAAN-style validation
 *
 * Validates DNS-style names, email addresses, TLDs.
 */

const COMMON_TLDS = new Set(['com', 'org', 'net', 'edu', 'gov', 'io', 'co', 'dev', 'app', 'ai', 'cn', 'uk', 'us', 'jp', 'de', 'fr']);
const COUNTRY_CODES = new Set(['cn', 'uk', 'us', 'jp', 'de', 'fr', 'it', 'es', 'ru', 'br', 'in', 'au', 'ca']);

export class ICAAN {
  /**
   * Validate email.
   */
  static isValidEmail(email: string): boolean {
    if (typeof email !== 'string') return false;
    if (email.length === 0 || email.length > 254) return false;
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(email);
  }

  /**
   * Validate domain.
   */
  static isValidDomain(domain: string): boolean {
    if (typeof domain !== 'string') return false;
    if (domain.length === 0 || domain.length > 253) return false;
    return /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/.test(domain);
  }

  /**
   * Extract TLD.
   */
  static getTLD(domain: string): string {
    const parts = domain.split('.');
    return parts[parts.length - 1]?.toLowerCase() ?? '';
  }

  /**
   * Check if TLD is common.
   */
  static isCommonTLD(tld: string): boolean {
    return COMMON_TLDS.has(tld.toLowerCase());
  }

  /**
   * Check if TLD is country code.
   */
  static isCountryCodeTLD(tld: string): boolean {
    return COUNTRY_CODES.has(tld.toLowerCase());
  }

  /**
   * Extract domain from email.
   */
  static getDomainFromEmail(email: string): string {
    const at = email.indexOf('@');
    return at >= 0 ? email.slice(at + 1) : '';
  }

  /**
   * Extract username from email.
   */
  static getUsernameFromEmail(email: string): string {
    const at = email.indexOf('@');
    return at >= 0 ? email.slice(0, at) : '';
  }

  /**
   * Validate URL hostname.
   */
  static isValidHostname(hostname: string): boolean {
    if (hostname.length === 0 || hostname.length > 253) return false;
    if (hostname.startsWith('.') || hostname.endsWith('.')) return false;
    return /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(hostname);
  }

  /**
   * Check if domain is IP.
   */
  static isIPAddress(s: string): boolean {
    if (typeof s !== 'string') return false;
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(s)) {
      return s.split('.').every((p) => {
        const n = parseInt(p, 10);
        return n >= 0 && n <= 255;
      });
    }
    // IPv6
    if (s.includes(':')) {
      return /^[0-9a-fA-F:]+$/.test(s);
    }
    return false;
  }

  /**
   * Sanitize email.
   */
  static sanitize(email: string): string {
    return email.trim().toLowerCase();
  }
}
