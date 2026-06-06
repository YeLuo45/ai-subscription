/**
 * IPv4.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { IPv4 } from '../IPv4';

describe('IPv4 — parse', () => {
  it('parses valid', () => {
    const ip = IPv4.parse('192.168.1.1');
    expect(ip).not.toBe(null);
    expect(ip!.toString()).toBe('192.168.1.1');
  });

  it('parses 0.0.0.0', () => {
    expect(IPv4.parse('0.0.0.0')?.toString()).toBe('0.0.0.0');
  });

  it('parses 255.255.255.255', () => {
    expect(IPv4.parse('255.255.255.255')?.toString()).toBe('255.255.255.255');
  });

  it('rejects octet > 255', () => {
    expect(IPv4.parse('256.0.0.0')).toBe(null);
  });

  it('rejects negative', () => {
    expect(IPv4.parse('-1.0.0.0')).toBe(null);
  });

  it('rejects wrong format', () => {
    expect(IPv4.parse('1.2.3')).toBe(null);
  });
});

describe('IPv4 — constructor', () => {
  it('validates octets', () => {
    expect(() => new IPv4(256, 0, 0, 0)).toThrow();
    expect(() => new IPv4(-1, 0, 0, 0)).toThrow();
  });
});

describe('IPv4 — fromNumber', () => {
  it('round trip', () => {
    const ip = IPv4.fromNumber(0xC0A80101);
    expect(ip.toString()).toBe('192.168.1.1');
  });

  it('zero', () => {
    expect(IPv4.fromNumber(0).toString()).toBe('0.0.0.0');
  });

  it('max', () => {
    expect(IPv4.fromNumber(0xFFFFFFFF).toString()).toBe('255.255.255.255');
  });

  it('invalid range', () => {
    expect(() => IPv4.fromNumber(-1)).toThrow();
    expect(() => IPv4.fromNumber(0x100000000)).toThrow();
  });
});

describe('IPv4 — class', () => {
  it('class A', () => expect(new IPv4(10, 0, 0, 1).getClass()).toBe('A'));
  it('class B', () => expect(new IPv4(128, 0, 0, 1).getClass()).toBe('B'));
  it('class C', () => expect(new IPv4(192, 168, 0, 1).getClass()).toBe('C'));
  it('class D', () => expect(new IPv4(224, 0, 0, 1).getClass()).toBe('D'));
  it('class E', () => expect(new IPv4(240, 0, 0, 1).getClass()).toBe('E'));
});

describe('IPv4 — type checks', () => {
  it('loopback', () => {
    expect(new IPv4(127, 0, 0, 1).isLoopback()).toBe(true);
  });

  it('private 10.x', () => {
    expect(new IPv4(10, 0, 0, 1).isPrivate()).toBe(true);
  });

  it('private 172.16', () => {
    expect(new IPv4(172, 16, 0, 1).isPrivate()).toBe(true);
  });

  it('private 192.168', () => {
    expect(new IPv4(192, 168, 1, 1).isPrivate()).toBe(true);
  });

  it('not private', () => {
    expect(new IPv4(8, 8, 8, 8).isPrivate()).toBe(false);
  });

  it('multicast', () => {
    expect(new IPv4(224, 0, 0, 1).isMulticast()).toBe(true);
  });

  it('broadcast', () => {
    expect(new IPv4(255, 255, 255, 255).isBroadcast()).toBe(true);
  });

  it('reserved 0.x', () => {
    expect(new IPv4(0, 0, 0, 0).isReserved()).toBe(true);
  });

  it('reserved 240+', () => {
    expect(new IPv4(240, 0, 0, 1).isReserved()).toBe(true);
  });

  it('public', () => {
    expect(new IPv4(8, 8, 8, 8).isPublic()).toBe(true);
  });
});

describe('IPv4 — compare', () => {
  it('equals', () => {
    expect(new IPv4(1, 2, 3, 4).equals(new IPv4(1, 2, 3, 4))).toBe(true);
  });

  it('less', () => {
    expect(new IPv4(1, 2, 3, 4).compareTo(new IPv4(1, 2, 3, 5))).toBe(-1);
  });

  it('greater', () => {
    expect(new IPv4(1, 2, 3, 5).compareTo(new IPv4(1, 2, 3, 4))).toBe(1);
  });
});
