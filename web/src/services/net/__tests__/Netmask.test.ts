/**
 * Netmask.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Netmask } from '../Netmask';

describe('Netmask — CIDR', () => {
  it('valid CIDR', () => {
    expect(Netmask.isValidCIDR('192.168.0.0/24')).toBe(true);
  });

  it('invalid CIDR', () => {
    expect(Netmask.isValidCIDR('192.168.0.0')).toBe(false);
    expect(Netmask.isValidCIDR('192.168.0.0/33')).toBe(false);
  });
});

describe('Netmask — conversion', () => {
  it('/24', () => {
    expect(Netmask.cidrToNetmask(24)).toBe('255.255.255.0');
  });

  it('/16', () => {
    expect(Netmask.cidrToNetmask(16)).toBe('255.255.0.0');
  });

  it('/0', () => {
    expect(Netmask.cidrToNetmask(0)).toBe('0.0.0.0');
  });

  it('/32', () => {
    expect(Netmask.cidrToNetmask(32)).toBe('255.255.255.255');
  });

  it('netmask to CIDR', () => {
    expect(Netmask.netmaskToCIDR('255.255.255.0')).toBe(24);
  });
});

describe('Netmask — addresses', () => {
  it('network', () => {
    expect(Netmask.networkAddress('192.168.1.50/24')).toBe('192.168.1.0');
  });

  it('broadcast', () => {
    expect(Netmask.broadcastAddress('192.168.1.0/24')).toBe('192.168.1.255');
  });
});

describe('Netmask — hosts', () => {
  it('/24 hosts', () => {
    expect(Netmask.numHosts(24)).toBe(254);
  });

  it('/30 hosts', () => {
    expect(Netmask.numHosts(30)).toBe(2);
  });
});

describe('Netmask — contains', () => {
  it('in network', () => {
    expect(Netmask.contains('192.168.0.0/24', '192.168.0.50')).toBe(true);
  });

  it('out of network', () => {
    expect(Netmask.contains('192.168.0.0/24', '10.0.0.1')).toBe(false);
  });
});
