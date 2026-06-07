/**
 * WAV — simplified WAV file format reader/writer
 *
 * Inspired by: wavefile
 *
 * Format: RIFF + WAVE + fmt + data chunks
 */

export interface WAVHeader {
  numChannels: number;
  sampleRate: number;
  byteRate: number;
  blockAlign: number;
  bitsPerSample: number;
  dataSize: number;
  duration: number;
}

export class WAV {
  /**
   * Read WAV header from data.
   */
  static readHeader(data: Uint8Array): WAVHeader {
    if (data.length < 44) throw new Error('WAV data too short');
    if (WAV.readAscii(data, 0, 4) !== 'RIFF') throw new Error('Not RIFF');
    if (WAV.readAscii(data, 8, 12) !== 'WAVE') throw new Error('Not WAVE');
    // Find fmt chunk
    let offset = 12;
    while (offset < data.length - 8) {
      const id = WAV.readAscii(data, offset, offset + 4);
      const size = WAV.readUint32(data, offset + 4);
      if (id === 'fmt ') {
        const numChannels = WAV.readUint16(data, offset + 10);
        const sampleRate = WAV.readUint32(data, offset + 12);
        const byteRate = WAV.readUint32(data, offset + 16);
        const blockAlign = WAV.readUint16(data, offset + 20);
        const bitsPerSample = WAV.readUint16(data, offset + 22);
        return {
          numChannels,
          sampleRate,
          byteRate,
          blockAlign,
          bitsPerSample,
          dataSize: 0,
          duration: 0,
        };
      }
      offset += 8 + size;
    }
    throw new Error('No fmt chunk');
  }

  /**
   * Read samples from WAV data.
   */
  static readSamples(data: Uint8Array): Int16Array {
    const header = WAV.readHeader(data);
    // Find data chunk
    let offset = 12;
    while (offset < data.length - 8) {
      const id = WAV.readAscii(data, offset, offset + 4);
      const size = WAV.readUint32(data, offset + 4);
      if (id === 'data') {
        const dataStart = offset + 8;
        const samples = new Int16Array(size / 2);
        for (let i = 0; i < samples.length; i++) {
          samples[i] = WAV.readInt16(data, dataStart + i * 2);
        }
        return samples;
      }
      offset += 8 + size;
    }
    return new Int16Array(0);
  }

  /**
   * Write a simple WAV file.
   */
  static write(samples: Int16Array, sampleRate: number = 44100, numChannels: number = 1): Uint8Array {
    const bitsPerSample = 16;
    const dataSize = samples.length * 2;
    const fileSize = 36 + dataSize;
    const buf = new Uint8Array(44 + dataSize);
    const dv = new DataView(buf.buffer);
    // RIFF header
    WAV.writeAscii(buf, 0, 'RIFF');
    dv.setUint32(4, fileSize, true);
    WAV.writeAscii(buf, 8, 'WAVE');
    // fmt chunk
    WAV.writeAscii(buf, 12, 'fmt ');
    dv.setUint32(16, 16, true);  // chunk size
    dv.setUint16(20, 1, true);   // PCM
    dv.setUint16(22, numChannels, true);
    dv.setUint32(24, sampleRate, true);
    dv.setUint32(28, sampleRate * numChannels * 2, true); // byte rate
    dv.setUint16(32, numChannels * 2, true); // block align
    dv.setUint16(34, bitsPerSample, true);
    // data chunk
    WAV.writeAscii(buf, 36, 'data');
    dv.setUint32(40, dataSize, true);
    for (let i = 0; i < samples.length; i++) {
      dv.setInt16(44 + i * 2, samples[i], true);
    }
    return buf;
  }

  /**
   * Calculate duration in seconds.
   */
  static duration(data: Uint8Array): number {
    const h = WAV.readHeader(data);
    const samples = WAV.readSamples(data);
    return samples.length / h.sampleRate / h.numChannels;
  }

  /**
   * Validate WAV file.
   */
  static isValid(data: Uint8Array): boolean {
    if (data.length < 12) return false;
    return WAV.readAscii(data, 0, 4) === 'RIFF' && WAV.readAscii(data, 8, 12) === 'WAVE';
  }

  private static readUint16(data: Uint8Array, offset: number): number {
    return data[offset] | (data[offset + 1] << 8);
  }

  private static readUint32(data: Uint8Array, offset: number): number {
    return (data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16) | (data[offset + 3] << 24)) >>> 0;
  }

  private static readInt16(data: Uint8Array, offset: number): number {
    const v = data[offset] | (data[offset + 1] << 8);
    return v & 0x8000 ? v - 0x10000 : v;
  }

  private static readAscii(data: Uint8Array, start: number, end: number): string {
    let s = '';
    for (let i = start; i < end; i++) s += String.fromCharCode(data[i]);
    return s;
  }

  private static writeAscii(data: Uint8Array, offset: number, s: string): void {
    for (let i = 0; i < s.length; i++) data[offset + i] = s.charCodeAt(i);
  }
}
