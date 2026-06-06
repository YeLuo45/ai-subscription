/**
 * Line2D.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Line2D } from '../Line2D';

const p = (x: number, y: number) => ({ x, y });

describe('Line2D — basic', () => {
  it('length', () => {
    const l = new Line2D(p(0, 0), p(3, 4));
    expect(l.length()).toBe(5);
  });

  it('direction unit', () => {
    const l = new Line2D(p(0, 0), p(3, 4));
    const d = l.direction();
    expect(d.x).toBeCloseTo(0.6, 5);
    expect(d.y).toBeCloseTo(0.8, 5);
  });

  it('direction zero length', () => {
    const l = new Line2D(p(1, 1), p(1, 1));
    expect(l.direction()).toEqual(p(0, 0));
  });
});

describe('Line2D — slope/intercept', () => {
  it('slope', () => {
    expect(new Line2D(p(0, 0), p(2, 4)).slope()).toBe(2);
  });

  it('vertical no slope', () => {
    expect(new Line2D(p(2, 0), p(2, 4)).slope()).toBe(null);
  });

  it('yIntercept', () => {
    expect(new Line2D(p(0, 3), p(2, 5)).yIntercept()).toBe(3);
  });
});

describe('Line2D — distance', () => {
  it('distanceFromPoint horizontal', () => {
    const l = new Line2D(p(0, 0), p(10, 0));
    expect(l.distanceFromPoint(p(5, 3))).toBe(3);
  });

  it('distanceFromPoint diagonal', () => {
    const l = new Line2D(p(0, 0), p(3, 4));
    expect(l.distanceFromPoint(p(0, 5))).toBeCloseTo(3, 5);
  });
});

describe('Line2D — nearest point', () => {
  it('nearestPoint on line', () => {
    const l = new Line2D(p(0, 0), p(10, 0));
    const n = l.nearestPoint(p(5, 3));
    expect(n).toEqual(p(5, 0));
  });

  it('nearestPoint beyond endpoint', () => {
    const l = new Line2D(p(0, 0), p(10, 0));
    const n = l.nearestPoint(p(20, 3));
    expect(n.x).toBe(20); // infinite line, projects past endpoint
  });
});

describe('Line2D — intersect', () => {
  it('cross lines', () => {
    const a = new Line2D(p(0, 0), p(10, 10));
    const b = new Line2D(p(0, 10), p(10, 0));
    const i = a.intersect(b);
    expect(i?.x).toBeCloseTo(5, 5);
  });

  it('parallel returns null', () => {
    const a = new Line2D(p(0, 0), p(10, 0));
    const b = new Line2D(p(0, 1), p(10, 1));
    expect(a.intersect(b)).toBe(null);
  });
});

describe('Line2D — properties', () => {
  it('isHorizontal/isVertical', () => {
    expect(new Line2D(p(0, 0), p(10, 0)).isHorizontal()).toBe(true);
    expect(new Line2D(p(0, 0), p(0, 10)).isVertical()).toBe(true);
  });

  it('midpoint', () => {
    expect(new Line2D(p(0, 0), p(10, 10)).midpoint()).toEqual(p(5, 5));
  });
});
