/**
 * DAGEngine.test.ts — Pure unit tests for DAG topological sort + Tarjan SCC
 */

import { describe, it, expect } from 'vitest';
import { DAGEngine } from '../DAGEngine';
import { tarjanSCC } from '../TarjanSCC';

describe('DAGEngine — node and edge CRUD', () => {
  it('adds nodes and edges', () => {
    const g = new DAGEngine<string, number>();
    g.addNode('a', 'A').addNode('b', 'B').addEdge('a', 'b', 1);
    expect(g.nodeCount()).toBe(2);
    expect(g.edgeCount()).toBe(1);
  });

  it('rejects duplicate node', () => {
    const g = new DAGEngine();
    g.addNode('a', 1);
    expect(() => g.addNode('a', 2)).toThrow('already exists');
  });

  it('rejects edge with missing source', () => {
    const g = new DAGEngine();
    g.addNode('b', 1);
    expect(() => g.addEdge('a', 'b')).toThrow('source node "a" does not exist');
  });

  it('rejects edge with missing target', () => {
    const g = new DAGEngine();
    g.addNode('a', 1);
    expect(() => g.addEdge('a', 'b')).toThrow('target node "b" does not exist');
  });

  it('rejects self-loop', () => {
    const g = new DAGEngine();
    g.addNode('a', 1);
    expect(() => g.addEdge('a', 'a')).toThrow('Self-loop');
  });

  it('rejects duplicate edge', () => {
    const g = new DAGEngine();
    g.addNode('a', 1).addNode('b', 1);
    g.addEdge('a', 'b');
    expect(() => g.addEdge('a', 'b')).toThrow('already exists');
  });

  it('removes nodes and their incident edges', () => {
    const g = new DAGEngine();
    g.addNode('a', 1).addNode('b', 1).addNode('c', 1);
    g.addEdge('a', 'b').addEdge('b', 'c');
    expect(g.removeNode('b')).toBe(true);
    expect(g.nodeCount()).toBe(2);
    expect(g.edgeCount()).toBe(0);
  });

  it('removeNode returns false for unknown', () => {
    const g = new DAGEngine();
    expect(g.removeNode('x')).toBe(false);
  });

  it('removes edge', () => {
    const g = new DAGEngine();
    g.addNode('a', 1).addNode('b', 1).addEdge('a', 'b');
    expect(g.removeEdge('a', 'b')).toBe(true);
    expect(g.edgeCount()).toBe(0);
  });

  it('removeEdge returns false for unknown edge', () => {
    const g = new DAGEngine();
    g.addNode('a', 1).addNode('b', 1);
    expect(g.removeEdge('a', 'b')).toBe(false);
  });

  it('clear removes all', () => {
    const g = new DAGEngine();
    g.addNode('a', 1).addNode('b', 1).addEdge('a', 'b');
    g.clear();
    expect(g.nodeCount()).toBe(0);
    expect(g.edgeCount()).toBe(0);
  });
});

