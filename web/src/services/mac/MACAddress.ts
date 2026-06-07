/**
 * MACAddress — MAC address validation and manipulation
 *
 * Inspired by: mac-address
 */

export class MACAddress {
  /**
   * Validate MAC address.
   */
  static isValid(mac: string): boolean {
    return /^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/.test(mac);
  }

  /**
   * Normalize to colon-separated lowercase.
   */
  static normalize(mac: string): string {
    return mac.toLowerCase().replace(/-/g, ':');
  }

  /**
   * Format with custom separator.
   */
  static format(mac: string, separator: string = ':'): string {
    const cleaned = mac.replace(/[:-]/g, '').toLowerCase();
    return cleaned.match(/.{1,2}/g)?.join(separator) ?? cleaned;
  }

  /**
   * Get OUI (first 3 octets).
   */
  static getOUI(mac: string): string {
    const parts = MACAddress.normalize(mac).split(':');
    return parts.slice(0, 3).join(':');
  }

  /**
   * Check if MAC is multicast (lowest bit of first octet is 1).
   */
  static isMulticast(mac: string): boolean {
    const first = parseInt(MACAddress.normalize(mac).split(':')[0], 16);
    return (first & 0x01) === 1;
  }

  /**
   * Check if MAC is locally administered (bit 1 of first octet is 1).
   */
  static isLocal(mac: string): boolean {
    const first = parseInt(MACAddress.normalize(mac).split(':')[0], 16);
    return (first & 0x02) === 2;
  }

  /**
   * Check if MAC is unicast (not multicast).
   */
  static isUnicast(mac: string): boolean {
    return !MACAddress.isMulticast(mac);
  }

  /**
   * Generate random MAC with given OUI.
   */
  static randomWithOUI(oui: string = '00:00:00'): string {
    const r = () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
    return MACAddress.normalize(`${oui}:${r()}:${r()}:${r()}`);
  }

  /**
   * Increment MAC.
   */
  static increment(mac: string, n: number = 1): string {
    const cleaned = mac.replace(/[:-]/g, '').toLowerCase();
    let num = parseInt(cleaned, 16);
    num = (num + n) & 0xffffffffffff;
    return num.toString(16).padStart(12, '0').match(/.{1,2}/g)!.join(':');
  }

  /**
   * Convert to integer.
   */
  static toInt(mac: string): number {
    const cleaned = mac.replace(/[:-]/g, '').toLowerCase();
    return parseInt(cleaned, 16);
  }
}
