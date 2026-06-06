/**
 * Triangle2D.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Triangle2D } from '../Triangle2D';

const p = (x: number, y: number) => ({ x, y });

describe('Triangle2D — basic', () => {
  it('area 3-4-5', () => {
    const t = new Triangle2D(p(0, 0), p(4, 0), p(0, 3));
    expect(t.area()).toBe(6);
  });

  it('perimeter', () => {
    const t = new Triangle2D(p(0, 0), p(3, 0), p(0, 4));
    expect(t.perimeter()).toBe(12);
  });

  it('centroid', () => {
    const t = new Triangle2D(p(0, 0), p(6, 0), p(0, 6));
    const c = t.centroid();
    expect(c.x).toBe(2);
    expect(c.y).toBe(2);
  });
});

describe('Triangle2D — contains', () => {
  const t = new Triangle2D(p(0, 0), p(10, 0), p(5, 10));

  it('inside', () => {
    expect(t.contains(p(5, 3))).toBe(true);
  });

  it('outside', () => {
    expect(t.contains(p(0, 10))).toBe(false);
  });
});

describe('Triangle2D — properties', () => {
  it('isEquilateral', () => {
    const t = Triangle2D.equilateral(5);
    expect(t.isEquilateral()).toBe(true);
  });

  it('isIsosceles', () => {
    const t = new Triangle2D(p(0, 0), p(2, 0), p(1, 1));
    expect(t.isIsosceles()).toBe(true);
  });

  it('isRight 3-4-5', () => {
    const t = new Triangle2D(p(0, 0), p(3, 0), p(0, 4));
    expect(t.isRight()).toBe(true);
  });

  it('isRight false', () => {
    const t = new Triangle2D(p(0, 0), p(1, 0), p(0.5, 0.8));
    expect(t.isRight()).toBe(false);
  });
});

describe('Triangle2D — angles', () => {
  it('sum to PI', () => {
    const t = new Triangle2D(p(0, 0), p(3, 0), p(0, 4));
    const [a, b, c] = t.angles();
    expect(a + b + c).toBeCloseTo(Math.PI, 5);
  });
});

describe('Triangle2D — translate/edges', () => {
  it('translate', () => {
    const t = new Triangle2D(p(0, 0), p(1, 0), p(0, 1));
    const t2 = t.translate(5, 5);
    expect(t2.a.x).toBe(5);
  });

  it('edges 3', () => {
    expect(new Triangle2D(p(0, 0), p(1, 0), p(0, 1)).edges().length).toBe(3);
  });

  it('sideLengths', () => {
    const t = new Triangle2D(p(0, 0), p(3, 0), p(0, 4));
    const sides = t.sideLengths();
    expect(sides.sort()).toEqual([3, 4, 5].sort());
  });
});
