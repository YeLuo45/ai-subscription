/**
 * MACAddress.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { MACAddress } from '../MACAddress';

describe('MACAddress — validate', () => {
  it('valid colon', () => {
    expect(MACAddress.isValid('00:1B:44:11:3A:B7')).toBe(true);
  });

  it('valid dash', () => {
    expect(MACAddress.isValid('00-1B-44-11-3A-B7')).toBe(true);
  });

  it('invalid short', () => {
    expect(MACAddress.isValid('00:1B:44:11:3A')).toBe(false);
  });

  it('invalid text', () => {
    expect(MACAddress.isValid('hello')).toBe(false);
  });
});

describe('MACAddress — format', () => {
  it('normalize', () => {
    expect(MACAddress.normalize('00-1B-44-11-3A-B7')).toBe('00:1b:44:11:3a:b7');
  });

  it('format dash', () => {
    expect(MACAddress.format('00:1B:44:11:3A:B7', '-')).toBe('00-1b-44-11-3a-b7');
  });
});

describe('MACAddress — OUI', () => {
  it('getOUI', () => {
    expect(MACAddress.getOUI('00:1B:44:11:3A:B7')).toBe('00:1b:44');
  });
});

describe('MACAddress — type', () => {
  it('multicast 01:', () => {
    expect(MACAddress.isMulticast('01:00:5E:00:00:01')).toBe(true);
  });

  it('not multicast', () => {
    expect(MACAddress.isMulticast('00:1B:44:11:3A:B7')).toBe(false);
  });

  it('local', () => {
    expect(MACAddress.isLocal('02:00:00:00:00:00')).toBe(true);
  });

  it('not local', () => {
    expect(MACAddress.isLocal('00:1B:44:11:3A:B7')).toBe(false);
  });

  it('unicast', () => {
    expect(MACAddress.isUnicast('00:1B:44:11:3A:B7')).toBe(true);
  });
});

describe('MACAddress — random', () => {
  it('random with OUI', () => {
    const m = MACAddress.randomWithOUI('aa:bb:cc');
    expect(m.startsWith('aa:bb:cc')).toBe(true);
  });
});

describe('MACAddress — increment', () => {
  it('increment 1', () => {
    expect(MACAddress.increment('00:00:00:00:00:01')).toBe('00:00:00:00:00:02');
  });

  it('increment 10', () => {
    expect(MACAddress.increment('00:00:00:00:00:00', 10)).toBe('00:00:00:00:00:0a');
  });
});

describe('MACAddress — toInt', () => {
  it('toInt', () => {
    const n = MACAddress.toInt('00:00:00:00:00:01');
    expect(n).toBe(1);
  });
});
