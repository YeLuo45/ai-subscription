/**
 * Bitfield.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Bitfield } from '../Bitfield';

describe('Bitfield — get/set/clear', () => {
  it('get bit', () => {
    expect(Bitfield.get(0b1010, 1)).toBe(1);
    expect(Bitfield.get(0b1010, 0)).toBe(0);
  });

  it('set bit', () => {
    expect(Bitfield.set(0b0000, 2)).toBe(0b0100);
  });

  it('clear bit', () => {
    expect(Bitfield.clear(0b1111, 2)).toBe(0b1011);
  });

  it('toggle bit', () => {
    expect(Bitfield.toggle(0b1010, 0)).toBe(0b1011);
  });

  it('has bit', () => {
    expect(Bitfield.has(0b1010, 3)).toBe(true);
    expect(Bitfield.has(0b1010, 0)).toBe(false);
  });
});

describe('Bitfield — count', () => {
  it('popcount', () => {
    expect(Bitfield.popcount(0b1011)).toBe(3);
  });

  it('popcount 0', () => {
    expect(Bitfield.popcount(0)).toBe(0);
  });
});

describe('Bitfield — zeros', () => {
  it('trailingZeros', () => {
    expect(Bitfield.trailingZeros(0b1000)).toBe(3);
  });

  it('trailingZeros 0', () => {
    expect(Bitfield.trailingZeros(0)).toBe(32);
  });

  it('leadingZeros', () => {
    expect(Bitfield.leadingZeros(0b1000)).toBe(28);
  });
});

describe('Bitfield — bitLength', () => {
  it('basic', () => {
    expect(Bitfield.bitLength(0)).toBe(0);
    expect(Bitfield.bitLength(1)).toBe(1);
    expect(Bitfield.bitLength(7)).toBe(3);
    expect(Bitfield.bitLength(8)).toBe(4);
  });
});

describe('Bitfield — powerOfTwo', () => {
  it('yes', () => {
    expect(Bitfield.isPowerOfTwo(4)).toBe(true);
  });

  it('no', () => {
    expect(Bitfield.isPowerOfTwo(6)).toBe(false);
  });
});

describe('Bitfield — rotate', () => {
  it('rotl', () => {
    expect(Bitfield.rotl(0b0001, 1)).toBe(0b0010);
  });

  it('rotr', () => {
    expect(Bitfield.rotr(0b0010, 1)).toBe(0b0001);
  });
});

describe('Bitfield — binary', () => {
  it('toBinary', () => {
    expect(Bitfield.toBinary(5, 8)).toBe('00000101');
  });
});
