/**
 * MACAddress — MAC (EUI-48) address
 *
 * Inspired by: mac-address
 *
 * Format: XX:XX:XX:XX:XX:XX (48-bit)
 */

const OUI_MULTICAST_BIT = 0x01;

export class MACAddress {
  readonly bytes: number[]; // 6 bytes

  constructor(bytes: number[]) {
    if (bytes.length !== 6) throw new Error('MAC must be 6 bytes');
    for (const b of bytes) {
      if (b < 0 || b > 255 || !Number.isInteger(b)) throw new Error('Invalid byte');
    }
    this.bytes = [...bytes];
  }

  /**
   * Parse MAC string.
   * Supports: XX:XX:XX:XX:XX:XX, XX-XX-XX-XX-XX-XX, XXXX.XXXX.XXXX
   */
  static parse(input: string): MACAddress | null {
    const s = input.trim();
    const hex = s.replace(/[:\-.]/g, '');
    if (!/^[0-9a-fA-F]{12}$/.test(hex)) return null;
    const bytes: number[] = [];
    for (let i = 0; i < 12; i += 2) {
      bytes.push(parseInt(hex.slice(i, i + 2), 16));
    }
    return new MACAddress(bytes);
  }

  /**
   * To canonical colon format.
   */
  toString(): string {
    return this.bytes.map((b) => b.toString(16).padStart(2, '0')).join(':');
  }

  /**
   * To dash format.
   */
  toDash(): string {
    return this.bytes.map((b) => b.toString(16).padStart(2, '0')).join('-');
  }

  /**
   * To Cisco format.
   */
  toCisco(): string {
    return [0, 2, 4].map((i) =>
      this.bytes.slice(i, i + 2).map((b) => b.toString(16).padStart(2, '0')).join(''),
    ).join('.');
  }

  /**
   * Is multicast (lowest bit of first byte)?
   */
  isMulticast(): boolean {
    return (this.bytes[0] & OUI_MULTICAST_BIT) === 1;
  }

  /**
   * Is unicast (not multicast)?
   */
  isUnicast(): boolean { return !this.isMulticast(); }

  /**
   * Is universally administered (lowest bit of 2nd byte = 0)?
   */
  isUniversal(): boolean {
    return (this.bytes[0] & 0x02) === 0;
  }

  /**
   * Is locally administered.
   */
  isLocal(): boolean { return !this.isUniversal(); }

  /**
   * OUI (first 3 bytes).
   */
  oui(): string {
    return this.bytes.slice(0, 3).map((b) => b.toString(16).padStart(2, '0')).join(':');
  }

  /**
   * NIC suffix (last 3 bytes).
   */
  nic(): string {
    return this.bytes.slice(3).map((b) => b.toString(16).padStart(2, '0')).join(':');
  }

  /**
   * Equals.
   */
  equals(other: MACAddress): boolean {
    return this.bytes.every((b, i) => b === other.bytes[i]);
  }

  /**
   * Is broadcast (FF:FF:FF:FF:FF:FF)?
   */
  isBroadcast(): boolean {
    return this.bytes.every((b) => b === 0xff);
  }

  /**
   * Generate random MAC with given OUI (first 3 bytes).
   */
  static randomWithOui(oui: string): MACAddress {
    const parsed = MACAddress.parse(oui);
    if (!parsed) throw new Error('Invalid OUI');
    const bytes = [
      parsed.bytes[0], parsed.bytes[1], parsed.bytes[2],
      Math.floor(Math.random() * 256),
      Math.floor(Math.random() * 256),
      Math.floor(Math.random() * 256),
    ];
    return new MACAddress(bytes);
  }
}
