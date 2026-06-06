/**
 * MimeSniffer.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { MimeSniffer } from '../MimeSniffer';

describe('MimeSniffer — images', () => {
  it('PNG', () => {
    const bytes = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0, 0];
    expect(MimeSniffer.sniff(bytes)).toBe('image/png');
  });

  it('JPEG', () => {
    expect(MimeSniffer.sniff([0xFF, 0xD8, 0xFF, 0xE0])).toBe('image/jpeg');
  });

  it('GIF', () => {
    expect(MimeSniffer.sniff([0x47, 0x49, 0x46, 0x38, 0x39])).toBe('image/gif');
  });

  it('BMP', () => {
    expect(MimeSniffer.sniff([0x42, 0x4D, 0, 0])).toBe('image/bmp');
  });
});

describe('MimeSniffer — archives', () => {
  it('ZIP', () => {
    expect(MimeSniffer.sniff([0x50, 0x4B, 0x03, 0x04])).toBe('application/zip');
  });

  it('GZIP', () => {
    expect(MimeSniffer.sniff([0x1F, 0x8B])).toBe('application/gzip');
  });

  it('7z', () => {
    expect(MimeSniffer.sniff([0x37, 0x7A, 0xBC, 0xAF, 0x27, 0x1C])).toBe('application/x-7z-compressed');
  });
});

describe('MimeSniffer — documents', () => {
  it('PDF', () => {
    expect(MimeSniffer.sniff([0x25, 0x50, 0x44, 0x46])).toBe('application/pdf');
  });
});

describe('MimeSniffer — text', () => {
  it('plain text', () => {
    expect(MimeSniffer.sniffString('hello world')).toBe('text/plain');
  });

  it('HTML doctype', () => {
    expect(MimeSniffer.sniffString('<!DOCTYPE html><html>')).toBe('text/html');
  });
});

describe('MimeSniffer — unknown', () => {
  it('binary random', () => {
    expect(MimeSniffer.sniff([0xDE, 0xAD, 0xBE, 0xEF, 0x00, 0x01, 0xFF])).toBe('application/octet-stream');
  });

  it('empty', () => {
    expect(MimeSniffer.sniff([])).toBe('application/octet-stream');
  });
});

describe('MimeSniffer — signatures', () => {
  it('list', () => {
    const sigs = MimeSniffer.getSignatures();
    expect(sigs.length).toBeGreaterThan(0);
  });
});
