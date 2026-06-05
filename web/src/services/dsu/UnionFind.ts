/**
 * UnionFind — Disjoint Set Union (DSU)
 *
 * Inspired by: Kruskal's MST, Tarjan's union-find
 *
 * Track disjoint sets with:
 *   - find(x): root of x's set (path compression)
 *   - union(x, y): merge sets containing x and y (union by rank)
 *   - connected(x, y): same set?
 *
 * Near O(α(n)) per operation (α = inverse Ackermann, < 5 for n < 2^65536).
 */

export class UnionFind {
  private parent: number[] = [];
  private rank: number[] = [];
  private count: number = 0;

  constructor(n: number = 0) {
    this.makeSet(n);
  }

  /** Add n new elements. */
  makeSet(n: number): void {
    for (let i = 0; i < n; i++) {
      this.parent.push(this.parent.length);
      this.rank.push(0);
      this.count += 1;
    }
  }

  /** Find root with path compression. */
  find(x: number): number {
    if (x < 0 || x >= this.parent.length) throw new Error(`out of range: ${x}`);
    let root = x;
    while (this.parent[root] !== root) root = this.parent[root];
    // Path compression
    while (this.parent[x] !== root) {
      const next = this.parent[x];
      this.parent[x] = root;
      x = next;
    }
    return root;
  }

  /** Union by rank. Returns true if merged, false if already in same set. */
  union(x: number, y: number): boolean {
    const rx = this.find(x);
    const ry = this.find(y);
    if (rx === ry) return false;
    if (this.rank[rx] < this.rank[ry]) {
      this.parent[rx] = ry;
    } else if (this.rank[rx] > this.rank[ry]) {
      this.parent[ry] = rx;
    } else {
      this.parent[ry] = rx;
      this.rank[rx] += 1;
    }
    this.count -= 1;
    return true;
  }

  /** Are x and y in the same set? */
  connected(x: number, y: number): boolean {
    return this.find(x) === this.find(y);
  }

  /** Number of disjoint sets. */
  setCount(): number { return this.count; }

  /** Total number of elements. */
  size(): number { return this.parent.length; }

  /** Get all sets as arrays of element indices. */
  getSets(): number[][] {
    const map = new Map<number, number[]>();
    for (let i = 0; i < this.parent.length; i++) {
      const root = this.find(i);
      if (!map.has(root)) map.set(root, []);
      map.get(root)!.push(i);
    }
    return Array.from(map.values());
  }
}
