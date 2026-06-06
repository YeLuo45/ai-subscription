/**
 * URLValidator — URL format validation
 *
 * Inspired by: WHATWG URL / URL constructor
 *
 * Wraps the URL constructor with additional helpers.
 */

const VALID_PROTOCOLS = ['http:', 'https:', 'ftp:', 'file:', 'ws:', 'wss:'];

export class URLValidator {
  /**
   * Validate URL format.
   */
  static isValid(url: string, options: { requireProtocol?: boolean; allowedProtocols?: string[] } = {}): boolean {
    if (typeof url !== 'string' || url.length === 0) return false;
    if (url.length > 2048) return false;
    if (/\s/.test(url)) return false;
    try {
      const u = new URL(url);
      const allowed = options.allowedProtocols ?? VALID_PROTOCOLS;
      if (!allowed.includes(u.protocol)) return false;
      if (!u.hostname) return false;
      return true;
    } catch {
      // Try adding protocol
      if (options.requireProtocol) return false;
      try {
        const u = new URL('http://' + url);
        if (!u.hostname || !u.hostname.includes('.')) return false;
        return true;
      } catch {
        return false;
      }
    }
  }

  /**
   * Get protocol.
   */
  static getProtocol(url: string): string | null {
    try {
      return new URL(url).protocol.replace(':', '');
    } catch {
      return null;
    }
  }

  /**
   * Get hostname.
   */
  static getHostname(url: string): string | null {
    try {
      return new URL(url).hostname;
    } catch {
      return null;
    }
  }

  /**
   * Get port.
   */
  static getPort(url: string): number | null {
    try {
      return new URL(url).port ? parseInt(new URL(url).port, 10) : null;
    } catch {
      return null;
    }
  }

  /**
   * Check if URL is HTTPS.
   */
  static isSecure(url: string): boolean {
    return this.getProtocol(url) === 'https';
  }

  /**
   * Check if hostname is IP address.
   */
  static isIP(host: string): boolean {
    // IPv4
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) {
      return host.split('.').every((p) => {
        const n = parseInt(p, 10);
        return n >= 0 && n <= 255;
      });
    }
    // IPv6
    if (/^\[.+\]$/.test(host)) return true;
    return false;
  }

  /**
   * Check if hostname is localhost.
   */
  static isLocalhost(url: string): boolean {
    const h = this.getHostname(url);
    if (!h) return false;
    return h === 'localhost' || h === '127.0.0.1' || h === '[::1]';
  }

  /**
   * Normalize URL (resolve relative references, strip fragments).
   */
  static normalize(url: string): string {
    try {
      const u = new URL(url);
      u.hash = '';
      return u.toString();
    } catch {
      return url;
    }
  }

  /**
   * Check if URL is from a trusted domain.
   */
  static isTrustedDomain(url: string, trusted: string[]): boolean {
    const h = this.getHostname(url);
    if (!h) return false;
    return trusted.some((t) => h === t || h.endsWith('.' + t));
  }
}
