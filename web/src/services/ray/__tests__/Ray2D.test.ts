/**
 * Ray2D.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Ray2D } from '../Ray2D';
import { BoundingBox } from '../../bbox/BoundingBox';

const p = (x: number, y: number) => ({ x, y });

describe('Ray2D — basic', () => {
  it('pointAt', () => {
    const r = new Ray2D(p(0, 0), p(1, 0));
    expect(r.pointAt(5)).toEqual(p(5, 0));
  });
});

describe('Ray2D — intersect segment', () => {
  it('hits horizontal segment', () => {
    const r = new Ray2D(p(0, 0), p(1, 0));
    const t = r.intersectSegment(p(5, -1), p(5, 1));
    expect(t).toBe(5);
  });

  it('misses segment', () => {
    const r = new Ray2D(p(0, 0), p(1, 0));
    const t = r.intersectSegment(p(5, 5), p(10, 5));
    expect(t).toBe(null);
  });

  it('behind ray', () => {
    const r = new Ray2D(p(0, 0), p(1, 0));
    const t = r.intersectSegment(p(-5, -1), p(-5, 1));
    expect(t).toBe(null);
  });
});

describe('Ray2D — intersect box', () => {
  it('hits box', () => {
    const r = new Ray2D(p(0, 0), p(1, 0));
    const box = new BoundingBox(5, -5, 10, 5);
    const hit = r.intersectBox(box);
    expect(hit).not.toBe(null);
    expect(hit!.tmin).toBe(5);
  });

  it('misses box', () => {
    const r = new Ray2D(p(0, 0), p(0, 1));
    const box = new BoundingBox(5, 5, 10, 10);
    expect(r.intersectBox(box)).toBe(null);
  });

  it('origin inside box', () => {
    const r = new Ray2D(p(0, 0), p(1, 0));
    const box = new BoundingBox(-1, -1, 1, 1);
    const hit = r.intersectBox(box);
    expect(hit!.tmin).toBeLessThan(0);
  });
});

describe('Ray2D — reflect', () => {
  it('reflect horizontal', () => {
    const r = new Ray2D(p(0, 0), p(1, 0));
    const reflected = r.reflect(p(-1, 0));
    expect(reflected.direction.x).toBeCloseTo(-1, 5);
  });
});
