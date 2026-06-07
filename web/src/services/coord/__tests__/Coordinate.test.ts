/**
 * Coordinate.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Coordinate } from '../Coordinate';

describe('Coordinate — DMS', () => {
  it('parseDMS', () => {
    expect(Coordinate.parseDMS(`40°26'46"N`)).toBeCloseTo(40.4461, 3);
  });

  it('parseDMS south', () => {
    expect(Coordinate.parseDMS(`33°51'56"S`)).toBeLessThan(0);
  });

  it('parseDMS plain', () => {
    expect(Coordinate.parseDMS('40.5')).toBeCloseTo(40.5, 5);
  });

  it('toDMS', () => {
    const s = Coordinate.toDMS(40.4461);
    expect(s).toContain('40');
  });

  it('toDMS negative', () => {
    const s = Coordinate.toDMS(-33.5);
    expect(s).toContain('W');
  });
});

describe('Coordinate — haversine', () => {
  it('NYC to LA ~3940 km', () => {
    const d = Coordinate.haversine(40.7128, -74.006, 34.0522, -118.2437);
    expect(d).toBeGreaterThan(3900);
    expect(d).toBeLessThan(4000);
  });

  it('same point', () => {
    expect(Coordinate.haversine(0, 0, 0, 0)).toBe(0);
  });

  it('antipodes ~20000 km', () => {
    const d = Coordinate.haversine(0, 0, 0, 180);
    expect(d).toBeGreaterThan(19000);
    expect(d).toBeLessThan(21000);
  });
});

describe('Coordinate — bearing', () => {
  it('north bearing', () => {
    const b = Coordinate.bearing(0, 0, 1, 0);
    expect(b).toBeCloseTo(0, 0);
  });

  it('east bearing', () => {
    const b = Coordinate.bearing(0, 0, 0, 1);
    expect(b).toBeCloseTo(90, 0);
  });
});

describe('Coordinate — midpoint', () => {
  it('equator', () => {
    const m = Coordinate.midpoint(0, 0, 0, 2);
    expect(m.lon).toBeCloseTo(1, 5);
  });
});

describe('Coordinate — bounding box', () => {
  it('basic', () => {
    const b = Coordinate.boundingBox(0, 0, 100);
    expect(b.minLat).toBeLessThan(0);
    expect(b.maxLat).toBeGreaterThan(0);
  });
});

describe('Coordinate — validation', () => {
  it('valid', () => {
    expect(Coordinate.isValid(40, -74)).toBe(true);
  });

  it('invalid lat', () => {
    expect(Coordinate.isValid(91, 0)).toBe(false);
  });

  it('invalid lon', () => {
    expect(Coordinate.isValid(0, 181)).toBe(false);
  });
});
