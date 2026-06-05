/**
 * DAGEngine — Topological sort execution with Tarjan SCC for cycle handling
 *
 * Inspired by: chatdev-design DAG Engine + Tarjan SCC
 * Source pattern: /home/hermes/projects/chatdev-design/docs-site/zh/execution.md
 *
 * Pure graph engine:
 *   - addNode(id, data) / addEdge(from, to, data) / remove*
 *   - topologicalSort() — Kahn's algorithm, returns layers
 *   - tarjanSCC() — strongly connected components (cycle detection)
 *   - validateDAG() — checks acyclicity
 *   - getExecutionPlan() — returns layers (each layer is parallelizable)
 *   - getNodePredecessors / getNodeSuccessors
 *   - hasNode / hasEdge / size
 *
 * No I/O. Caller wires this to node executors via a separate runner.
 */

import { tarjanSCC } from './TarjanSCC';

export interface DAGNode<T = unknown> {
  id: string;
  data: T;
}

export interface DAGEdge<T = unknown> {
  from: string;
  to: string;
  data: T;
}

export interface ExecutionLayer<T = unknown> {
  /** Layer index (0 = first to run) */
  level: number;
  /** Nodes that can run in parallel at this level */
  nodes: DAGNode<T>[];
}

export class DAGEngine<TNode = unknown, TEdge = unknown> {
  private nodes: Map<string, DAGNode<TNode>> = new Map();
  private outgoing: Map<string, Set<string>> = new Map();
  private incoming: Map<string, Set<string>> = new Map();
  private edgeData: Map<string, DAGEdge<TEdge>> = new Map();

  /** Add a node. Throws if duplicate. */
  addNode(id: string, data: TNode): this {
    if (this.nodes.has(id)) {
      throw new Error(`Node "${id}" already exists`);
    }
    this.nodes.set(id, { id, data });
    this.outgoing.set(id, new Set());
    this.incoming.set(id, new Set());
    return this;
  }

  /** Add an edge. Throws if either endpoint missing. */
  addEdge(from: string, to: string, data: TEdge = undefined as TEdge): this {
    if (!this.nodes.has(from)) {
      throw new Error(`Edge source node "${from}" does not exist`);
    }
    if (!this.nodes.has(to)) {
      throw new Error(`Edge target node "${to}" does not exist`);
    }
    if (from === to) {
      throw new Error(`Self-loop not allowed: "${from}" -> "${to}"`);
    }
    const edgeKey = this.edgeKey(from, to);
    if (this.edgeData.has(edgeKey)) {
      throw new Error(`Edge "${from}" -> "${to}" already exists`);
    }
    this.outgoing.get(from)!.add(to);
    this.incoming.get(to)!.add(from);
    this.edgeData.set(edgeKey, { from, to, data });
    return this;
  }

  /** Remove a node and all its incident edges. */
  removeNode(id: string): boolean {
    if (!this.nodes.has(id)) return false;
    // Remove outgoing edges
    for (const target of Array.from(this.outgoing.get(id)!)) {
      this.incoming.get(target)!.delete(id);
      this.edgeData.delete(this.edgeKey(id, target));
    }
    // Remove incoming edges
    for (const source of Array.from(this.incoming.get(id)!)) {
      this.outgoing.get(source)!.delete(id);
      this.edgeData.delete(this.edgeKey(source, id));
    }
    this.nodes.delete(id);
    this.outgoing.delete(id);
    this.incoming.delete(id);
    return true;
  }

  /** Remove an edge. */
  removeEdge(from: string, to: string): boolean {
    if (!this.edgeData.has(this.edgeKey(from, to))) return false;
    this.outgoing.get(from)?.delete(to);
    this.incoming.get(to)?.delete(from);
    this.edgeData.delete(this.edgeKey(from, to));
    return true;
  }

  /** Get a node by id. */
  getNode(id: string): DAGNode<TNode> | undefined {
    const n = this.nodes.get(id);
    return n ? { ...n } : undefined;
  }

  /** Get an edge. */
  getEdge(from: string, to: string): DAGEdge<TEdge> | undefined {
    const e = this.edgeData.get(this.edgeKey(from, to));
    return e ? { ...e } : undefined;
  }

  /** All node ids. */
  nodeIds(): string[] {
    return Array.from(this.nodes.keys());
  }

  /** All edges. */
  edges(): DAGEdge<TEdge>[] {
    return Array.from(this.edgeData.values()).map((e) => ({ ...e }));
  }

  /** Predecessors of a node. */
  getPredecessors(id: string): string[] {
    return Array.from(this.incoming.get(id) ?? []);
  }

  /** Successors of a node. */
  getSuccessors(id: string): string[] {
    return Array.from(this.outgoing.get(id) ?? []);
  }

  /** In-degree of a node. */
  inDegree(id: string): number {
    return this.incoming.get(id)?.size ?? 0;
  }

  /** Out-degree of a node. */
  outDegree(id: string): number {
    return this.outgoing.get(id)?.size ?? 0;
  }

