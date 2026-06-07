/**
 * Geometry3D.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Geometry3D } from '../Geometry3D';

describe('Geometry3D — basic', () => {
  it('distance', () => {
    expect(Geometry3D.distance({ x: 0, y: 0, z: 0 }, { x: 1, y: 2, z: 2 })).toBe(3);
  });
});

describe('Geometry3D — sphere', () => {
  it('volume', () => {
    expect(Geometry3D.sphereVolume({ cx: 0, cy: 0, cz: 0, r: 1 })).toBeCloseTo((4 / 3) * Math.PI, 5);
  });

  it('surface', () => {
    expect(Geometry3D.sphereSurface({ cx: 0, cy: 0, cz: 0, r: 1 })).toBeCloseTo(4 * Math.PI, 5);
  });

  it('pointInSphere', () => {
    expect(Geometry3D.pointInSphere({ x: 0, y: 0, z: 0 }, { cx: 0, cy: 0, cz: 0, r: 1 })).toBe(true);
    expect(Geometry3D.pointInSphere({ x: 2, y: 0, z: 0 }, { cx: 0, cy: 0, cz: 0, r: 1 })).toBe(false);
  });

  it('spheresIntersect', () => {
    expect(Geometry3D.spheresIntersect({ cx: 0, cy: 0, cz: 0, r: 2 }, { cx: 3, cy: 0, cz: 0, r: 2 })).toBe(true);
  });
});

describe('Geometry3D — box', () => {
  it('volume', () => {
    expect(Geometry3D.boxVolume({ x: 0, y: 0, z: 0, w: 2, h: 3, d: 4 })).toBe(24);
  });

  it('surface', () => {
    expect(Geometry3D.boxSurface({ x: 0, y: 0, z: 0, w: 2, h: 3, d: 4 })).toBe(52);
  });

  it('pointInBox', () => {
    expect(Geometry3D.pointInBox({ x: 1, y: 1, z: 1 }, { x: 0, y: 0, z: 0, w: 2, h: 2, d: 2 })).toBe(true);
  });

  it('boxesIntersect', () => {
    expect(Geometry3D.boxesIntersect({ x: 0, y: 0, z: 0, w: 2, h: 2, d: 2 }, { x: 1, y: 1, z: 1, w: 2, h: 2, d: 2 })).toBe(true);
    expect(Geometry3D.boxesIntersect({ x: 0, y: 0, z: 0, w: 1, h: 1, d: 1 }, { x: 5, y: 5, z: 5, w: 1, h: 1, d: 1 })).toBe(false);
  });
});

describe('Geometry3D — others', () => {
  it('tetrahedronVolume', () => {
    const v = Geometry3D.tetrahedronVolume(
      { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: 1 }
    );
    expect(v).toBeCloseTo(1 / 6, 5);
  });

  it('cylinderVolume', () => {
    expect(Geometry3D.cylinderVolume(1, 1)).toBeCloseTo(Math.PI, 5);
  });
});
