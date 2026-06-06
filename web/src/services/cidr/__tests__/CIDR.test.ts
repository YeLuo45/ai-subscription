/**
 * CIDR.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { CIDR } from '../CIDR';
import { IPv4 } from '../../ip4/IPv4';

describe('CIDR — parse', () => {
  it('parses', () => {
    const c = CIDR.parse('192.168.0.0/24');
    expect(c).not.toBe(null);
    expect(c!.prefix).toBe(24);
  });

  it('invalid', () => {
    expect(CIDR.parse('garbage')).toBe(null);
    expect(CIDR.parse('192.168.0.0/33')).toBe(null);
  });

  it('normalizes to network', () => {
    const c = CIDR.parse('192.168.0.5/24')!;
    expect(c.network.toString()).toBe('192.168.0.0');
  });
});

describe('CIDR — size/first/last', () => {
  it('size /24', () => {
    expect(CIDR.parse('10.0.0.0/24')!.size()).toBe(256);
  });

  it('size /32', () => {
    expect(CIDR.parse('10.0.0.0/32')!.size()).toBe(1);
  });

  it('size /0', () => {
    expect(CIDR.parse('0.0.0.0/0')!.size()).toBe(1 << 32);
  });

  it('first', () => {
    const c = CIDR.parse('10.0.0.0/24')!;
    expect(c.first().toString()).toBe('10.0.0.0');
  });

  it('last', () => {
    const c = CIDR.parse('10.0.0.0/24')!;
    expect(c.last().toString()).toBe('10.0.0.255');
  });
});

describe('CIDR — contains', () => {
  const c = CIDR.parse('192.168.1.0/24')!;

  it('in', () => {
    expect(c.contains(new IPv4(192, 168, 1, 100))).toBe(true);
  });

  it('out', () => {
    expect(c.contains(new IPv4(192, 168, 2, 1))).toBe(false);
  });
});

describe('CIDR — relationships', () => {
  it('equals', () => {
    expect(CIDR.parse('10.0.0.0/8')!.equals(CIDR.parse('10.0.0.0/8')!)).toBe(true);
  });

  it('isSubnetOf', () => {
    const a = CIDR.parse('10.0.0.0/16')!;
    const b = CIDR.parse('10.0.0.0/8')!;
    expect(a.isSubnetOf(b)).toBe(true);
  });

  it('not subnet', () => {
    const a = CIDR.parse('10.0.0.0/8')!;
    const b = CIDR.parse('10.0.0.0/16')!;
    expect(a.isSubnetOf(b)).toBe(false);
  });

  it('overlaps', () => {
    const a = CIDR.parse('10.0.0.0/8')!;
    const b = CIDR.parse('10.255.0.0/16')!;
    expect(a.overlaps(b)).toBe(true);
  });

  it('not overlap', () => {
    const a = CIDR.parse('10.0.0.0/8')!;
    const b = CIDR.parse('11.0.0.0/8')!;
    expect(a.overlaps(b)).toBe(false);
  });
});

describe('CIDR — toString', () => {
  it('round trip', () => {
    const s = '192.168.1.0/24';
    expect(CIDR.parse(s)!.toString()).toBe(s);
  });
});
