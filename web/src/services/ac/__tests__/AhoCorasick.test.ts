/**
 * AhoCorasick.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { AhoCorasick } from '../AhoCorasick';

describe('AhoCorasick — basic', () => {
  it('find single pattern', () => {
    const ac = new AhoCorasick();
    ac.addPattern('hello');
    ac.build();
    const r = ac.search('hello world');
    expect(r.length).toBe(1);
    expect(r[0].pattern).toBe('hello');
    expect(r[0].start).toBe(0);
    expect(r[0].end).toBe(4);
  });

  it('find multiple patterns', () => {
    const ac = new AhoCorasick();
    ac.addPattern('he');
    ac.addPattern('she');
    ac.addPattern('his');
    ac.addPattern('hers');
    ac.build();
    const r = ac.search('ushers');
    expect(r.length).toBeGreaterThan(0);
  });

  it('no match', () => {
    const ac = new AhoCorasick();
    ac.addPattern('hello');
    ac.build();
    expect(ac.search('xyz')).toEqual([]);
  });

  it('duplicate addPattern', () => {
    const ac = new AhoCorasick();
    ac.addPattern('a');
    ac.addPattern('a');
    ac.build();
    const r = ac.search('aaa');
    expect(r.length).toBe(3);
  });

  it('empty text', () => {
    const ac = new AhoCorasick();
    ac.addPattern('a');
    ac.build();
    expect(ac.search('')).toEqual([]);
  });
});

describe('AhoCorasick — count', () => {
  it('count', () => {
    const ac = new AhoCorasick();
    ac.addPattern('a');
    ac.addPattern('b');
    ac.build();
    const c = ac.count('aabb');
    expect(c['a']).toBe(2);
    expect(c['b']).toBe(2);
  });
});

describe('AhoCorasick — overlap', () => {
  it('overlapping matches', () => {
    const ac = new AhoCorasick();
    ac.addPattern('aa');
    ac.build();
    const r = ac.search('aaaa');
    expect(r.length).toBe(3);
  });
});

describe('AhoCorasick — positions', () => {
  it('correct positions', () => {
    const ac = new AhoCorasick();
    ac.addPattern('cat');
    ac.build();
    const r = ac.search('cat cat');
    expect(r[0].start).toBe(0);
    expect(r[1].start).toBe(4);
  });
});
