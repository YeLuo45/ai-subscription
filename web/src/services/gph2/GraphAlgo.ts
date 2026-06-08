/**
 * GraphAlgo — graph algorithms
 *
 * Graph: weighted adjacency list { node: [{ to, weight }] }
 */

export type WeightedGraph = Map<string, { to: string; weight: number }[]>;

export class GraphAlgo {
  /**
   * Dijkstra single-source shortest paths.
   */
  static dijkstra(graph: WeightedGraph, source: string): Map<string, number> {
    const dist = new Map<string, number>();
    for (const v of graph.keys()) dist.set(v, Infinity);
    dist.set(source, 0);
    const visited = new Set<string>();
    while (visited.size < graph.size) {
      let u: string | null = null;
      let minDist = Infinity;
      for (const [v, d] of dist) {
        if (!visited.has(v) && d < minDist) { u = v; minDist = d; }
      }
      if (u === null) break;
      visited.add(u);
      for (const e of graph.get(u) ?? []) {
        const alt = (dist.get(u) ?? Infinity) + e.weight;
        if (alt < (dist.get(e.to) ?? Infinity)) dist.set(e.to, alt);
      }
    }
    return dist;
  }

  /**
   * Bellman-Ford (handles negative weights).
   */
  static bellmanFord(graph: WeightedGraph, source: string): Map<string, number> | null {
    const dist = new Map<string, number>();
    for (const v of graph.keys()) dist.set(v, Infinity);
    dist.set(source, 0);
    const edges: { u: string; v: string; w: number }[] = [];
    for (const [u, neighbors] of graph) {
      for (const e of neighbors) edges.push({ u, v: e.to, w: e.weight });
    }
    for (let i = 0; i < graph.size - 1; i++) {
      for (const e of edges) {
        if ((dist.get(e.u) ?? Infinity) + e.w < (dist.get(e.v) ?? Infinity)) {
          dist.set(e.v, (dist.get(e.u) ?? Infinity) + e.w);
        }
      }
    }
    for (const e of edges) {
      if ((dist.get(e.u) ?? Infinity) + e.w < (dist.get(e.v) ?? Infinity)) return null;
    }
    return dist;
  }

  /**
   * Prim's MST.
   */
  static prim(graph: WeightedGraph): { u: string; v: string; weight: number }[] {
    if (graph.size === 0) return [];
    const visited = new Set<string>();
    const edges: { u: string; v: string; weight: number }[] = [];
    const start = graph.keys().next().value as string;
    visited.add(start);
    while (visited.size < graph.size) {
      let best: { u: string; v: string; weight: number } | null = null;
      for (const u of visited) {
        for (const e of graph.get(u) ?? []) {
          if (visited.has(e.to)) continue;
          if (!best || e.weight < best.weight) best = { u, v: e.to, weight: e.weight };
        }
      }
      if (!best) break;
      edges.push(best);
      visited.add(best.v);
    }
    return edges;
  }

  /**
   * Floyd-Warshall all-pairs shortest paths.
   */
  static floydWarshall(graph: WeightedGraph): Map<string, Map<string, number>> {
    const nodes = [...graph.keys()];
    const dist = new Map<string, Map<string, number>>();
    for (const u of nodes) {
      const m = new Map<string, number>();
      for (const v of nodes) m.set(v, Infinity);
      m.set(u, 0);
      for (const e of graph.get(u) ?? []) m.set(e.to, e.weight);
      dist.set(u, m);
    }
    for (const k of nodes) {
      for (const i of nodes) {
        for (const j of nodes) {
          const a = dist.get(i)!.get(k)!;
          const b = dist.get(k)!.get(j)!;
          const c = dist.get(i)!.get(j)!;
          if (a + b < c) dist.get(i)!.set(j, a + b);
        }
      }
    }
    return dist;
  }

  /**
   * Detect negative cycle via Bellman-Ford.
   */
  static hasNegativeCycle(graph: WeightedGraph): boolean {
    let dist = new Map<string, number>();
    for (const v of graph.keys()) dist.set(v, 0);
    for (let i = 0; i < graph.size; i++) {
      let updated = false;
      for (const [u, neighbors] of graph) {
        for (const e of neighbors) {
          if ((dist.get(u) ?? Infinity) + e.weight < (dist.get(e.to) ?? Infinity)) {
            dist.set(e.to, (dist.get(u) ?? Infinity) + e.weight);
            updated = true;
          }
        }
      }
      if (!updated) return false;
      if (i === graph.size - 1 && updated) return true;
    }
    return false;
  }
}
