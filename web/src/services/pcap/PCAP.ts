/**
 * PCAP — simplified PCAP file format reader
 *
 * Inspired by: pcap-parser
 *
 * Format: Global Header (24 bytes) + Records
 *   Global: magic, version, thiszone, sigfigs, snaplen, network
 *   Record: ts_sec, ts_usec, incl_len, orig_len, data
 */

export interface PCAPGlobalHeader {
  magic: number;
  versionMajor: number;
  versionMinor: number;
  thiszone: number;
  sigfigs: number;
  snaplen: number;
  network: number;
}

export interface PCAPRecord {
  tsSec: number;
  tsUsec: number;
  inclLen: number;
  origLen: number;
  data: Uint8Array;
}

export class PCAP {
  static MAGIC_LE = 0xa1b2c3d4;
  static MAGIC_BE = 0xd4c3b2a1;

  /**
   * Read global header from PCAP data.
   */
  static readHeader(data: Uint8Array): PCAPGlobalHeader {
    if (data.length < 24) throw new Error('PCAP data too short');
    const dv = new DataView(data.buffer, data.byteOffset, 24);
    return {
      magic: dv.getUint32(0, true),
      versionMajor: dv.getUint16(4, true),
      versionMinor: dv.getUint16(6, true),
      thiszone: dv.getInt32(8, true),
      sigfigs: dv.getUint32(12, true),
      snaplen: dv.getUint32(16, true),
      network: dv.getUint32(20, true),
    };
  }

  /**
   * Read all records.
   */
  static readRecords(data: Uint8Array): PCAPRecord[] {
    const records: PCAPRecord[] = [];
    let offset = 24; // skip global header
    while (offset + 16 <= data.length) {
      const dv = new DataView(data.buffer, data.byteOffset + offset, 16);
      const tsSec = dv.getUint32(0, true);
      const tsUsec = dv.getUint32(4, true);
      const inclLen = dv.getUint32(8, true);
      const origLen = dv.getUint32(12, true);
      if (offset + 16 + inclLen > data.length) break;
      const pktData = data.slice(offset + 16, offset + 16 + inclLen);
      records.push({ tsSec, tsUsec, inclLen, origLen, data: pktData });
      offset += 16 + inclLen;
    }
    return records;
  }

  /**
   * Write global header to bytes.
   */
  static writeHeader(h: PCAPGlobalHeader): Uint8Array {
    const buf = new Uint8Array(24);
    const dv = new DataView(buf.buffer);
    dv.setUint32(0, h.magic, true);
    dv.setUint16(4, h.versionMajor, true);
    dv.setUint16(6, h.versionMinor, true);
    dv.setInt32(8, h.thiszone, true);
    dv.setUint32(12, h.sigfigs, true);
    dv.setUint32(16, h.snaplen, true);
    dv.setUint32(20, h.network, true);
    return buf;
  }

  /**
   * Write a single record.
   */
  static writeRecord(r: PCAPRecord): Uint8Array {
    const buf = new Uint8Array(16 + r.inclLen);
    const dv = new DataView(buf.buffer);
    dv.setUint32(0, r.tsSec, true);
    dv.setUint32(4, r.tsUsec, true);
    dv.setUint32(8, r.inclLen, true);
    dv.setUint32(12, r.origLen, true);
    buf.set(r.data, 16);
    return buf;
  }

  /**
   * Build a simple PCAP file with ethernet frames.
   */
  static build(network: number = 1): Uint8Array {
    return PCAP.writeHeader({
      magic: PCAP.MAGIC_LE,
      versionMajor: 2,
      versionMinor: 4,
      thiszone: 0,
      sigfigs: 0,
      snaplen: 65535,
      network,
    });
  }

  /**
   * Validate magic number.
   */
  static isValid(data: Uint8Array): boolean {
    if (data.length < 4) return false;
    const dv = new DataView(data.buffer, data.byteOffset, 4);
    const m = dv.getUint32(0, true);
    return m === PCAP.MAGIC_LE || m === PCAP.MAGIC_BE;
  }
}
