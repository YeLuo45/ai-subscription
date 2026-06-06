/**
 * Graph.test.ts — Pure unit tests for graph
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Graph } from '../Graph';

describe('Graph — basic', () => {
  let g: Graph;
  beforeEach(() => { g = new Graph(); });

  it('starts empty', () => {
    expect(g.isEmpty()).toBe(true);
  });

  it('adds nodes', () => {
    g.addNode('A');
    expect(g.hasNode('A')).toBe(true);
    expect(g.size()).toBe(1);
  });

  it('adds edges', () => {
    g.addEdge('A', 'B');
    expect(g.hasEdge('A', 'B')).toBe(true);
    expect(g.hasEdge('B', 'A')).toBe(true); // undirected default
  });

  it('weight is 1 by default', () => {
    g.addEdge('A', 'B');
    expect(g.weight('A', 'B')).toBe(1);
  });

  it('weight override', () => {
    g.addEdge('A', 'B', 5);
    expect(g.weight('A', 'B')).toBe(5);
  });
});

describe('Graph — BFS/DFS', () => {
  let g: Graph;
  beforeEach(() => {
    g = new Graph();
    g.addEdge('A', 'B');
    g.addEdge('A', 'C');
    g.addEdge('B', 'D');
    g.addEdge('C', 'D');
  });

  it('BFS visits all reachable', () => {
    const r = g.bfs('A');
    expect(r.length).toBe(4);
    expect(r[0]).toBe('A');
    expect(r).toContain('B');
    expect(r).toContain('C');
    expect(r).toContain('D');
  });

  it('DFS visits all reachable', () => {
    const r = g.dfs('A');
    expect(r.length).toBe(4);
  });

  it('iterative DFS same reach', () => {
    const r = g.dfsIterative('A');
    expect(r.length).toBe(4);
  });

  it('BFS from disconnected returns only component', () => {
    g.addNode('E');
    expect(g.bfs('A')).not.toContain('E');
  });
});

describe('Graph — connected components', () => {
  it('finds components', () => {
    const g = new Graph();
    g.addEdge('A', 'B');
    g.addEdge('C', 'D');
    g.addNode('E');
    const comps = g.connectedComponents();
    expect(comps.length).toBe(3);
  });

  it('empty graph no components', () => {
    const g = new Graph();
    expect(g.connectedComponents()).toEqual([]);
  });
});

describe('Graph — cycle detection', () => {
  it('undirected cycle', () => {
    const g = new Graph();
    g.addEdge('A', 'B');
    g.addEdge('B', 'C');
    g.addEdge('C', 'A');
    expect(g.hasCycle()).toBe(true);
  });

  it('undirected no cycle', () => {
    const g = new Graph();
    g.addEdge('A', 'B');
    g.addEdge('B', 'C');
    expect(g.hasCycle()).toBe(false);
  });

  it('directed cycle', () => {
    const g = new Graph(true);
    g.addEdge('A', 'B');
    g.addEdge('B', 'C');
    g.addEdge('C', 'A');
    expect(g.hasCycle()).toBe(true);
  });

  it('directed no cycle (DAG)', () => {
    const g = new Graph(true);
    g.addEdge('A', 'B');
    g.addEdge('A', 'C');
    g.addEdge('B', 'D');
    g.addEdge('C', 'D');
    expect(g.hasCycle()).toBe(false);
  });
});

describe('Graph — edges and nodes', () => {
  it('nodes and edges list', () => {
    const g = new Graph();
    g.addEdge('A', 'B');
    g.addEdge('B', 'C');
    expect(g.nodes().sort()).toEqual(['A', 'B', 'C']);
    expect(g.edges().length).toBe(2); // undirected
  });

  it('directed edges list', () => {
    const g = new Graph(true);
    g.addEdge('A', 'B');
    g.addEdge('B', 'C');
    expect(g.edges().length).toBe(2);
  });
});
