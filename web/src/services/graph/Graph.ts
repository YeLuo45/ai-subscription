/**
 * Graph — directed/undirected graph with BFS/DFS
 *
 * Inspired by: classic graph data structure
 *
 * Adjacency list representation.
 * Supports BFS, DFS, connectedComponents, cycle detection.
 */

export interface Edge {
  from: string;
  to: string;
  weight?: number;
}

export class Graph {
  private adj: Map<string, Map<string, number>> = new Map();
  private directed: boolean;

  constructor(directed: boolean = false) {
    this.directed = directed;
  }

  addNode(node: string): void {
    if (!this.adj.has(node)) this.adj.set(node, new Map());
  }

  addEdge(from: string, to: string, weight: number = 1): void {
    this.addNode(from);
    this.addNode(to);
    this.adj.get(from)!.set(to, weight);
    if (!this.directed) this.adj.get(to)!.set(from, weight);
  }

  removeEdge(from: string, to: string): void {
    this.adj.get(from)?.delete(to);
    if (!this.directed) this.adj.get(to)?.delete(from);
  }

  removeNode(node: string): void {
    this.adj.delete(node);
    for (const neighbors of this.adj.values()) {
      neighbors.delete(node);
    }
  }

  hasNode(node: string): boolean { return this.adj.has(node); }
  hasEdge(from: string, to: string): boolean { return this.adj.get(from)?.has(to) ?? false; }
  weight(from: string, to: string): number { return this.adj.get(from)?.get(to) ?? Infinity; }

  nodes(): string[] { return Array.from(this.adj.keys()); }
  edges(): Edge[] {
    const out: Edge[] = [];
    for (const [from, neighbors] of this.adj) {
      for (const [to, weight] of neighbors) {
        if (this.directed || out.findIndex((e) => e.from === to && e.to === from) === -1) {
          out.push({ from, to, weight });
        }
      }
    }
    return out;
  }

  neighbors(node: string): string[] {
    return Array.from(this.adj.get(node)?.keys() ?? []);
  }

  /**
   * Breadth-first search from start.
   * Returns nodes in BFS order.
   */
  bfs(start: string): string[] {
    if (!this.adj.has(start)) return [];
    const visited = new Set<string>([start]);
    const queue: string[] = [start];
    const order: string[] = [];
    while (queue.length > 0) {
      const node = queue.shift()!;
      order.push(node);
      for (const nb of this.neighbors(node)) {
        if (!visited.has(nb)) {
          visited.add(nb);
          queue.push(nb);
        }
      }
    }
    return order;
  }

  /**
   * Depth-first search from start.
   */
  dfs(start: string): string[] {
    if (!this.adj.has(start)) return [];
    const visited = new Set<string>();
    const order: string[] = [];
    this.dfsRec(start, visited, order);
    return order;
  }

  private dfsRec(node: string, visited: Set<string>, order: string[]): void {
    visited.add(node);
    order.push(node);
    for (const nb of this.neighbors(node)) {
      if (!visited.has(nb)) this.dfsRec(nb, visited, order);
    }
  }

  /** Iterative DFS. */
  dfsIterative(start: string): string[] {
    if (!this.adj.has(start)) return [];
    const visited = new Set<string>();
    const order: string[] = [];
    const stack: string[] = [start];
    while (stack.length > 0) {
      const node = stack.pop()!;
      if (visited.has(node)) continue;
      visited.add(node);
      order.push(node);
      for (const nb of this.neighbors(node).reverse()) {
        if (!visited.has(nb)) stack.push(nb);
      }
    }
    return order;
  }

  /** Find all connected components. */
  connectedComponents(): string[][] {
    const visited = new Set<string>();
    const components: string[][] = [];
    for (const node of this.nodes()) {
      if (!visited.has(node)) {
        const comp = this.bfs(node);
        for (const n of comp) visited.add(n);
        components.push(comp);
      }
    }
    return components;
  }

  /** Detect cycle (undirected: parent check; directed: DFS with on-stack). */
  hasCycle(): boolean {
    if (this.directed) {
      const WHITE = 0, GRAY = 1, BLACK = 2;
      const color = new Map<string, number>();
      for (const n of this.nodes()) color.set(n, WHITE);
      for (const n of this.nodes()) {
        if (color.get(n) === WHITE && this.dfsCycle(n, color, WHITE, GRAY, BLACK)) return true;
      }
      return false;
    } else {
      const visited = new Set<string>();
      for (const n of this.nodes()) {
        if (!visited.has(n) && this.undirectedCycle(n, visited, null)) return true;
      }
      return false;
    }
  }

  private dfsCycle(node: string, color: Map<string, number>, WHITE: number, GRAY: number, BLACK: number): boolean {
    color.set(node, GRAY);
    for (const nb of this.neighbors(node)) {
      if (color.get(nb) === GRAY) return true;
      if (color.get(nb) === WHITE && this.dfsCycle(nb, color, WHITE, GRAY, BLACK)) return true;
    }
    color.set(node, BLACK);
    return false;
  }

  private undirectedCycle(node: string, visited: Set<string>, parent: string | null): boolean {
    visited.add(node);
    for (const nb of this.neighbors(node)) {
      if (!visited.has(nb)) {
        if (this.undirectedCycle(nb, visited, node)) return true;
      } else if (nb !== parent) {
        return true;
      }
    }
    return false;
  }

  size(): number { return this.adj.size; }
  isEmpty(): boolean { return this.adj.size === 0; }
}
