/**
 * SegmentTree.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { SegmentTree } from '../SegmentTree';

describe('SegmentTree — sum', () => {
  it('build/query', () => {
    const st = new SegmentTree([1, 2, 3, 4, 5], 'sum');
    expect(st.query(0, 4)).toBe(15);
    expect(st.query(0, 2)).toBe(6);
  });

  it('point update', () => {
    const st = new SegmentTree([1, 2, 3, 4, 5], 'sum');
    st.update(2, 10);
    expect(st.query(0, 4)).toBe(22);
  });

  it('empty', () => {
    const st = new SegmentTree([], 'sum');
    expect(st.size()).toBe(0);
  });
});

describe('SegmentTree — max', () => {
  it('max', () => {
    const st = new SegmentTree([1, 5, 3, 2, 4], 'max');
    expect(st.query(0, 4)).toBe(5);
  });

  it('max subrange', () => {
    const st = new SegmentTree([1, 5, 3, 2, 4], 'max');
    expect(st.query(1, 3)).toBe(5);
  });
});

describe('SegmentTree — min', () => {
  it('min', () => {
    const st = new SegmentTree([3, 1, 4, 1, 5, 9, 2, 6], 'min');
    expect(st.query(0, 7)).toBe(1);
  });
});
