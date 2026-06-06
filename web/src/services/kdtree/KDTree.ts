/**
 * KDTree — k-dimensional tree
 *
 * Inspired by: kd-tree-javascript
 *
 * Recursive spatial index. Supports k-NN search and range queries.
 */

export class KDNode {
  point: number[];
  data: unknown;
  left: KDNode | null = null;
  right: KDNode | null = null;

  constructor(point: number[], data: unknown = null) {
    this.point = point;
    this.data = data;
  }
}

export class KDTree {
  private root: KDNode | null = null;
  private k: number;

  constructor(k: number = 2) {
    this.k = k;
  }

  /**
   * Insert a point.
   */
  insert(point: number[], data: unknown = null): void {
    this.root = this.insertNode(this.root, point, data, 0);
  }

  private insertNode(node: KDNode | null, point: number[], data: unknown, depth: number): KDNode {
    if (node === null) return new KDNode(point, data);
    const axis = depth % this.k;
    if (point[axis] < node.point[axis]) {
      node.left = this.insertNode(node.left, point, data, depth + 1);
    } else {
      node.right = this.insertNode(node.right, point, data, depth + 1);
    }
    return node;
  }

  /**
   * Find k nearest neighbors.
   */
  nearest(target: number[], k: number = 1): Array<{ point: number[]; data: unknown; distance: number }> {
    const result: Array<{ point: number[]; data: unknown; distance: number; depth: number }> = [];
    this.search(this.root, target, 0, k, result);
    return result
      .sort((a, b) => a.distance - b.distance)
      .slice(0, k)
      .map((r) => ({ point: r.point, data: r.data, distance: r.distance }));
  }

  private search(
    node: KDNode | null,
    target: number[],
    depth: number,
    k: number,
    result: Array<{ point: number[]; data: unknown; distance: number; depth: number }>,
  ): void {
    if (node === null) return;
    const dist = this.sqDist(node.point, target);
    if (result.length < k) {
      result.push({ point: node.point, data: node.data, distance: Math.sqrt(dist), depth });
    } else {
      // Find max
      let maxIdx = 0;
      for (let i = 1; i < result.length; i++) {
        if (result[i].distance > result[maxIdx].distance) maxIdx = i;
      }
      if (dist < result[maxIdx].distance ** 2) {
        result[maxIdx] = { point: node.point, data: node.data, distance: Math.sqrt(dist), depth };
      }
    }
    const axis = depth % this.k;
    const diff = target[axis] - node.point[axis];
    const first = diff < 0 ? node.left : node.right;
    const second = diff < 0 ? node.right : node.left;
    this.search(first, target, depth + 1, k, result);
    if (diff * diff < this.maxDistSq(result)) {
      this.search(second, target, depth + 1, k, result);
    }
  }

  private maxDistSq(result: Array<{ distance: number }>): number {
    if (result.length === 0) return Infinity;
    let max = 0;
    for (const r of result) {
      const d = r.distance ** 2;
      if (d > max) max = d;
    }
    return max;
  }

  /**
   * Range query (axis-aligned).
   */
  queryRange(min: number[], max: number[]): Array<{ point: number[]; data: unknown }> {
    const result: Array<{ point: number[]; data: unknown }> = [];
    this.queryNode(this.root, min, max, 0, result);
    return result;
  }

  private queryNode(
    node: KDNode | null,
    min: number[],
    max: number[],
    depth: number,
    result: Array<{ point: number[]; data: unknown }>,
  ): void {
    if (node === null) return;
    let inside = true;
    for (let i = 0; i < this.k; i++) {
      if (node.point[i] < min[i] || node.point[i] > max[i]) {
        inside = false;
        break;
      }
    }
    if (inside) result.push({ point: node.point, data: node.data });
    const axis = depth % this.k;
    if (min[axis] <= node.point[axis]) this.queryNode(node.left, min, max, depth + 1, result);
    if (max[axis] >= node.point[axis]) this.queryNode(node.right, min, max, depth + 1, result);
  }

  /**
   * Total count of points.
   */
  size(): number {
    return this.count(this.root);
  }

  private count(node: KDNode | null): number {
    if (node === null) return 0;
    return 1 + this.count(node.left) + this.count(node.right);
  }

  private sqDist(a: number[], b: number[]): number {
    let s = 0;
    for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
    return s;
  }
}