describe('DAGEngine — queries', () => {
  it('hasNode / hasEdge', () => {
    const g = new DAGEngine();
    g.addNode('a', 1).addNode('b', 1).addEdge('a', 'b');
    expect(g.hasNode('a')).toBe(true);
    expect(g.hasNode('x')).toBe(false);
    expect(g.hasEdge('a', 'b')).toBe(true);
    expect(g.hasEdge('b', 'a')).toBe(false);
  });

  it('inDegree / outDegree', () => {
    const g = new DAGEngine();
    g.addNode('a', 1).addNode('b', 1).addNode('c', 1);
    g.addEdge('a', 'c').addEdge('b', 'c');
    expect(g.inDegree('c')).toBe(2);
    expect(g.outDegree('c')).toBe(0);
    expect(g.inDegree('a')).toBe(0);
    expect(g.outDegree('a')).toBe(1);
  });

  it('getPredecessors / getSuccessors', () => {
    const g = new DAGEngine();
    g.addNode('a', 1).addNode('b', 1).addNode('c', 1);
    g.addEdge('a', 'b').addEdge('a', 'c');
    expect(g.getPredecessors('a')).toEqual([]);
    expect(g.getSuccessors('a').sort()).toEqual(['b', 'c']);
  });

  it('getRoots returns in-degree-0 nodes', () => {
    const g = new DAGEngine();
    g.addNode('a', 1).addNode('b', 1).addNode('c', 1);
    g.addEdge('a', 'b').addEdge('b', 'c');
    expect(g.getRoots()).toEqual(['a']);
    expect(g.getLeaves()).toEqual(['c']);
  });

  it('getAllPaths between two nodes', () => {
    const g = new DAGEngine();
    g.addNode('a', 1).addNode('b', 1).addNode('c', 1).addNode('d', 1);
    g.addEdge('a', 'b').addEdge('a', 'c').addEdge('b', 'd').addEdge('c', 'd');
    const paths = g.getAllPaths('a', 'd');
    expect(paths.length).toBe(2);
    expect(paths.some((p) => p.join() === 'a,b,d')).toBe(true);
    expect(paths.some((p) => p.join() === 'a,c,d')).toBe(true);
  });

  it('getAllPaths respects maxPaths', () => {
    const g = new DAGEngine();
    g.addNode('a', 1).addNode('b', 1).addNode('c', 1).addNode('d', 1);
    g.addEdge('a', 'b').addEdge('a', 'c').addEdge('b', 'd').addEdge('c', 'd');
    const paths = g.getAllPaths('a', 'd', 1);
    expect(paths.length).toBe(1);
  });

  it('getAllPaths returns empty for unknown nodes', () => {
    const g = new DAGEngine();
    g.addNode('a', 1);
    expect(g.getAllPaths('a', 'b')).toEqual([]);
    expect(g.getAllPaths('x', 'a')).toEqual([]);
  });
});

describe('DAGEngine — topological sort (Kahn)', () => {
  it('returns single node with no edges', () => {
    const g = new DAGEngine();
    g.addNode('a', 1);
    const layers = g.topologicalSort();
    expect(layers.length).toBe(1);
    expect(layers[0].level).toBe(0);
    expect(layers[0].nodes.map((n) => n.id)).toEqual(['a']);
  });

  it('linear chain a -> b -> c', () => {
    const g = new DAGEngine();
    g.addNode('a', 1).addNode('b', 1).addNode('c', 1);
    g.addEdge('a', 'b').addEdge('b', 'c');
    const layers = g.topologicalSort();
    expect(layers.length).toBe(3);
    expect(layers[0].nodes.map((n) => n.id)).toEqual(['a']);
    expect(layers[1].nodes.map((n) => n.id)).toEqual(['b']);
    expect(layers[2].nodes.map((n) => n.id)).toEqual(['c']);
  });

  it('parallel branches (diamond)', () => {
    const g = new DAGEngine();
    g.addNode('a', 1).addNode('b', 1).addNode('c', 1).addNode('d', 1);
    g.addEdge('a', 'b').addEdge('a', 'c').addEdge('b', 'd').addEdge('c', 'd');
    const layers = g.topologicalSort();
    expect(layers.length).toBe(3);
    expect(layers[0].nodes.map((n) => n.id)).toEqual(['a']);
    expect(layers[1].nodes.map((n) => n.id).sort()).toEqual(['b', 'c']);
    expect(layers[2].nodes.map((n) => n.id)).toEqual(['d']);
  });

  it('multi-root DAG', () => {
    const g = new DAGEngine();
    g.addNode('a', 1).addNode('b', 1).addNode('c', 1);
    g.addEdge('a', 'c').addEdge('b', 'c');
    const layers = g.topologicalSort();
    expect(layers.length).toBe(2);
    expect(layers[0].nodes.map((n) => n.id).sort()).toEqual(['a', 'b']);
    expect(layers[1].nodes.map((n) => n.id)).toEqual(['c']);
  });

  it('throws on cycle', () => {
    const g = new DAGEngine();
    g.addNode('a', 1).addNode('b', 1).addNode('c', 1);
    g.addEdge('a', 'b').addEdge('b', 'c').addEdge('c', 'a');
    expect(() => g.topologicalSort()).toThrow(/Cycle detected/);
  });

  it('handles empty graph', () => {
    const g = new DAGEngine();
    expect(g.topologicalSort()).toEqual([]);
  });

  it('getExecutionPlan returns parallelizable layers as string arrays', () => {
    const g = new DAGEngine();
    g.addNode('a', 1).addNode('b', 1).addNode('c', 1);
    g.addEdge('a', 'c').addEdge('b', 'c');
    const plan = g.getExecutionPlan();
    expect(plan[0].sort()).toEqual(['a', 'b']);
    expect(plan[1]).toEqual(['c']);
  });
});

