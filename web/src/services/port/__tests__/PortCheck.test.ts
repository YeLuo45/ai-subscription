/**
 * PortCheck.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { PortCheck } from '../PortCheck';

describe('PortCheck — validate', () => {
  it('valid 80', () => {
    expect(PortCheck.isValid(80)).toBe(true);
  });

  it('valid 0', () => {
    expect(PortCheck.isValid(0)).toBe(true);
  });

  it('valid 65535', () => {
    expect(PortCheck.isValid(65535)).toBe(true);
  });

  it('invalid negative', () => {
    expect(PortCheck.isValid(-1)).toBe(false);
  });

  it('invalid too high', () => {
    expect(PortCheck.isValid(65536)).toBe(false);
  });

  it('invalid non-int', () => {
    expect(PortCheck.isValid(1.5)).toBe(false);
  });
});

describe('PortCheck — ranges', () => {
  it('well-known', () => {
    expect(PortCheck.isWellKnown(80)).toBe(true);
    expect(PortCheck.isWellKnown(1024)).toBe(false);
  });

  it('registered', () => {
    expect(PortCheck.isRegistered(8080)).toBe(true);
    expect(PortCheck.isRegistered(80)).toBe(false);
  });

  it('dynamic', () => {
    expect(PortCheck.isDynamic(50000)).toBe(true);
    expect(PortCheck.isDynamic(80)).toBe(false);
  });
});

describe('PortCheck — find', () => {
  it('by port', () => {
    const p = PortCheck.find(80);
    expect(p?.service).toBe('HTTP');
  });

  it('by port not found', () => {
    expect(PortCheck.find(99999)).toBeNull();
  });

  it('by service', () => {
    expect(PortCheck.findByService('HTTPS')?.port).toBe(443);
  });

  it('by service case insensitive', () => {
    expect(PortCheck.findByService('mysql')?.port).toBe(3306);
  });
});

describe('PortCheck — list', () => {
  it('all', () => {
    expect(PortCheck.listKnown().length).toBeGreaterThan(0);
  });
});

describe('PortCheck — inRange', () => {
  it('in range', () => {
    expect(PortCheck.inRange(8080, 8000, 9000)).toBe(true);
  });

  it('out of range', () => {
    expect(PortCheck.inRange(80, 8000, 9000)).toBe(false);
  });

  it('invalid port', () => {
    expect(PortCheck.inRange(-1, 0, 100)).toBe(false);
  });
});

describe('PortCheck — free', () => {
  it('free 1234', () => {
    expect(PortCheck.isLikelyFree(1234)).toBe(true);
  });

  it('not free 80', () => {
    expect(PortCheck.isLikelyFree(80)).toBe(false);
  });
});
