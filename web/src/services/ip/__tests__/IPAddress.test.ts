/**
 * IPAddress.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { IPAddress } from '../IPAddress';

describe('IPAddress — validate', () => {
  it('valid IPv4', () => {
    expect(IPAddress.isIPv4('192.168.1.1')).toBe(true);
  });

  it('invalid IPv4', () => {
    expect(IPAddress.isIPv4('256.1.1.1')).toBe(false);
    expect(IPAddress.isIPv4('1.1.1')).toBe(false);
  });

  it('valid IPv6', () => {
    expect(IPAddress.isIPv6('2001:0db8:0000:0000:0000:0000:0000:0001')).toBe(true);
  });

  it('invalid IPv6', () => {
    expect(IPAddress.isIPv6('hello')).toBe(false);
  });

  it('valid any', () => {
    expect(IPAddress.isValid('1.2.3.4')).toBe(true);
  });
});

describe('IPAddress — int conversion', () => {
  it('ipv4ToInt', () => {
    expect(IPAddress.ipv4ToInt('0.0.0.1')).toBe(1);
    expect(IPAddress.ipv4ToInt('255.255.255.255')).toBe(0xffffffff);
  });

  it('intToIPv4', () => {
    expect(IPAddress.intToIPv4(1)).toBe('0.0.0.1');
    expect(IPAddress.intToIPv4(0xffffffff)).toBe('255.255.255.255');
  });

  it('roundtrip', () => {
    const ip = '192.168.1.1';
    expect(IPAddress.intToIPv4(IPAddress.ipv4ToInt(ip))).toBe(ip);
  });
});

describe('IPAddress — private/loopback', () => {
  it('private 10.x', () => {
    expect(IPAddress.isPrivate('10.0.0.1')).toBe(true);
  });

  it('private 192.168', () => {
    expect(IPAddress.isPrivate('192.168.1.1')).toBe(true);
  });

  it('not private', () => {
    expect(IPAddress.isPrivate('8.8.8.8')).toBe(false);
  });

  it('loopback', () => {
    expect(IPAddress.isLoopback('127.0.0.1')).toBe(true);
    expect(IPAddress.isLoopback('1.2.3.4')).toBe(false);
  });
});

describe('IPAddress — class', () => {
  it('class A', () => {
    expect(IPAddress.classOf('10.0.0.1')).toBe('A');
  });

  it('class C', () => {
    expect(IPAddress.classOf('192.168.1.1')).toBe('C');
  });

  it('class D', () => {
    expect(IPAddress.classOf('224.0.0.1')).toBe('D (multicast)');
  });
});

describe('IPAddress — expand', () => {
  it('expand', () => {
    expect(IPAddress.expandIPv6('2001:db8::1')).toBe('2001:0db8:0000:0000:0000:0000:0000:0001');
  });
});
