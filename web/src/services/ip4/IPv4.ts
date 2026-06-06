/**
 * IPv4 — IPv4 address utilities
 *
 * Inspired by: ipaddr.js / net
 *
 * Parse, validate, classify IPv4 addresses.
 */

export type AddressClass = 'A' | 'B' | 'C' | 'D' | 'E';

export class IPv4 {
  readonly octets: [number, number, number, number];
  readonly numeric: number;

  constructor(o1: number, o2: number, o3: number, o4: number) {
    if ([o1, o2, o3, o4].some((o) => o < 0 || o > 255 || !Number.isInteger(o))) {
      throw new Error('Invalid IPv4 octet');
    }
    this.octets = [o1, o2, o3, o4];
    this.numeric = (o1 << 24) >>> 0 | o2 << 16 | o3 << 8 | o4;
  }

  /**
   * Parse "192.168.1.1" → IPv4
   */
  static parse(input: string): IPv4 | null {
    const m = input.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (!m) return null;
    const parts = m.slice(1, 5).map(Number);
    if (parts.some((p) => p < 0 || p > 255)) return null;
    return new IPv4(parts[0], parts[1], parts[2], parts[3]);
  }

  /**
   * From 32-bit unsigned int.
   */
  static fromNumber(n: number): IPv4 {
    if (n < 0 || n > 0xFFFFFFFF || !Number.isInteger(n)) throw new Error('Invalid number');
    return new IPv4((n >>> 24) & 0xFF, (n >>> 16) & 0xFF, (n >>> 8) & 0xFF, n & 0xFF);
  }

  /**
   * To dotted decimal.
   */
  toString(): string { return this.octets.join('.'); }

  /**
   * Classful network class.
   */
  getClass(): AddressClass {
    if (this.octets[0] >= 1 && this.octets[0] <= 126) return 'A';
    if (this.octets[0] === 127) return 'A';
    if (this.octets[0] >= 128 && this.octets[0] <= 191) return 'B';
    if (this.octets[0] >= 192 && this.octets[0] <= 223) return 'C';
    if (this.octets[0] >= 224 && this.octets[0] <= 239) return 'D';
    return 'E';
  }

  /**
   * Is loopback (127.0.0.0/8)?
   */
  isLoopback(): boolean { return this.octets[0] === 127; }

  /**
   * Is private (RFC 1918)?
   */
  isPrivate(): boolean {
    const [a, b] = this.octets;
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    return false;
  }

  /**
   * Is public (not private, loopback, multicast, reserved)?
   */
  isPublic(): boolean {
    return !this.isPrivate() && !this.isLoopback() && !this.isMulticast() && !this.isReserved();
  }

  /**
   * Is multicast (224.0.0.0/4)?
   */
  isMulticast(): boolean { return this.octets[0] >= 224 && this.octets[0] <= 239; }

  /**
   * Is reserved?
   */
  isReserved(): boolean {
    const [a, b] = this.octets;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a >= 240) return true;
    return false;
  }

  /**
   * Is broadcast (255.255.255.255)?
   */
  isBroadcast(): boolean {
    return this.octets.every((o) => o === 255);
  }

  /**
   * Equals another.
   */
  equals(other: IPv4): boolean {
    return this.numeric === other.numeric;
  }

  /**
   * Compare (for sorting).
   */
  compareTo(other: IPv4): number {
    if (this.numeric < other.numeric) return -1;
    if (this.numeric > other.numeric) return 1;
    return 0;
  }
}
