/**
 * PNG.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { PNG } from '../PNG';

function makePng(width: number, height: number, colorType: number = 2, bitDepth: number = 8): Uint8Array {
  const buf = new Uint8Array(8 + 25); // sig + IHDR chunk
  buf.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  // IHDR length = 13
  buf[8] = 0; buf[9] = 0; buf[10] = 0; buf[11] = 13;
  // IHDR type
  buf[12] = 0x49; buf[13] = 0x48; buf[14] = 0x44; buf[15] = 0x52;
  // width, height
  const dv = new DataView(buf.buffer);
  dv.setUint32(16, width);
  dv.setUint32(20, height);
  buf[24] = bitDepth;
  buf[25] = colorType;
  // compression, filter, interlace
  buf[26] = 0; buf[27] = 0; buf[28] = 0;
  // CRC dummy
  buf[29] = 0; buf[30] = 0; buf[31] = 0; buf[32] = 0;
  return buf;
}

describe('PNG — signature', () => {
  it('valid signature', () => {
    const buf = makePng(10, 10);
    expect(PNG.isValid(buf)).toBe(true);
  });

  it('invalid', () => {
    expect(PNG.isValid(new Uint8Array([1, 2, 3, 4]))).toBe(false);
  });
});

describe('PNG — info', () => {
  it('read IHDR', () => {
    const buf = makePng(100, 50);
    const info = PNG.parseInfo(buf);
    expect(info.width).toBe(100);
    expect(info.height).toBe(50);
    expect(info.bitDepth).toBe(8);
  });

  it('color type RGB', () => {
    const buf = makePng(10, 10, 2);
    const info = PNG.parseInfo(buf);
    expect(info.colorType).toBe(2);
    expect(info.hasAlpha).toBe(false);
  });

  it('color type RGBA', () => {
    const buf = makePng(10, 10, 6);
    const info = PNG.parseInfo(buf);
    expect(info.hasAlpha).toBe(true);
  });

  it('file size', () => {
    const buf = makePng(10, 10);
    const info = PNG.parseInfo(buf);
    expect(info.fileSize).toBe(buf.length);
  });
});

describe('PNG — chunks', () => {
  it('find IHDR', () => {
    const buf = makePng(10, 10);
    const c = PNG.findChunk(buf, 'IHDR');
    expect(c).not.toBeNull();
    expect(c!.type).toBe('IHDR');
  });

  it('missing chunk', () => {
    const buf = makePng(10, 10);
    expect(PNG.findChunk(buf, 'tEXt')).toBeNull();
  });
});

describe('PNG — color type names', () => {
  it('names', () => {
    expect(PNG.colorTypeName(0)).toBe('Grayscale');
    expect(PNG.colorTypeName(2)).toBe('RGB');
    expect(PNG.colorTypeName(6)).toBe('RGBA');
  });
});

describe('PNG — errors', () => {
  it('not PNG', () => {
    expect(() => PNG.parseInfo(new Uint8Array([1, 2, 3]))).toThrow();
  });
});
