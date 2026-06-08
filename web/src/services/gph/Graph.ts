/**
 * Graph — adjacency list / matrix
 */

export class Graph {
  private _adj = new Map<string, string[]>();
  private _directed: boolean;

  constructor(directed: boolean = false) {
    this._directed = directed;
  }

  addVertex(v: string): void {
    if (!this._adj.has(v)) this._adj.set(v, []);
  }

  addEdge(u: string, v: string): void {
    this.addVertex(u);
    this.addVertex(v);
    if (!this._adj.get(u)!.includes(v)) this._adj.get(u)!.push(v);
    if (!this._directed && !this._adj.get(v)!.includes(u)) this._adj.get(v)!.push(u);
  }

  removeEdge(u: string, v: string): void {
    this._adj.set(u, (this._adj.get(u) ?? []).filter((x) => x !== v));
    if (!this._directed) this._adj.set(v, (this._adj.get(v) ?? []).filter((x) => x !== u));
  }

  hasVertex(v: string): boolean { return this._adj.has(v); }

  hasEdge(u: string, v: string): boolean {
    return (this._adj.get(u) ?? []).includes(v);
  }

  vertices(): string[] { return [...this._adj.keys()]; }

  neighbors(v: string): string[] { return [...(this._adj.get(v) ?? [])]; }

  size(): number { return this._adj.size; }

  isDirected(): boolean { return this._directed; }

  bfs(start: string): string[] {
    const visited = new Set<string>();
    const order: string[] = [];
    const queue: string[] = [start];
    visited.add(start);
    while (queue.length) {
      const v = queue.shift()!;
      order.push(v);
      for (const n of this._adj.get(v) ?? []) {
        if (!visited.has(n)) {
          visited.add(n);
          queue.push(n);
        }
      }
    }
    return order;
  }

  dfs(start: string): string[] {
    const visited = new Set<string>();
    const order: string[] = [];
    const _dfs = (v: string) => {
      visited.add(v);
      order.push(v);
      for (const n of this._adj.get(v) ?? []) {
        if (!visited.has(n)) _dfs(n);
      }
    };
    _dfs(start);
    return order;
  }

  hasCycle(): boolean {
    const visited = new Set<string>();
    const recStack = new Set<string>();
    const _hasCycle = (v: string): boolean => {
      visited.add(v);
      recStack.add(v);
      for (const n of this._adj.get(v) ?? []) {
        if (!visited.has(n) && _hasCycle(n)) return true;
        else if (recStack.has(n)) return true;
      }
      recStack.delete(v);
      return false;
    };
    for (const v of this._adj.keys()) {
      if (!visited.has(v) && _hasCycle(v)) return true;
    }
    return false;
  }

  topologicalSort(): string[] | null {
    if (!this._directed) return null;
    const indegree = new Map<string, number>();
    for (const v of this._adj.keys()) indegree.set(v, 0);
    for (const u of this._adj.keys()) {
      for (const v of this._adj.get(u)!) {
        indegree.set(v, (indegree.get(v) ?? 0) + 1);
      }
    }
    const queue: string[] = [];
    for (const [v, d] of indegree) if (d === 0) queue.push(v);
    const order: string[] = [];
    while (queue.length) {
      const u = queue.shift()!;
      order.push(u);
      for (const v of this._adj.get(u) ?? []) {
        indegree.set(v, (indegree.get(v) ?? 0) - 1);
        if (indegree.get(v) === 0) queue.push(v);
      }
    }
    return order.length === this._adj.size ? order : null;
  }
}
