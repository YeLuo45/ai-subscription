/**
 * GraphAlgo.test.ts — Pure unit tests
 */

import { describe, it, expect } from 'vitest';
import { GraphAlgo } from '../GraphAlgo';
import type { WeightedGraph } from '../GraphAlgo';

function makeGraph(): WeightedGraph {
  const g: WeightedGraph = new Map();
  g.set('A', [{ to: 'B', weight: 4 }, { to: 'C', weight: 2 }]);
  g.set('B', [{ to: 'C', weight: 1 }, { to: 'D', weight: 5 }]);
  g.set('C', [{ to: 'B', weight: 1 }, { to: 'D', weight: 8 }, { to: 'E', weight: 10 }]);
  g.set('D', [{ to: 'E', weight: 2 }]);
  g.set('E', []);
  return g;
}

describe('GraphAlgo — dijkstra', () => {
  it('shortest paths from A', () => {
    const d = GraphAlgo.dijkstra(makeGraph(), 'A');
    expect(d.get('A')).toBe(0);
    expect(d.get('B')).toBe(3);
    expect(d.get('C')).toBe(2);
    expect(d.get('D')).toBe(8);
    expect(d.get('E')).toBe(10);
  });
});

describe('GraphAlgo — bellmanFord', () => {
  it('shortest paths', () => {
    const d = GraphAlgo.bellmanFord(makeGraph(), 'A')!;
    expect(d.get('D')).toBe(8);
  });
});

describe('GraphAlgo — prim', () => {
  it('mst total weight', () => {
    const mst = GraphAlgo.prim(makeGraph());
    // MST: B-C(1), A-C(2), D-E(2), B-D(5) = 10
    const total = mst.reduce((s, e) => s + e.weight, 0);
    expect(total).toBe(10);
    expect(mst.length).toBe(4);
  });
});

describe('GraphAlgo — floydWarshall', () => {
  it('all pairs', () => {
    const d = GraphAlgo.floydWarshall(makeGraph());
    expect(d.get('A')!.get('E')).toBe(10);
    expect(d.get('B')!.get('E')).toBe(7);
  });
});

describe('GraphAlgo — negative cycle', () => {
  it('no negative cycle', () => {
    expect(GraphAlgo.hasNegativeCycle(makeGraph())).toBe(false);
  });

  it('has negative cycle', () => {
    const g: WeightedGraph = new Map();
    g.set('A', [{ to: 'B', weight: -1 }]);
    g.set('B', [{ to: 'A', weight: -1 }]);
    expect(GraphAlgo.hasNegativeCycle(g)).toBe(true);
  });
});
