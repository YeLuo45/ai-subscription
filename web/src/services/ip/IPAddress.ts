/**
 * IPAddress — IPv4 and IPv6 utilities
 *
 * Inspired by: ipaddr.js
 */

export class IPAddress {
  /**
   * Validate IPv4.
   */
  static isIPv4(s: string): boolean {
    const parts = s.split('.');
    if (parts.length !== 4) return false;
    for (const p of parts) {
      if (!/^\d{1,3}$/.test(p)) return false;
      const n = parseInt(p, 10);
      if (n < 0 || n > 255) return false;
    }
    return true;
  }

  /**
   * Validate IPv6.
   */
  static isIPv6(s: string): boolean {
    if (s.length === 0) return false;
    if (s.includes('::')) {
      const groups = s.split('::');
      if (groups.length > 2) return false;
    }
    // Simplified: only check basic structure
    return /^([0-9a-fA-F]{1,4}:){2,7}[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:){1,7}:$|^([0-9a-fA-F]{1,4}:){1,6}(:[0-9a-fA-F]{1,4}){1,6}$|::$|^[0-9a-fA-F]{1,4}(:[0-9a-fA-F]{1,4}){0,6}$/.test(s);
  }

  /**
   * Validate any IP.
   */
  static isValid(s: string): boolean {
    return IPAddress.isIPv4(s) || IPAddress.isIPv6(s);
  }

  /**
   * Convert IPv4 to integer.
   */
  static ipv4ToInt(ip: string): number {
    const parts = ip.split('.').map((p) => parseInt(p, 10));
    return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
  }

  /**
   * Convert integer to IPv4.
   */
  static intToIPv4(n: number): string {
    return [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff].join('.');
  }

  /**
   * Check if IPv4 is private.
   */
  static isPrivate(ip: string): boolean {
    if (!IPAddress.isIPv4(ip)) return false;
    const n = IPAddress.ipv4ToInt(ip);
    return (
      (n >= IPAddress.ipv4ToInt('10.0.0.0') && n <= IPAddress.ipv4ToInt('10.255.255.255')) ||
      (n >= IPAddress.ipv4ToInt('172.16.0.0') && n <= IPAddress.ipv4ToInt('172.31.255.255')) ||
      (n >= IPAddress.ipv4ToInt('192.168.0.0') && n <= IPAddress.ipv4ToInt('192.168.255.255')) ||
      (n >= IPAddress.ipv4ToInt('127.0.0.0') && n <= IPAddress.ipv4ToInt('127.255.255.255'))
    );
  }

  /**
   * Check if IPv4 is loopback.
   */
  static isLoopback(ip: string): boolean {
    if (!IPAddress.isIPv4(ip)) return false;
    return ip.startsWith('127.');
  }

  /**
   * Class of IPv4 (A/B/C/D/E).
   */
  static classOf(ip: string): string {
    if (!IPAddress.isIPv4(ip)) return '';
    const first = parseInt(ip.split('.')[0], 10);
    if (first < 128) return 'A';
    if (first < 192) return 'B';
    if (first < 224) return 'C';
    if (first < 240) return 'D (multicast)';
    return 'E (reserved)';
  }

  /**
   * Expand IPv6 (shorthand to full).
   */
  static expandIPv6(ip: string): string {
    // Fill in zeros
    const sides = ip.split('::');
    const left = sides[0] ? sides[0].split(':') : [];
    const right = sides[1] ? sides[1].split(':') : [];
    const missing = 8 - left.length - right.length;
    const middle = Array(missing).fill('0');
    return [...left, ...middle, ...right].map((g) => g.padStart(4, '0')).join(':');
  }
}
