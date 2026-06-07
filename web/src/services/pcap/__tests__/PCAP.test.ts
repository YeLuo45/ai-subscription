/**
 * PCAP.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { PCAP } from '../PCAP';

describe('PCAP — header', () => {
  it('build and read', () => {
    const buf = PCAP.build(1);
    const h = PCAP.readHeader(buf);
    expect(h.versionMajor).toBe(2);
    expect(h.versionMinor).toBe(4);
    expect(h.network).toBe(1);
  });

  it('magic valid', () => {
    const buf = PCAP.build();
    expect(PCAP.isValid(buf)).toBe(true);
  });

  it('invalid', () => {
    expect(PCAP.isValid(new Uint8Array([1, 2, 3]))).toBe(false);
  });

  it('writeHeader roundtrip', () => {
    const h = {
      magic: PCAP.MAGIC_LE,
      versionMajor: 2,
      versionMinor: 4,
      thiszone: 0,
      sigfigs: 0,
      snaplen: 65535,
      network: 228,
    };
    const buf = PCAP.writeHeader(h);
    const h2 = PCAP.readHeader(buf);
    expect(h2.network).toBe(228);
  });
});

describe('PCAP — records', () => {
  it('write and read record', () => {
    const hdr = PCAP.build();
    const rec = PCAP.writeRecord({
      tsSec: 1000,
      tsUsec: 123456,
      inclLen: 4,
      origLen: 4,
      data: new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
    });
    const combined = new Uint8Array(hdr.length + rec.length);
    combined.set(hdr, 0);
    combined.set(rec, hdr.length);
    const records = PCAP.readRecords(combined);
    expect(records.length).toBe(1);
    expect(records[0].tsSec).toBe(1000);
    expect(records[0].data.length).toBe(4);
    expect(records[0].data[0]).toBe(0xde);
  });

  it('multiple records', () => {
    const hdr = PCAP.build();
    const r1 = PCAP.writeRecord({ tsSec: 1, tsUsec: 0, inclLen: 2, origLen: 2, data: new Uint8Array([1, 2]) });
    const r2 = PCAP.writeRecord({ tsSec: 2, tsUsec: 0, inclLen: 3, origLen: 3, data: new Uint8Array([3, 4, 5]) });
    const combined = new Uint8Array(hdr.length + r1.length + r2.length);
    combined.set(hdr, 0);
    combined.set(r1, hdr.length);
    combined.set(r2, hdr.length + r1.length);
    const records = PCAP.readRecords(combined);
    expect(records.length).toBe(2);
  });

  it('empty records', () => {
    const buf = PCAP.build();
    expect(PCAP.readRecords(buf)).toEqual([]);
  });
});

describe('PCAP — error', () => {
  it('readHeader too short', () => {
    expect(() => PCAP.readHeader(new Uint8Array(10))).toThrow();
  });
});
