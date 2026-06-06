/**
 * IPv6.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { IPv6 } from '../IPv6';

describe('IPv6 — parse', () => {
  it('full form', () => {
    const ip = IPv6.parse('2001:0db8:0000:0000:0000:0000:0000:0001');
    expect(ip).not.toBe(null);
  });

  it(':: shorthand', () => {
    expect(IPv6.parse('::1')?.isLoopback()).toBe(true);
  });

  it('unspecified', () => {
    expect(IPv6.parse('::')?.isUnspecified()).toBe(true);
  });

  it('invalid', () => {
    expect(IPv6.parse('not::valid')).toBe(null);
  });

  it('too many groups', () => {
    expect(IPv6.parse('1:2:3:4:5:6:7:8:9')).toBe(null);
  });
});

describe('IPv6 — toString', () => {
  it('round trip', () => {
    const ip = new IPv6([0x2001, 0xdb8, 0, 0, 0, 0, 0, 1]);
    expect(ip.toString()).toBe('2001:db8:0:0:0:0:0:1');
  });

  it('compressed', () => {
    const ip = new IPv6([0xfe80, 0, 0, 0, 0, 0, 0, 1]);
    expect(ip.toCompressedString()).toBe('fe80::1');
  });
});

describe('IPv6 — checks', () => {
  it('link local', () => {
    expect(new IPv6([0xfe80, 0, 0, 0, 0, 0, 0, 1]).isLinkLocal()).toBe(true);
  });

  it('unique local', () => {
    expect(new IPv6([0xfc00, 0, 0, 0, 0, 0, 0, 1]).isUniqueLocal()).toBe(true);
  });

  it('multicast', () => {
    expect(new IPv6([0xff02, 0, 0, 0, 0, 0, 0, 1]).isMulticast()).toBe(true);
  });

  it('not loopback', () => {
    expect(new IPv6([0x2001, 0, 0, 0, 0, 0, 0, 1]).isLoopback()).toBe(false);
  });
});

describe('IPv6 — equals', () => {
  it('equals', () => {
    expect(new IPv6([0, 0, 0, 0, 0, 0, 0, 1]).equals(new IPv6([0, 0, 0, 0, 0, 0, 0, 1]))).toBe(true);
  });

  it('not equals', () => {
    expect(new IPv6([0, 0, 0, 0, 0, 0, 0, 1]).equals(new IPv6([0, 0, 0, 0, 0, 0, 0, 2]))).toBe(false);
  });
});

describe('IPv6 — constructor', () => {
  it('validates', () => {
    expect(() => new IPv6([0, 0, 0, 0, 0, 0, 0])).toThrow();
    expect(() => new IPv6([0, 0, 0, 0, 0, 0, 0, 0x10000])).toThrow();
  });
});
