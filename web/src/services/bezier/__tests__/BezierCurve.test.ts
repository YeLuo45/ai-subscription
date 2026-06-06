/**
 * BezierCurve.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { BezierCurve } from '../BezierCurve';

const p = (x: number, y: number) => ({ x, y });

describe('BezierCurve — linear', () => {
  const b = new BezierCurve('linear', [p(0, 0), p(10, 10)]);

  it('evaluates', () => {
    expect(b.evaluate(0.5)).toEqual(p(5, 5));
  });

  it('start/end', () => {
    expect(b.start()).toEqual(p(0, 0));
    expect(b.end()).toEqual(p(10, 10));
  });

  it('t out of range', () => {
    expect(b.evaluate(-1)).toEqual(p(0, 0));
    expect(b.evaluate(2)).toEqual(p(10, 10));
  });
});

describe('BezierCurve — quadratic', () => {
  const b = new BezierCurve('quadratic', [p(0, 0), p(5, 10), p(10, 0)]);

  it('start at p0', () => {
    expect(b.evaluate(0)).toEqual(p(0, 0));
  });

  it('end at p2', () => {
    expect(b.evaluate(1)).toEqual(p(10, 0));
  });

  it('midpoint', () => {
    const m = b.evaluate(0.5);
    expect(m.x).toBeCloseTo(5, 5);
    expect(m.y).toBeCloseTo(5, 5);
  });
});

describe('BezierCurve — cubic', () => {
  const b = new BezierCurve('cubic', [p(0, 0), p(0, 10), p(10, 10), p(10, 0)]);

  it('start/end', () => {
    expect(b.start()).toEqual(p(0, 0));
    expect(b.end()).toEqual(p(10, 0));
  });

  it('midpoint y', () => {
    const m = b.evaluate(0.5);
    expect(m.x).toBeCloseTo(5, 5);
  });

  it('s-curve shape', () => {
    const sample = b.sample(5);
    expect(sample.length).toBe(5);
  });
});

describe('BezierCurve — error cases', () => {
  it('wrong point count', () => {
    expect(() => new BezierCurve('cubic', [p(0, 0)])).toThrow();
  });
});

describe('BezierCurve — length/sample', () => {
  const b = new BezierCurve('cubic', [p(0, 0), p(0, 10), p(10, 10), p(10, 0)]);

  it('sample', () => {
    expect(b.sample(10).length).toBe(10);
  });

  it('length > 0', () => {
    expect(b.length()).toBeGreaterThan(0);
  });
});

describe('BezierCurve — tangent/bounds', () => {
  const b = new BezierCurve('linear', [p(0, 0), p(10, 0)]);

  it('tangent', () => {
    const t = b.tangent(0.5);
    // Linear: tangent is in direction of end-start
    expect(t.x).toBeGreaterThan(0);
    expect(t.y).toBeCloseTo(0, 5);
  });

  it('bounds', () => {
    const bb = b.bounds();
    expect(bb.minX).toBe(0);
    expect(bb.maxX).toBe(10);
  });
});
