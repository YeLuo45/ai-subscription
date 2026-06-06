/**
 * IPv6 — IPv6 address utilities
 *
 * Inspired by: ipaddr.js
 *
 * Parse, validate, classify IPv6 with shorthand (::) and embedded IPv4.
 */

const ZEROS = [0, 0, 0, 0, 0, 0, 0, 0];

export class IPv6 {
  readonly groups: number[]; // 8 groups of 16-bit

  constructor(groups: number[]) {
    if (groups.length !== 8) throw new Error('IPv6 must have 8 groups');
    for (const g of groups) {
      if (g < 0 || g > 0xFFFF || !Number.isInteger(g)) throw new Error('Invalid group');
    }
    this.groups = [...groups];
  }

  /**
   * Parse IPv6 string.
   * Supports :: shorthand and embedded IPv4.
   */
  static parse(input: string): IPv6 | null {
    let s = input.trim();
    if (!s) return null;
    // Zone ID
    const pct = s.indexOf('%');
    if (pct >= 0) s = s.slice(0, pct);

    // Embedded IPv4
    const lastColon = s.lastIndexOf(':');
    if (lastColon >= 0 && s.slice(lastColon + 1).includes('.')) {
      const v4 = s.slice(lastColon + 1);
      const ip = IPv4.parse(v4);
      if (!ip) return null;
      const v4hex = [
        ((ip.numeric >>> 16) & 0xFFFF).toString(16),
        (ip.numeric & 0xFFFF).toString(16),
      ];
      s = s.slice(0, lastColon + 1) + v4hex.join(':');
    }

    // Count ::
    const dcCount = (s.match(/::/g) || []).length;
    if (dcCount > 1) return null;

    if (dcCount === 0) {
      const parts = s.split(':');
      if (parts.length !== 8) return null;
      try {
        const groups = parts.map((p) => parseInt(p, 16));
        return new IPv6(groups);
      } catch {
        return null;
      }
    }

    // ::
    const [before, after] = s.split('::');
    const beforeParts = before ? before.split(':') : [];
    const afterParts = after ? after.split(':') : [];
    const fill = 8 - (beforeParts.length + afterParts.length);
    if (fill < 0) return null;
    const groups: number[] = [
      ...beforeParts.map((p) => parseInt(p, 16)),
      ...ZEROS.slice(0, fill),
      ...afterParts.map((p) => parseInt(p, 16)),
    ];
    if (groups.length !== 8) return null;
    try {
      return new IPv6(groups);
    } catch {
      return null;
    }
  }

  /**
   * Stringify in canonical form.
   */
  toString(): string {
    return this.groups.map((g) => g.toString(16)).join(':');
  }

  /**
   * Compress with :: shorthand.
   */
  toCompressedString(): string {
    // Find longest run of zeros
    let bestStart = -1, bestLen = 0;
    let curStart = -1, curLen = 0;
    for (let i = 0; i < 8; i++) {
      if (this.groups[i] === 0) {
        if (curStart < 0) curStart = i;
        curLen++;
        if (curLen > bestLen) {
          bestStart = curStart;
          bestLen = curLen;
        }
      } else {
        curStart = -1;
        curLen = 0;
      }
    }
    if (bestLen < 2) return this.toString();
    const parts = this.groups.map((g) => g.toString(16));
    parts.splice(bestStart, bestLen, '');
    return parts.join(':').replace(/^:|:$/g, '') || '::';
  }

  /**
   * Is loopback (::1)?
   */
  isLoopback(): boolean {
    for (let i = 0; i < 7; i++) if (this.groups[i] !== 0) return false;
    return this.groups[7] === 1;
  }

  /**
   * Is unspecified (::)?
   */
  isUnspecified(): boolean {
    return this.groups.every((g) => g === 0);
  }

  /**
   * Is link-local (fe80::/10)?
   */
  isLinkLocal(): boolean {
    return this.groups[0] === 0xfe80;
  }

  /**
   * Is unique local (fc00::/7)?
   */
  isUniqueLocal(): boolean {
    return (this.groups[0] & 0xfe00) === 0xfc00;
  }

  /**
   * Is multicast (ff00::/8)?
   */
  isMulticast(): boolean { return (this.groups[0] & 0xff00) === 0xff00; }

  /**
   * Equals another.
   */
  equals(other: IPv6): boolean {
    return this.groups.every((g, i) => g === other.groups[i]);
  }

  /**
   * Is in CIDR block.
   */
  inCIDR(prefix: number): boolean {
    if (prefix < 0 || prefix > 128) return false;
    let full = 0;
    for (const g of this.groups) {
      if (prefix >= 16) {
        if (g !== 0) return true; // any non-zero in this group means not all-zero
        full += 16;
        prefix -= 16;
      } else {
        if (g >>> (16 - prefix) !== 0) return true;
        return false;
      }
    }
    return false;
  }
}

import { IPv4 } from '../ip4/IPv4';
