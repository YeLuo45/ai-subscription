/**
 * SegmentTree.test.ts — Pure unit tests for segment tree
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SegmentTree } from '../SegmentTree';

describe('SegmentTree — sum mode', () => {
  it('builds and queries sum', () => {
    const st = new SegmentTree([1, 2, 3, 4, 5], 'sum');
    expect(st.query(1, 5)).toBe(15);
    expect(st.query(2, 4)).toBe(9);
  });

  it('point update changes sum', () => {
    const st = new SegmentTree([1, 2, 3, 4, 5], 'sum');
    st.update(3, 100);
    expect(st.query(1, 5)).toBe(112);
  });

  it('handles empty range', () => {
    const st = new SegmentTree([1, 2, 3], 'sum');
    expect(st.query(2, 1)).toBe(0);
  });

  it('range add updates sum', () => {
    const st = new SegmentTree([1, 2, 3, 4, 5], 'sum');
    st.rangeAdd(2, 4, 10);
    expect(st.query(1, 5)).toBe(45); // 1 + 12 + 13 + 14 + 5
    expect(st.query(2, 4)).toBe(39);
  });
});

describe('SegmentTree — max mode', () => {
  it('queries max', () => {
    const st = new SegmentTree([3, 1, 4, 1, 5, 9, 2, 6], 'max');
    expect(st.query(1, 8)).toBe(9);
    expect(st.query(1, 3)).toBe(4);
  });

  it('point update max', () => {
    const st = new SegmentTree([3, 1, 4, 1, 5], 'max');
    st.update(2, 100);
    expect(st.query(1, 5)).toBe(100);
  });
});

describe('SegmentTree — min mode', () => {
  it('queries min', () => {
    const st = new SegmentTree([3, 1, 4, 1, 5, 9, 2, 6], 'min');
    expect(st.query(1, 8)).toBe(1);
    expect(st.query(5, 7)).toBe(2);
  });
});

describe('SegmentTree — edge cases', () => {
  it('single element', () => {
    const st = new SegmentTree([42], 'sum');
    expect(st.query(1, 1)).toBe(42);
  });

  it('two elements', () => {
    const st = new SegmentTree([1, 2], 'sum');
    expect(st.query(1, 2)).toBe(3);
  });
});
