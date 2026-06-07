/**
 * UnitConversion.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { UnitConversion } from '../UnitConversion';

describe('UnitConversion — length', () => {
  it('m to km', () => {
    expect(UnitConversion.convert(1000, 'm', 'km', 'length')).toBe(1);
  });

  it('km to m', () => {
    expect(UnitConversion.convert(1, 'km', 'm', 'length')).toBe(1000);
  });

  it('in to cm', () => {
    expect(UnitConversion.convert(1, 'in', 'cm', 'length')).toBeCloseTo(2.54, 5);
  });

  it('mi to km', () => {
    expect(UnitConversion.convert(1, 'mi', 'km', 'length')).toBeCloseTo(1.609344, 5);
  });
});

describe('UnitConversion — mass', () => {
  it('kg to g', () => {
    expect(UnitConversion.convert(1, 'kg', 'g', 'mass')).toBe(1000);
  });

  it('lb to kg', () => {
    expect(UnitConversion.convert(1, 'lb', 'kg', 'mass')).toBeCloseTo(0.45359237, 7);
  });
});

describe('UnitConversion — temperature', () => {
  it('C to F', () => {
    expect(UnitConversion.convert(0, 'C', 'F', 'temperature')).toBe(32);
  });

  it('F to C', () => {
    expect(UnitConversion.convert(32, 'F', 'C', 'temperature')).toBe(0);
  });

  it('C to K', () => {
    expect(UnitConversion.convert(0, 'C', 'K', 'temperature')).toBe(273.15);
  });

  it('100C to F', () => {
    expect(UnitConversion.convert(100, 'C', 'F', 'temperature')).toBe(212);
  });
});

describe('UnitConversion — time', () => {
  it('h to s', () => {
    expect(UnitConversion.convert(1, 'h', 's', 'time')).toBe(3600);
  });

  it('d to h', () => {
    expect(UnitConversion.convert(1, 'd', 'h', 'time')).toBe(24);
  });
});

describe('UnitConversion — data', () => {
  it('KB to B', () => {
    expect(UnitConversion.convert(1, 'KB', 'B', 'data')).toBe(1024);
  });

  it('MB to KB', () => {
    expect(UnitConversion.convert(1, 'MB', 'KB', 'data')).toBe(1024);
  });
});

describe('UnitConversion — format', () => {
  it('formatBytes', () => {
    expect(UnitConversion.formatBytes(1024)).toBe('1.00 KB');
  });

  it('formatBytes large', () => {
    expect(UnitConversion.formatBytes(1048576)).toBe('1.00 MB');
  });

  it('formatBytes 0', () => {
    expect(UnitConversion.formatBytes(0)).toBe('0 B');
  });
});

describe('UnitConversion — listUnits', () => {
  it('length units', () => {
    const u = UnitConversion.listUnits('length');
    expect(u).toContain('m');
    expect(u).toContain('km');
  });

  it('temperature units', () => {
    const u = UnitConversion.listUnits('temperature');
    expect(u).toContain('C');
    expect(u).toContain('F');
  });
});