  /** Has node? */
  hasNode(id: string): boolean {
    return this.nodes.has(id);
  }

  /** Has edge? */
  hasEdge(from: string, to: string): boolean {
    return this.edgeData.has(this.edgeKey(from, to));
  }

  /** Number of nodes. */
  nodeCount(): number {
    return this.nodes.size;
  }

  /** Number of edges. */
  edgeCount(): number {
    return this.edgeData.size;
  }

  /** Clear all nodes and edges. */
  clear(): void {
    this.nodes.clear();
    this.outgoing.clear();
    this.incoming.clear();
    this.edgeData.clear();
  }

  /**
   * Topological sort using Kahn's algorithm.
   * Returns execution layers — each layer contains nodes that can run in parallel.
   * Throws if a cycle is detected.
   */
  topologicalSort(): ExecutionLayer<TNode>[] {
    if (this.nodes.size === 0) return [];

    // Copy in-degrees
    const inDeg = new Map<string, number>();
    for (const id of this.nodes.keys()) {
      inDeg.set(id, this.incoming.get(id)!.size);
    }

    const layers: ExecutionLayer<TNode>[] = [];
    let currentLayer: DAGNode<TNode>[] = [];
    let level = 0;
    let processed = 0;

    // Initial layer: all nodes with in-degree 0
    for (const [id, deg] of inDeg.entries()) {
      if (deg === 0) currentLayer.push(this.nodes.get(id)!);
    }

    while (currentLayer.length > 0) {
      layers.push({ level, nodes: currentLayer });
      processed += currentLayer.length;
      const nextLayer: DAGNode<TNode>[] = [];
      for (const node of currentLayer) {
        for (const successor of this.outgoing.get(node.id)!) {
          const newDeg = (inDeg.get(successor) || 0) - 1;
          inDeg.set(successor, newDeg);
          if (newDeg === 0) {
            nextLayer.push(this.nodes.get(successor)!);
          }
        }
      }
      currentLayer = nextLayer;
      level += 1;
    }

    if (processed !== this.nodes.size) {
      const remaining = Array.from(inDeg.entries())
        .filter(([_, d]) => d > 0)
        .map(([id]) => id);
      throw new Error(
        `Cycle detected — ${remaining.length} nodes unreachable from topological sort: ${remaining.slice(0, 5).join(', ')}${remaining.length > 5 ? ', ...' : ''}`,
      );
    }

    return layers;
  }

  /**
   * Detect strongly connected components (cycles) using Tarjan's algorithm.
   * Returns an array of SCCs — each is a list of node ids in the same component.
   * SCCs with size > 1 indicate cycles; SCCs with size 1 and self-loop also count.
   */
  tarjanSCCs(): string[][] {
    return tarjanSCC(
      Array.from(this.nodes.keys()),
      (id) => Array.from(this.outgoing.get(id) ?? []),
    );
  }

  /**
   * Validate that the graph is a DAG (no cycles).
   * Returns true if acyclic, false if cycles exist.
   */
  validateDAG(): boolean {
    try {
      this.topologicalSort();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Find all nodes that are part of any cycle.
   */
  findCycleNodes(): Set<string> {
    const sccs = this.tarjanSCCs();
    const cycleNodes = new Set<string>();
    for (const scc of sccs) {
      if (scc.length > 1) {
        for (const id of scc) cycleNodes.add(id);
      } else {
        // size-1 SCC with self-loop
        const id = scc[0];
        if (this.outgoing.get(id)?.has(id)) {
          cycleNodes.add(id);
        }
      }
    }
    return cycleNodes;
  }

  /**
   * Get the execution plan as parallelizable layers.
   * Alias for topologicalSort() with different return shape (just arrays).
   */
  getExecutionPlan(): string[][] {
    return this.topologicalSort().map((l) => l.nodes.map((n) => n.id));
  }

  /**
   * Get root nodes (in-degree 0).
   */
  getRoots(): string[] {
    return Array.from(this.nodes.keys()).filter((id) => this.inDegree(id) === 0);
  }

  /**
   * Get leaf nodes (out-degree 0).
   */
  getLeaves(): string[] {
    return Array.from(this.nodes.keys()).filter((id) => this.outDegree(id) === 0);
  }

  /**
   * Get all paths between two nodes (DFS).
   */
  getAllPaths(from: string, to: string, maxPaths: number = 100): string[][] {
    if (!this.nodes.has(from) || !this.nodes.has(to)) return [];
    const paths: string[][] = [];
    const dfs = (current: string, target: string, path: string[]): void => {
      if (paths.length >= maxPaths) return;
      if (current === target) {
        paths.push([...path]);
        return;
      }
      for (const succ of this.outgoing.get(current) ?? []) {
        if (path.includes(succ)) continue; // avoid revisiting in same path
        path.push(succ);
        dfs(succ, target, path);
        path.pop();
      }
    };
    dfs(from, to, [from]);
    return paths;
  }

  private edgeKey(from: string, to: string): string {
    return `${from}->${to}`;
  }
}
