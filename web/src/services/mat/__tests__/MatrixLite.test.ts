/**
 * MatrixLite.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { MatrixLite } from '../MatrixLite';

describe('MatrixLite — basic', () => {
  it('constructor', () => {
    const m = new MatrixLite([[1, 2], [3, 4]]);
    expect(m.rows()).toBe(2);
    expect(m.cols()).toBe(2);
  });

  it('get/set', () => {
    const m = new MatrixLite([[1, 2], [3, 4]]);
    expect(m.get(0, 1)).toBe(2);
    m.set(0, 1, 99);
    expect(m.get(0, 1)).toBe(99);
  });

  it('zeros', () => {
    const m = MatrixLite.zeros(2, 3);
    expect(m.get(1, 2)).toBe(0);
  });

  it('identity', () => {
    const m = MatrixLite.identity(3);
    expect(m.get(1, 1)).toBe(1);
    expect(m.get(1, 2)).toBe(0);
  });
});

describe('MatrixLite — ops', () => {
  it('add', () => {
    const a = new MatrixLite([[1, 2], [3, 4]]);
    const b = new MatrixLite([[5, 6], [7, 8]]);
    const c = a.add(b);
    expect(c.get(0, 0)).toBe(6);
    expect(c.get(1, 1)).toBe(12);
  });

  it('subtract', () => {
    const a = new MatrixLite([[5, 6], [7, 8]]);
    const b = new MatrixLite([[1, 2], [3, 4]]);
    expect(a.subtract(b).get(0, 0)).toBe(4);
  });

  it('scale', () => {
    const m = new MatrixLite([[1, 2], [3, 4]]).scale(2);
    expect(m.get(0, 0)).toBe(2);
  });

  it('multiply', () => {
    // [[1,2],[3,4]] * [[1,0],[0,1]] = [[1,2],[3,4]]
    const a = new MatrixLite([[1, 2], [3, 4]]);
    const b = new MatrixLite([[1, 0], [0, 1]]);
    const c = a.multiply(b);
    expect(c.get(0, 1)).toBe(2);
  });

  it('multiply 2x2', () => {
    // [[1,2],[3,4]] * [[5,6],[7,8]] = [[19,22],[43,50]]
    const a = new MatrixLite([[1, 2], [3, 4]]);
    const b = new MatrixLite([[5, 6], [7, 8]]);
    const c = a.multiply(b);
    expect(c.get(0, 0)).toBe(19);
    expect(c.get(1, 1)).toBe(50);
  });
});

describe('MatrixLite — transpose', () => {
  it('transpose', () => {
    const m = new MatrixLite([[1, 2, 3], [4, 5, 6]]).transpose();
    expect(m.rows()).toBe(3);
    expect(m.cols()).toBe(2);
    expect(m.get(0, 1)).toBe(4);
  });
});

describe('MatrixLite — determinant/trace', () => {
  it('det 2x2', () => {
    expect(new MatrixLite([[1, 2], [3, 4]]).determinant()).toBe(-2);
  });

  it('det 3x3', () => {
    // [[1,2,3],[4,5,6],[7,8,9]] det = 0
    expect(new MatrixLite([[1, 2, 3], [4, 5, 6], [7, 8, 9]]).determinant()).toBe(0);
  });

  it('trace', () => {
    expect(new MatrixLite([[1, 2], [3, 4]]).trace()).toBe(5);
  });
});

describe('MatrixLite — inverse', () => {
  it('inverse 2x2', () => {
    const m = new MatrixLite([[1, 2], [3, 4]]).inverse();
    expect(m.get(0, 0)).toBeCloseTo(-2, 5);
    expect(m.get(0, 1)).toBeCloseTo(1, 5);
  });

  it('A * A^-1 = I', () => {
    const a = new MatrixLite([[1, 2], [3, 4]]);
    const inv = a.inverse();
    const id = a.multiply(inv);
    expect(id.get(0, 0)).toBeCloseTo(1, 5);
    expect(id.get(0, 1)).toBeCloseTo(0, 5);
  });
});
