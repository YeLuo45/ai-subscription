/**
 * Snowflake — Twitter-style snowflake IDs
 *
 * 64-bit ID: 1 sign + 41 timestamp + 10 machine + 12 sequence
 */

const EPOCH = 1288834974657; // Twitter epoch (Nov 4, 2010)

export class Snowflake {
  private static _lastTime = 0;
  private static _seq = 0;

  /**
   * Generate a snowflake ID.
   */
  static generate(machineId: number = 1): bigint {
    let now = Date.now();
    if (Snowflake._lastTime === now) {
      Snowflake._seq = (Snowflake._seq + 1) & 0xfff;
      if (Snowflake._seq === 0) {
        while (Date.now() <= Snowflake._lastTime) { /* spin */ }
        now = Date.now();
      }
    } else {
      Snowflake._seq = 0;
    }
    Snowflake._lastTime = now;
    const ts = BigInt(now - EPOCH);
    const machine = BigInt(machineId & 0x3ff);
    const seq = BigInt(Snowflake._seq);
    return (ts << 22n) | (machine << 12n) | seq;
  }

  /**
   * Generate as string.
   */
  static generateString(machineId: number = 1): string {
    return Snowflake.generate(machineId).toString();
  }

  /**
   * Extract timestamp.
   */
  static getTime(id: bigint | string): Date {
    const n = typeof id === 'string' ? BigInt(id) : id;
    const ts = Number((n >> 22n) + BigInt(EPOCH));
    return new Date(ts);
  }

  /**
   * Extract machine ID.
   */
  static getMachineId(id: bigint | string): number {
    const n = typeof id === 'string' ? BigInt(id) : id;
    return Number((n & 0x3ff000n) >> 12n);
  }

  /**
   * Extract sequence.
   */
  static getSequence(id: bigint | string): number {
    const n = typeof id === 'string' ? BigInt(id) : id;
    return Number(n & 0xfffn);
  }

  /**
   * Parse all components.
   */
  static parse(id: bigint | string): { timestamp: Date; machineId: number; sequence: number } {
    return {
      timestamp: Snowflake.getTime(id),
      machineId: Snowflake.getMachineId(id),
      sequence: Snowflake.getSequence(id),
    };
  }
}
