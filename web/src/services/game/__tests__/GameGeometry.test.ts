/**
 * GameGeometry.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { GameGeometry } from '../GameGeometry';

describe('GameGeometry — collisions', () => {
  it('pointVsCircle inside', () => {
    expect(GameGeometry.pointVsCircle({ x: 0, y: 0 }, { x: 0, y: 0, r: 1 })).toBe(true);
  });

  it('pointVsCircle outside', () => {
    expect(GameGeometry.pointVsCircle({ x: 2, y: 0 }, { x: 0, y: 0, r: 1 })).toBe(false);
  });

  it('circleVsCircle', () => {
    expect(GameGeometry.circleVsCircle({ x: 0, y: 0, r: 1 }, { x: 1.5, y: 0, r: 1 })).toBe(true);
  });

  it('aabbVsAabb', () => {
    expect(GameGeometry.aabbVsAabb({ x: 0, y: 0, w: 2, h: 2 }, { x: 1, y: 1, w: 2, h: 2 })).toBe(true);
  });

  it('pointVsAabb', () => {
    expect(GameGeometry.pointVsAabb({ x: 1, y: 1 }, { x: 0, y: 0, w: 2, h: 2 })).toBe(true);
  });
});

describe('GameGeometry — grid', () => {
  it('worldToGrid', () => {
    expect(GameGeometry.worldToGrid(15, 25, 10)).toEqual({ col: 1, row: 2 });
  });

  it('gridToWorld', () => {
    expect(GameGeometry.gridToWorld(2, 3, 10)).toEqual({ x: 20, y: 30 });
  });
});

describe('GameGeometry — distances', () => {
  it('manhattan', () => {
    expect(GameGeometry.manhattan({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(7);
  });

  it('chebyshev', () => {
    expect(GameGeometry.chebyshev({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(4);
  });
});

describe('GameGeometry — paths', () => {
  it('lineOfSight', () => {
    const path = GameGeometry.lineOfSight({ x: 0, y: 0 }, { x: 3, y: 0 });
    expect(path[0]).toEqual({ x: 0, y: 0 });
    expect(path[path.length - 1]).toEqual({ x: 3, y: 0 });
    expect(path.length).toBe(4);
  });

  it('pointOnCircle', () => {
    const p = GameGeometry.pointOnCircle({ x: 0, y: 0, r: 1 }, 0);
    expect(p.x).toBeCloseTo(1, 5);
  });

  it('bounce', () => {
    expect(GameGeometry.bounce(Math.PI / 4, 0)).toBeCloseTo(-Math.PI / 4, 5);
  });
});
