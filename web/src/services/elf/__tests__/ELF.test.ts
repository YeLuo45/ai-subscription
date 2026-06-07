/**
 * ELF.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { ELF } from '../ELF';

describe('ELF — magic', () => {
  it('valid magic', () => {
    const data = new Uint8Array([0x7f, 0x45, 0x4c, 0x46, 2, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(ELF.isValid(data)).toBe(true);
  });

  it('invalid magic', () => {
    const data = new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0]);
    expect(ELF.isValid(data)).toBe(false);
  });

  it('too short', () => {
    expect(ELF.isValid(new Uint8Array([0x7f, 0x45, 0x4c]))).toBe(false);
  });
});

describe('ELF — header 32-bit', () => {
  it('reads 32-bit header', () => {
    const buf = new Uint8Array(52);
    buf.set([0x7f, 0x45, 0x4c, 0x46, 1, 1, 1, 0], 0);
    buf.set([0, 0, 0, 0, 0, 0, 0, 0], 8);
    buf.set([2, 0], 16);   // ET_EXEC
    buf.set([3, 0], 18);   // x86
    buf.set([1, 0, 0, 0], 20);
    buf.set([0x78, 0x56, 0x34, 0x12], 24); // entry
    const h = ELF.readHeader(buf);
    expect(h.eType).toBe(2);
    expect(h.eMachine).toBe(3);
  });
});

describe('ELF — header 64-bit', () => {
  it('reads 64-bit header', () => {
    const buf = new Uint8Array(64);
    buf.set([0x7f, 0x45, 0x4c, 0x46, 2, 1, 1, 0], 0);
    buf.set([0, 0, 0, 0, 0, 0, 0, 0], 8);
    buf.set([3, 0], 16);   // ET_DYN
    buf.set([62, 0], 18);  // x86-64
    buf.set([1, 0, 0, 0], 20);
    const h = ELF.readHeader(buf);
    expect(h.eType).toBe(3);
    expect(h.eMachine).toBe(62);
    expect(h.eiClass).toBe(2);
  });
});

describe('ELF — name maps', () => {
  it('arch name', () => {
    expect(ELF.archName(3)).toBe('x86');
    expect(ELF.archName(62)).toBe('x86-64');
    expect(ELF.archName(183)).toBe('AArch64');
  });

  it('class name', () => {
    expect(ELF.className(1)).toBe('32-bit');
    expect(ELF.className(2)).toBe('64-bit');
  });

  it('data name', () => {
    expect(ELF.dataName(1)).toBe('LSB (little-endian)');
    expect(ELF.dataName(2)).toBe('MSB (big-endian)');
  });

  it('type name', () => {
    expect(ELF.typeName(2)).toBe('EXEC');
    expect(ELF.typeName(3)).toBe('DYN');
  });
});

describe('ELF — cstring', () => {
  it('readCString', () => {
    const data = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x00]);
    expect(ELF.readCString(data, 0)).toBe('Hello');
  });

  it('readCString offset', () => {
    const data = new Uint8Array([0, 0x77, 0x6f, 0x72, 0x6c, 0x64, 0x00]);
    expect(ELF.readCString(data, 1)).toBe('world');
  });
});

describe('ELF — error', () => {
  it('invalid file', () => {
    expect(() => ELF.readHeader(new Uint8Array([0, 0, 0, 0]))).toThrow();
  });
});
