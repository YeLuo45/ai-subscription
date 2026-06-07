/**
 * PNG — simplified PNG file format reader
 *
 * Inspired by: pngjs
 *
 * Format: 8-byte signature + chunks (length, type, data, CRC)
 */

export interface PNGChunk {
  type: string;
  data: Uint8Array;
  offset: number;
}

export interface PNGInfo {
  width: number;
  height: number;
  bitDepth: number;
  colorType: number;
  hasAlpha: boolean;
  isInterlaced: boolean;
  fileSize: number;
}

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export class PNG {
  /**
   * Validate PNG signature.
   */
  static isValid(data: Uint8Array): boolean {
    if (data.length < 8) return false;
    for (let i = 0; i < 8; i++) {
      if (data[i] !== SIGNATURE[i]) return false;
    }
    return true;
  }

  /**
   * Parse IHDR info.
   */
  static parseInfo(data: Uint8Array): PNGInfo {
    if (!PNG.isValid(data)) throw new Error('Not a PNG file');
    const ihdr = PNG.findChunk(data, 'IHDR');
    if (!ihdr) throw new Error('No IHDR chunk');
    const dv = new DataView(ihdr.data.buffer, ihdr.data.byteOffset, ihdr.data.byteLength);
    const width = dv.getUint32(0);
    const height = dv.getUint32(4);
    const bitDepth = ihdr.data[8];
    const colorType = ihdr.data[9];
    return {
      width,
      height,
      bitDepth,
      colorType,
      hasAlpha: colorType === 4 || colorType === 6,
      isInterlaced: ihdr.data[12] === 1,
      fileSize: data.length,
    };
  }

  /**
   * Find a chunk by type.
   */
  static findChunk(data: Uint8Array, type: string): PNGChunk | null {
    let offset = 8; // skip signature
    while (offset + 8 <= data.length) {
      const dv = new DataView(data.buffer, data.byteOffset + offset, 8);
      const length = dv.getUint32(0);
      const ctype = PNG._readType(data, offset + 4);
      if (ctype === type) {
        const cdata = data.slice(offset + 8, offset + 8 + length);
        return { type, data: cdata, offset };
      }
      offset += 12 + length; // length + type + data + CRC
    }
    return null;
  }

  /**
   * List all chunks.
   */
  static listChunks(data: Uint8Array): string[] {
    const types: string[] = [];
    let offset = 8;
    while (offset + 8 <= data.length) {
      const dv = new DataView(data.buffer, data.byteOffset + offset, 4);
      const length = dv.getUint32(0);
      const ctype = PNG._readType(data, offset + 4);
      types.push(ctype);
      offset += 12 + length;
    }
    return types;
  }

  /**
   * Color type name.
   */
  static colorTypeName(ct: number): string {
    const map: Record<number, string> = {
      0: 'Grayscale', 2: 'RGB', 3: 'Indexed', 4: 'Grayscale+Alpha', 6: 'RGBA',
    };
    return map[ct] ?? `Unknown(${ct})`;
  }

  private static _readType(data: Uint8Array, offset: number): string {
    return String.fromCharCode(data[offset], data[offset + 1], data[offset + 2], data[offset + 3]);
  }
}
