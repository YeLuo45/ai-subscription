/**
 * AhoCorasick.test.ts — Pure unit tests for Aho-Corasick automaton
 */

import { describe, it, expect } from 'vitest';
import { AhoCorasick } from '../AhoCorasick';

describe('AhoCorasick — basic', () => {
  it('builds with patterns', () => {
    const ac = new AhoCorasick(['he', 'she', 'his', 'hers']);
    expect(ac.patternCount()).toBe(4);
  });

  it('finds single match', () => {
    const ac = new AhoCorasick(['he']);
    const r = ac.search('hello');
    expect(r.length).toBe(1);
    expect(r[0].pattern).toBe('he');
    expect(r[0].position).toBe(1);
  });

  it('returns empty for no matches', () => {
    const ac = new AhoCorasick(['xyz']);
    expect(ac.search('hello').length).toBe(0);
  });
});

describe('AhoCorasick — multiple patterns', () => {
  it('finds all patterns in text', () => {
    const ac = new AhoCorasick(['he', 'she', 'his', 'hers']);
    const r = ac.search('ushers');
    // 'she' at pos 3, 'he' (suffix of 'she') at pos 3, 'hers' at pos 5
    // AC follows: she -> he(suffix) -> her -> hers via r,s at pos 4,5
    expect(r.length).toBe(3);
    const patterns = r.map((m) => m.pattern).sort();
    expect(patterns).toEqual(['he', 'hers', 'she']);
  });

  it('overlapping matches', () => {
    const ac = new AhoCorasick(['ab', 'bc']);
    const r = ac.search('abc');
    expect(r.length).toBe(2);
  });
});

describe('AhoCorasick — empty inputs', () => {
  it('empty text', () => {
    const ac = new AhoCorasick(['hi']);
    expect(ac.search('')).toEqual([]);
  });

  it('empty patterns', () => {
    const ac = new AhoCorasick();
    expect(ac.search('hello')).toEqual([]);
  });
});

describe('AhoCorasick — node count', () => {
  it('reports node count', () => {
    const ac = new AhoCorasick(['abc', 'abd', 'abe']);
    // shared prefix: root, a, b, c, d, e = 6 nodes
    expect(ac.nodeCount()).toBe(6);
  });
});

describe('AhoCorasick — rebuild', () => {
  it('rebuild with new patterns', () => {
    const ac = new AhoCorasick(['foo']);
    ac.build(['bar']);
    expect(ac.patternCount()).toBe(1);
    expect(ac.search('bar').length).toBe(1);
    expect(ac.search('foo').length).toBe(0);
  });
});

describe('AhoCorasick — patternIndex', () => {
  it('reports correct pattern index', () => {
    const ac = new AhoCorasick(['cat', 'dog']);
    const r = ac.search('cat dog');
    expect(r[0].patternIndex).toBe(0);
    expect(r[1].patternIndex).toBe(1);
  });
});
