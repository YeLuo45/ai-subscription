/**
 * ShortestPath.test.ts — Pure unit tests for shortest path algorithms
 */

import { describe, it, expect } from 'vitest';
import { buildWeightedGraph, dijkstra, bellmanFord, floydWarshall, reconstructPath } from '../ShortestPath';

describe('ShortestPath — Dijkstra', () => {
  it('computes shortest distances', () => {
    const g = buildWeightedGraph([
      { from: 'A', to: 'B', weight: 4 },
      { from: 'A', to: 'C', weight: 2 },
      { from: 'C', to: 'B', weight: 1 },
      { from: 'B', to: 'D', weight: 5 },
      { from: 'C', to: 'D', weight: 8 },
    ]);
    const r = dijkstra(g, 'A');
    expect(r.distances.get('A')).toBe(0);
    expect(r.distances.get('B')).toBe(3);
    expect(r.distances.get('C')).toBe(2);
    expect(r.distances.get('D')).toBe(8);
  });

  it('returns Infinity for unreachable', () => {
    const g = buildWeightedGraph([{ from: 'A', to: 'B', weight: 1 }]);
    g.nodes.push('C'); // isolated
    const r = dijkstra(g, 'A');
    expect(r.distances.get('C')).toBe(Infinity);
  });
});

describe('ShortestPath — Bellman-Ford', () => {
  it('handles negative weights', () => {
    const g = buildWeightedGraph([
      { from: 'A', to: 'B', weight: 4 },
      { from: 'A', to: 'C', weight: 5 },
      { from: 'B', to: 'C', weight: -3 },
    ]);
    const r = bellmanFord(g, 'A');
    expect(r.distances.get('C')).toBe(1);
  });

  it('detects negative cycle', () => {
    const g = buildWeightedGraph([
      { from: 'A', to: 'B', weight: 1 },
      { from: 'B', to: 'C', weight: -3 },
      { from: 'C', to: 'A', weight: 1 },
    ]);
    const r = bellmanFord(g, 'A');
    expect(r.hasNegativeCycle).toBe(true);
  });
});

describe('ShortestPath — Floyd-Warshall', () => {
  it('all-pairs distances', () => {
    const g = buildWeightedGraph([
      { from: 'A', to: 'B', weight: 3 },
      { from: 'B', to: 'C', weight: 1 },
    ]);
    const d = floydWarshall(g);
    expect(d.get('A')!.get('C')).toBe(4);
    expect(d.get('A')!.get('A')).toBe(0);
  });

  it('handles disconnected', () => {
    const g = buildWeightedGraph([{ from: 'A', to: 'B', weight: 1 }]);
    g.nodes.push('C');
    const d = floydWarshall(g);
    expect(d.get('A')!.get('C')).toBe(Infinity);
  });
});

describe('ShortestPath — Path reconstruction', () => {
  it('reconstructs path', () => {
    const g = buildWeightedGraph([
      { from: 'A', to: 'B', weight: 1 },
      { from: 'B', to: 'C', weight: 1 },
      { from: 'A', to: 'C', weight: 5 },
    ]);
    const r = dijkstra(g, 'A');
    const path = reconstructPath(r.predecessors, 'A', 'C');
    expect(path).toEqual(['A', 'B', 'C']);
  });

  it('returns empty for no path', () => {
    const g = buildWeightedGraph([{ from: 'A', to: 'B', weight: 1 }]);
    g.nodes.push('C');
    const r = dijkstra(g, 'A');
    expect(reconstructPath(r.predecessors, 'A', 'C')).toEqual([]);
  });

  it('source to self', () => {
    const g = buildWeightedGraph([]);
    g.nodes = ['A'];
    const r = dijkstra(g, 'A');
    expect(reconstructPath(r.predecessors, 'A', 'A')).toEqual(['A']);
  });
});
