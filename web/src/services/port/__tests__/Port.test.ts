/**
 * Port.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Port } from '../Port';

describe('Port — basic', () => {
  it('validates', () => {
    expect(() => new Port(65536)).toThrow();
    expect(() => new Port(-1)).toThrow();
    expect(() => new Port(3.14)).toThrow();
  });

  it('parse string', () => {
    expect(Port.parse('80').number).toBe(80);
  });

  it('parse invalid', () => {
    expect(() => Port.parse('abc')).toThrow();
  });
});

describe('Port — classifications', () => {
  it('well-known', () => {
    expect(new Port(80).isWellKnown()).toBe(true);
  });

  it('registered', () => {
    expect(new Port(8080).isRegistered()).toBe(true);
  });

  it('dynamic', () => {
    expect(new Port(50000).isDynamic()).toBe(true);
  });

  it('privileged', () => {
    expect(new Port(80).isPrivileged()).toBe(true);
    expect(new Port(1024).isPrivileged()).toBe(false);
  });
});

describe('Port — service names', () => {
  it('http', () => {
    expect(new Port(80).serviceName()).toBe('http');
  });

  it('https', () => {
    expect(new Port(443).serviceName()).toBe('https');
  });

  it('ssh', () => {
    expect(new Port(22).serviceName()).toBe('ssh');
  });

  it('unknown', () => {
    expect(new Port(9999).serviceName()).toBe(null);
  });

  it('forService', () => {
    expect(Port.forService('http')?.number).toBe(80);
  });

  it('forService unknown', () => {
    expect(Port.forService('xyz')).toBe(null);
  });
});

describe('Port — equals/toString', () => {
  it('equals', () => {
    expect(new Port(80).equals(new Port(80))).toBe(true);
  });

  it('toString', () => {
    expect(new Port(80).toString()).toBe('80');
  });
});

describe('Port — static instances', () => {
  it('HTTP/HTTPS/SSH', () => {
    expect(Port.HTTP.number).toBe(80);
    expect(Port.HTTPS.number).toBe(443);
    expect(Port.SSH.number).toBe(22);
  });
});
