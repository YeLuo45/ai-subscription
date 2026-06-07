/**
 * Netmask — subnet mask and CIDR utilities
 *
 * Inspired by: netmask
 */

export class Netmask {
  /**
   * Validate CIDR notation (e.g., 192.168.0.0/24).
   */
  static isValidCIDR(cidr: string): boolean {
    const m = cidr.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)\/(\d+)$/);
    if (!m) return false;
    const prefix = parseInt(m[5], 10);
    if (prefix < 0 || prefix > 32) return false;
    return m[1] !== '' && m[2] !== '' && m[3] !== '' && m[4] !== '';
  }

  /**
   * CIDR to netmask (e.g., /24 -> 255.255.255.0).
   */
  static cidrToNetmask(prefix: number): string {
    if (prefix < 0 || prefix > 32) throw new Error('Invalid prefix');
    let mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
    return [(mask >>> 24) & 0xff, (mask >>> 16) & 0xff, (mask >>> 8) & 0xff, mask & 0xff].join('.');
  }

  /**
   * Netmask to CIDR.
   */
  static netmaskToCIDR(mask: string): number {
    const parts = mask.split('.').map((p) => parseInt(p, 10));
    if (parts.length !== 4) throw new Error('Invalid mask');
    let n = ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
    let count = 0;
    while (n & 0x80000000) {
      count++;
      n = (n << 1) >>> 0;
    }
    return count;
  }

  /**
   * Get network address.
   */
  static networkAddress(cidr: string): string {
    const [ip, prefixStr] = cidr.split('/');
    const prefix = parseInt(prefixStr, 10);
    const ipInt = Netmask._ipToInt(ip);
    const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
    const netInt = (ipInt & mask) >>> 0;
    return Netmask._intToIp(netInt);
  }

  /**
   * Get broadcast address.
   */
  static broadcastAddress(cidr: string): string {
    const [ip, prefixStr] = cidr.split('/');
    const prefix = parseInt(prefixStr, 10);
    const ipInt = Netmask._ipToInt(ip);
    const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
    const hostBits = 32 - prefix;
    const bcastInt = (ipInt | ((hostBits === 32 ? 0xffffffff : ((1 << hostBits) - 1)) >>> 0)) >>> 0;
    return Netmask._intToIp(bcastInt);
  }

  /**
   * Number of usable hosts.
   */
  static numHosts(prefix: number): number {
    if (prefix < 0 || prefix > 32) throw new Error('Invalid prefix');
    if (prefix === 32) return 1;
    if (prefix === 31) return 2;
    return Math.pow(2, 32 - prefix) - 2;
  }

  /**
   * Check if IP is in CIDR.
   */
  static contains(cidr: string, ip: string): boolean {
    const [_, prefixStr] = cidr.split('/');
    const prefix = parseInt(prefixStr, 10);
    const netInt = Netmask._ipToInt(Netmask.networkAddress(cidr));
    const ipInt = Netmask._ipToInt(ip);
    const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
    void _;
    return ((ipInt & mask) >>> 0) === netInt;
  }

  private static _ipToInt(ip: string): number {
    const parts = ip.split('.').map((p) => parseInt(p, 10));
    return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
  }

  private static _intToIp(n: number): string {
    return [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff].join('.');
  }
}
