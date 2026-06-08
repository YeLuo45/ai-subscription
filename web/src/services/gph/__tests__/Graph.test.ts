/**
 * Graph.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { Graph } from '../Graph';

describe('Graph — basic', () => {
  it('addVertex/hasVertex', () => {
    const g = new Graph();
    g.addVertex('a');
    expect(g.hasVertex('a')).toBe(true);
    expect(g.size()).toBe(1);
  });

  it('addEdge undirected', () => {
    const g = new Graph();
    g.addEdge('a', 'b');
    expect(g.hasEdge('a', 'b')).toBe(true);
    expect(g.hasEdge('b', 'a')).toBe(true);
  });

  it('addEdge directed', () => {
    const g = new Graph(true);
    g.addEdge('a', 'b');
    expect(g.hasEdge('a', 'b')).toBe(true);
    expect(g.hasEdge('b', 'a')).toBe(false);
  });

  it('removeEdge', () => {
    const g = new Graph();
    g.addEdge('a', 'b');
    g.removeEdge('a', 'b');
    expect(g.hasEdge('a', 'b')).toBe(false);
  });
});

describe('Graph — traversals', () => {
  it('bfs', () => {
    const g = new Graph();
    g.addEdge('a', 'b');
    g.addEdge('a', 'c');
    g.addEdge('b', 'd');
    expect(g.bfs('a')).toEqual(['a', 'b', 'c', 'd']);
  });

  it('dfs', () => {
    const g = new Graph();
    g.addEdge('a', 'b');
    g.addEdge('a', 'c');
    g.addEdge('b', 'd');
    expect(g.dfs('a')[0]).toBe('a');
    expect(g.dfs('a').length).toBe(4);
  });
});

describe('Graph — algorithms', () => {
  it('topologicalSort', () => {
    const g = new Graph(true);
    g.addEdge('a', 'b');
    g.addEdge('a', 'c');
    g.addEdge('b', 'd');
    g.addEdge('c', 'd');
    const order = g.topologicalSort()!;
    expect(order[0]).toBe('a');
    expect(order[order.length - 1]).toBe('d');
  });

  it('topologicalSort cycle', () => {
    const g = new Graph(true);
    g.addEdge('a', 'b');
    g.addEdge('b', 'a');
    expect(g.topologicalSort()).toBeNull();
  });

  it('neighbors', () => {
    const g = new Graph();
    g.addEdge('a', 'b');
    g.addEdge('a', 'c');
    expect(g.neighbors('a').sort()).toEqual(['b', 'c']);
  });
});
