/**
 * MACAddress.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { MACAddress } from '../MACAddress';

describe('MACAddress — parse', () => {
  it('colon', () => {
    const m = MACAddress.parse('aa:bb:cc:dd:ee:ff');
    expect(m?.toString()).toBe('aa:bb:cc:dd:ee:ff');
  });

  it('dash', () => {
    const m = MACAddress.parse('aa-bb-cc-dd-ee-ff');
    expect(m?.toString()).toBe('aa:bb:cc:dd:ee:ff');
  });

  it('cisco', () => {
    const m = MACAddress.parse('aabb.ccdd.eeff');
    expect(m?.toString()).toBe('aa:bb:cc:dd:ee:ff');
  });

  it('invalid', () => {
    expect(MACAddress.parse('garbage')).toBe(null);
    expect(MACAddress.parse('aa:bb:cc')).toBe(null);
  });

  it('case insensitive', () => {
    expect(MACAddress.parse('AA:BB:CC:DD:EE:FF')?.bytes[0]).toBe(0xAA);
  });
});

describe('MACAddress — formats', () => {
  const m = new MACAddress([0xAA, 0xBB, 0xCC, 0xDD, 0xEE, 0xFF]);

  it('toString', () => {
    expect(m.toString()).toBe('aa:bb:cc:dd:ee:ff');
  });

  it('toDash', () => {
    expect(m.toDash()).toBe('aa-bb-cc-dd-ee-ff');
  });

  it('toCisco', () => {
    expect(m.toCisco()).toBe('aabb.ccdd.eeff');
  });
});

describe('MACAddress — properties', () => {
  it('multicast (bit 0 set)', () => {
    expect(new MACAddress([0x01, 0, 0, 0, 0, 0]).isMulticast()).toBe(true);
  });

  it('unicast (bit 0 unset)', () => {
    expect(new MACAddress([0x00, 0, 0, 0, 0, 0]).isUnicast()).toBe(true);
  });

  it('universal (bit 1 unset)', () => {
    expect(new MACAddress([0x00, 0, 0, 0, 0, 0]).isUniversal()).toBe(true);
  });

  it('local (bit 1 set)', () => {
    expect(new MACAddress([0x02, 0, 0, 0, 0, 0]).isLocal()).toBe(true);
  });

  it('broadcast', () => {
    expect(new MACAddress([0xff, 0xff, 0xff, 0xff, 0xff, 0xff]).isBroadcast()).toBe(true);
  });

  it('oui', () => {
    const m = new MACAddress([0xAA, 0xBB, 0xCC, 0xDD, 0xEE, 0xFF]);
    expect(m.oui()).toBe('aa:bb:cc');
  });

  it('nic', () => {
    const m = new MACAddress([0xAA, 0xBB, 0xCC, 0xDD, 0xEE, 0xFF]);
    expect(m.nic()).toBe('dd:ee:ff');
  });
});

describe('MACAddress — equals', () => {
  it('equals', () => {
    expect(new MACAddress([1, 2, 3, 4, 5, 6]).equals(new MACAddress([1, 2, 3, 4, 5, 6]))).toBe(true);
  });

  it('not equals', () => {
    expect(new MACAddress([1, 2, 3, 4, 5, 6]).equals(new MACAddress([1, 2, 3, 4, 5, 7]))).toBe(false);
  });
});

describe('MACAddress — constructor', () => {
  it('validates length', () => {
    expect(() => new MACAddress([1, 2, 3])).toThrow();
  });

  it('validates bytes', () => {
    expect(() => new MACAddress([256, 0, 0, 0, 0, 0])).toThrow();
  });
});

describe('MACAddress — randomWithOui', () => {
  it('generates with OUI', () => {
    const m = MACAddress.randomWithOui('aa:bb:cc:00:00:00');
    expect(m.oui()).toBe('aa:bb:cc');
  });

  it('invalid OUI', () => {
    expect(() => MACAddress.randomWithOui('garbage')).toThrow();
  });
});