describe('DAGEngine — validateDAG and cycle detection', () => {
  it('validateDAG returns true for acyclic graph', () => {
    const g = new DAGEngine();
    g.addNode('a', 1).addNode('b', 1).addNode('c', 1);
    g.addEdge('a', 'b').addEdge('b', 'c');
    expect(g.validateDAG()).toBe(true);
  });

  it('validateDAG returns false for cyclic graph', () => {
    const g = new DAGEngine();
    g.addNode('a', 1).addNode('b', 1);
    g.addEdge('a', 'b').addEdge('b', 'a');
    expect(g.validateDAG()).toBe(false);
  });

  it('findCycleNodes returns all nodes in any cycle', () => {
    const g = new DAGEngine();
    g.addNode('a', 1).addNode('b', 1).addNode('c', 1).addNode('d', 1);
    g.addEdge('a', 'b').addEdge('b', 'c').addEdge('c', 'a').addEdge('a', 'd');
    const cycle = g.findCycleNodes();
    expect(cycle.has('a')).toBe(true);
    expect(cycle.has('b')).toBe(true);
    expect(cycle.has('c')).toBe(true);
    expect(cycle.has('d')).toBe(false);
  });

  it('findCycleNodes returns empty for acyclic graph', () => {
    const g = new DAGEngine();
    g.addNode('a', 1).addNode('b', 1);
    g.addEdge('a', 'b');
    expect(g.findCycleNodes().size).toBe(0);
  });
});

describe('TarjanSCC — pure function tests', () => {
  it('single node has one SCC', () => {
    const sccs = tarjanSCC(['a'], () => []);
    expect(sccs.length).toBe(1);
    expect(sccs[0]).toEqual(['a']);
  });

  it('two disconnected nodes have two SCCs', () => {
    const sccs = tarjanSCC(['a', 'b'], () => []);
    expect(sccs.length).toBe(2);
  });

  it('linear chain: each node is its own SCC', () => {
    const sccs = tarjanSCC(['a', 'b', 'c'], (id) => {
      if (id === 'a') return ['b'];
      if (id === 'b') return ['c'];
      return [];
    });
    expect(sccs.length).toBe(3);
  });

  it('cycle: all nodes in one SCC', () => {
    const sccs = tarjanSCC(['a', 'b', 'c'], (id) => {
      if (id === 'a') return ['b'];
      if (id === 'b') return ['c'];
      if (id === 'c') return ['a'];
      return [];
    });
    expect(sccs.length).toBe(1);
    expect(sccs[0].sort()).toEqual(['a', 'b', 'c']);
  });

  it('two cycles: two SCCs', () => {
    const sccs = tarjanSCC(['a', 'b', 'c', 'd'], (id) => {
      if (id === 'a') return ['b'];
      if (id === 'b') return ['a'];
      if (id === 'c') return ['d'];
      if (id === 'd') return ['c'];
      return [];
    });
    const big = sccs.filter((s) => s.length > 1);
    expect(big.length).toBe(2);
  });
});
