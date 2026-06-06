/**
 * CIDR — CIDR network block
 *
 * Inspired by: net/cidr
 *
 * IPv4 CIDR only.
 * Format: 192.168.0.0/24
 */

import { IPv4 } from '../ip4/IPv4';

export class CIDR {
  readonly network: IPv4;
  readonly prefix: number;
  readonly mask: number;

  constructor(network: IPv4, prefix: number) {
    if (prefix < 0 || prefix > 32) throw new Error('Prefix must be 0-32');
    this.network = network;
    this.prefix = prefix;
    this.mask = prefix === 0 ? 0 : (0xFFFFFFFF << (32 - prefix)) >>> 0;
  }

  /**
   * Parse "192.168.0.0/24" → CIDR.
   */
  static parse(input: string): CIDR | null {
    const m = input.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\/(\d{1,2})$/);
    if (!m) return null;
    const net = IPv4.parse(m[1]);
    if (!net) return null;
    const prefix = parseInt(m[2], 10);
    if (prefix < 0 || prefix > 32) return null;
    const masked = new IPv4(
      (net.numeric & this.prefixToMask(prefix)) >>> 24 & 0xFF,
      (net.numeric & this.prefixToMask(prefix)) >>> 16 & 0xFF,
      (net.numeric & this.prefixToMask(prefix)) >>> 8 & 0xFF,
      (net.numeric & this.prefixToMask(prefix)) & 0xFF,
    );
    return new CIDR(masked, prefix);
  }

  private static prefixToMask(p: number): number {
    return p === 0 ? 0 : (0xFFFFFFFF << (32 - p)) >>> 0;
  }

  /**
   * Stringify.
   */
  toString(): string {
    return `${this.network.toString()}/${this.prefix}`;
  }

  /**
   * Number of addresses in block.
   */
  size(): number {
    return 1 << (32 - this.prefix);
  }

  /**
   * First address (network).
   */
  first(): IPv4 { return this.network; }

  /**
   * Last address (broadcast).
   */
  last(): IPv4 {
    const last = (this.network.numeric | (~this.mask >>> 0)) >>> 0;
    return IPv4.fromNumber(last);
  }

  /**
   * Contains IP?
   */
  contains(ip: IPv4): boolean {
    return (ip.numeric & this.mask) === (this.network.numeric & this.mask);
  }

  /**
   * Equals.
   */
  equals(other: CIDR): boolean {
    return this.network.numeric === other.network.numeric && this.prefix === other.prefix;
  }

  /**
   * Is subnet of other.
   */
  isSubnetOf(other: CIDR): boolean {
    if (other.prefix > this.prefix) return false;
    const broader = other.network.numeric & (other.prefix === 0 ? 0 : (0xFFFFFFFF << (32 - other.prefix)) >>> 0);
    return (this.network.numeric & broader) === broader;
  }

  /**
   * Overlap with another.
   */
  overlaps(other: CIDR): boolean {
    return this.contains(other.network) || other.contains(this.network);
  }
}
