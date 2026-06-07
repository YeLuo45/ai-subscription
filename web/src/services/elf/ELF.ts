/**
 * ELF — simplified ELF file format reader
 *
 * Inspired by: elfy / readelf
 *
 * Format: 32/64-bit ELF header + program/section headers
 */

export interface ELFHeader {
  eiClass: number;     // 1=32, 2=64
  eiData: number;      // 1=LE, 2=BE
  eiVersion: number;
  eiOSABI: number;
  eType: number;       // 2=EXEC, 3=DYN
  eMachine: number;    // 3=x86, 62=x86_64
  eVersion: number;
  eEntry: number;
  ePhoff: number;
  eShoff: number;
  eFlags: number;
  eEhsize: number;
  ePhentsize: number;
  ePhnum: number;
  eShentsize: number;
  eShnum: number;
  eShstrndx: number;
}

export class ELF {
  static MAGIC = [0x7f, 0x45, 0x4c, 0x46]; // .ELF

  /**
   * Read ELF header.
   */
  static readHeader(data: Uint8Array): ELFHeader {
    if (!ELF.isValid(data)) throw new Error('Not an ELF file');
    const is64 = data[4] === 2;
    const isLE = data[5] === 1;
    const dv = new DataView(data.buffer, data.byteOffset, is64 ? 64 : 52);
    if (is64) {
      return {
        eiClass: data[4], eiData: data[5], eiVersion: data[6], eiOSABI: data[7],
        eType: dv.getUint16(16, isLE),
        eMachine: dv.getUint16(18, isLE),
        eVersion: dv.getUint32(20, isLE),
        eEntry: Number(dv.getBigUint64(24, isLE)),
        ePhoff: Number(dv.getBigUint64(32, isLE)),
        eShoff: Number(dv.getBigUint64(40, isLE)),
        eFlags: dv.getUint32(48, isLE),
        eEhsize: dv.getUint16(52, isLE),
        ePhentsize: dv.getUint16(54, isLE),
        ePhnum: dv.getUint16(56, isLE),
        eShentsize: dv.getUint16(58, isLE),
        eShnum: dv.getUint16(60, isLE),
        eShstrndx: dv.getUint16(62, isLE),
      };
    } else {
      return {
        eiClass: data[4], eiData: data[5], eiVersion: data[6], eiOSABI: data[7],
        eType: dv.getUint16(16, isLE),
        eMachine: dv.getUint16(18, isLE),
        eVersion: dv.getUint32(20, isLE),
        eEntry: dv.getUint32(24, isLE),
        ePhoff: dv.getUint32(28, isLE),
        eShoff: dv.getUint32(32, isLE),
        eFlags: dv.getUint32(36, isLE),
        eEhsize: dv.getUint16(40, isLE),
        ePhentsize: dv.getUint16(42, isLE),
        ePhnum: dv.getUint16(44, isLE),
        eShentsize: dv.getUint16(46, isLE),
        eShnum: dv.getUint16(48, isLE),
        eShstrndx: dv.getUint16(50, isLE),
      };
    }
  }

  /**
   * Validate ELF magic.
   */
  static isValid(data: Uint8Array): boolean {
    if (data.length < 4) return false;
    return data[0] === ELF.MAGIC[0] && data[1] === ELF.MAGIC[1] && data[2] === ELF.MAGIC[2] && data[3] === ELF.MAGIC[3];
  }

  /**
   * Get machine architecture name.
   */
  static archName(machine: number): string {
    const map: Record<number, string> = {
      0: 'Unknown', 1: 'AT&T WE 32100', 2: 'SPARC', 3: 'x86', 4: 'M68K',
      5: 'M88K', 6: 'IBM MCU', 7: 'Intel 80860', 8: 'MIPS', 9: 'IBM S/370',
      10: 'MIPS RS3000 LE', 15: 'PA-RISC', 18: 'S/390', 19: 'Intel 80960',
      20: 'PowerPC', 21: 'PowerPC 64', 22: 'S/390', 40: 'ARM', 42: 'Alpha',
      43: 'SPARC v9', 50: 'IA-64', 62: 'x86-64', 76: 'TILE-Gx', 183: 'AArch64',
    };
    return map[machine] ?? `Unknown(${machine})`;
  }

  /**
   * Get file class.
   */
  static className(eiClass: number): string {
    if (eiClass === 1) return '32-bit';
    if (eiClass === 2) return '64-bit';
    return 'invalid';
  }

  /**
   * Get data encoding.
   */
  static dataName(eiData: number): string {
    if (eiData === 1) return 'LSB (little-endian)';
    if (eiData === 2) return 'MSB (big-endian)';
    return 'invalid';
  }

  /**
   * Get file type.
   */
  static typeName(eType: number): string {
    const map: Record<number, string> = {
      0: 'NONE', 1: 'REL', 2: 'EXEC', 3: 'DYN', 4: 'CORE',
    };
    return map[eType] ?? `Unknown(${eType})`;
  }

  /**
   * Extract section name from string table.
   */
  static readCString(data: Uint8Array, offset: number): string {
    let s = '';
    while (offset < data.length && data[offset] !== 0) {
      s += String.fromCharCode(data[offset]);
      offset++;
    }
    return s;
  }
}
