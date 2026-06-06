/**
 * ShortestPath — single-source and all-pairs shortest path algorithms
 *
 * Inspired by: classic graph algorithms
 *
 * Implements:
 *   - dijkstra(graph, source): non-negative weights, O((V+E) log V)
 *   - bellmanFord(graph, source): handles negative weights, O(VE)
 *   - floydWarshall(graph): all-pairs, O(V^3)
 *   - reconstructPath(predecessors, source, target)
 */

export interface WeightedEdge {
  from: string;
  to: string;
  weight: number;
}

export interface WeightedGraph {
  directed?: boolean;
  nodes: string[];
  edges: WeightedEdge[];
  neighbors(node: string): WeightedEdge[];
}

export interface PathResult {
  distances: Map<string, number>;
  predecessors: Map<string, string | null>;
  hasNegativeCycle?: boolean;
}

/**
 * Build a weighted graph from nodes and edges.
 */
export function buildWeightedGraph(edges: WeightedEdge[], directed: boolean = false): WeightedGraph {
  const nodeSet = new Set<string>();
  for (const e of edges) {
    nodeSet.add(e.from);
    nodeSet.add(e.to);
  }
  const adj = new Map<string, WeightedEdge[]>();
  for (const n of nodeSet) adj.set(n, []);
  for (const e of edges) {
    adj.get(e.from)!.push(e);
    if (!directed) {
      adj.get(e.to)!.push({ from: e.to, to: e.from, weight: e.weight });
    }
  }
  return {
    directed,
    nodes: Array.from(nodeSet),
    edges,
    neighbors: (n) => adj.get(n) ?? [],
  };
}

/**
 * Dijkstra's algorithm.
 * Returns distances and predecessors.
 */
export function dijkstra(graph: WeightedGraph, source: string): PathResult {
  const distances = new Map<string, number>();
  const predecessors = new Map<string, string | null>();
  const visited = new Set<string>();
  for (const n of graph.nodes) {
    distances.set(n, Infinity);
    predecessors.set(n, null);
  }
  distances.set(source, 0);

  while (visited.size < graph.nodes.length) {
    let u: string | null = null;
    let minDist = Infinity;
    for (const n of graph.nodes) {
      if (!visited.has(n) && distances.get(n)! < minDist) {
        minDist = distances.get(n)!;
        u = n;
      }
    }
    if (u === null) break;
    visited.add(u);
    for (const edge of graph.neighbors(u)) {
      const alt = distances.get(u)! + edge.weight;
      if (alt < distances.get(edge.to)!) {
        distances.set(edge.to, alt);
        predecessors.set(edge.to, u);
      }
    }
  }
  return { distances, predecessors };
}

/**
 * Bellman-Ford algorithm.
 * Detects negative cycles.
 */
export function bellmanFord(graph: WeightedGraph, source: string): PathResult {
  const distances = new Map<string, number>();
  const predecessors = new Map<string, string | null>();
  for (const n of graph.nodes) {
    distances.set(n, Infinity);
    predecessors.set(n, null);
  }
  distances.set(source, 0);
  const V = graph.nodes.length;
  for (let i = 0; i < V - 1; i++) {
    let changed = false;
    for (const e of graph.edges) {
      const alt = distances.get(e.from)! + e.weight;
      if (alt < distances.get(e.to)!) {
        distances.set(e.to, alt);
        predecessors.set(e.to, e.from);
        changed = true;
      }
    }
    if (!changed) break;
  }
  // Check negative cycle
  let hasNegativeCycle = false;
  for (const e of graph.edges) {
    if (distances.get(e.from)! + e.weight < distances.get(e.to)!) {
      hasNegativeCycle = true;
      break;
    }
  }
  return { distances, predecessors, hasNegativeCycle };
}

/**
 * Floyd-Warshall all-pairs shortest path.
 */
export function floydWarshall(graph: WeightedGraph): Map<string, Map<string, number>> {
  const dist = new Map<string, Map<string, number>>();
  for (const u of graph.nodes) {
    const m = new Map<string, number>();
    for (const v of graph.nodes) {
      m.set(v, u === v ? 0 : Infinity);
    }
    for (const e of graph.neighbors(u)) {
      if (e.weight < m.get(e.to)!) m.set(e.to, e.weight);
    }
    dist.set(u, m);
  }
  for (const k of graph.nodes) {
    for (const i of graph.nodes) {
      for (const j of graph.nodes) {
        const d = dist.get(i)!.get(k)! + dist.get(k)!.get(j)!;
        if (d < dist.get(i)!.get(j)!) dist.get(i)!.set(j, d);
      }
    }
  }
  return dist;
}

/**
 * Reconstruct shortest path from source to target using predecessor map.
 */
export function reconstructPath(predecessors: Map<string, string | null>, source: string, target: string): string[] {
  if (!predecessors.has(target)) return [];
  const path: string[] = [];
  let cur: string | null = target;
  while (cur !== null) {
    path.unshift(cur);
    if (cur === source) break;
    cur = predecessors.get(cur) ?? null;
  }
  if (path[0] !== source) return [];
  return path;
}
