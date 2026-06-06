/**
 * KDTree — k-dimensional tree for nearest neighbor search
 *
 * Inspired by: classic geometric data structure
 *
 * Build a balanced k-d tree by recursively splitting points on median
 * alternating axes. Supports k-NN query.
 *
 * Note: 2D specialization for simplicity.
 */

export type Point2D = readonly [number, number];

export interface KDNode {
  point: Point2D;
  left: KDNode | null;
  right: KDNode | null;
  axis: 0 | 1;
}

export class KDTree {
  private root: KDNode | null = null;
  private nodeCount: number = 0;

  constructor(points: Point2D[] = []) {
    if (points.length > 0) this.build(points);
  }

  build(points: Point2D[]): void {
    this.nodeCount = points.length;
    this.root = this.buildRec(points, 0);
  }

  size(): number { return this.nodeCount; }

  private buildRec(pts: Point2D[], depth: number): KDNode | null {
    if (pts.length === 0) return null;
    const axis: 0 | 1 = (depth % 2) === 0 ? 0 : 1;
    pts.sort((a, b) => a[axis] - b[axis]);
    const mid = Math.floor(pts.length / 2);
    return {
      point: pts[mid],
      left: this.buildRec(pts.slice(0, mid), depth + 1),
      right: this.buildRec(pts.slice(mid + 1), depth + 1),
      axis,
    };
  }

  /** Squared distance between points. */
  static distance(a: Point2D, b: Point2D): number {
    const dx = a[0] - b[0];
    const dy = a[1] - b[1];
    return dx * dx + dy * dy;
  }

  nearest(target: Point2D, k: number = 1): { point: Point2D; distance: number }[] {
    if (!this.root || k <= 0) return [];
    const best: { point: Point2D; dist: number }[] = [];
    this.nearestRec(this.root, target, k, best);
    return best.sort((a, b) => a.dist - b.dist).map((x) => ({ point: x.point, distance: Math.sqrt(x.dist) }));
  }

  private nearestRec(node: KDNode | null, target: Point2D, k: number, best: { point: Point2D; dist: number }[]): void {
    if (!node) return;
    const dist = KDTree.distance(node.point, target);
    this.addBest(best, { point: node.point, dist }, k);
    const diff = target[node.axis] - node.point[node.axis];
    const first = diff < 0 ? node.left : node.right;
    const second = diff < 0 ? node.right : node.left;
    this.nearestRec(first, target, k, best);
    if (best.length < k || diff * diff < this.worstDist(best)) {
      this.nearestRec(second, target, k, best);
    }
  }

  private worstDist(best: { dist: number }[]): number {
    let m = -Infinity;
    for (const b of best) if (b.dist > m) m = b.dist;
    return m;
  }

  private addBest(best: { point: Point2D; dist: number }[], candidate: { point: Point2D; dist: number }, k: number): void {
    if (best.length < k) {
      best.push(candidate);
    } else if (candidate.dist < this.worstDist(best)) {
      let idx = 0;
      for (let i = 1; i < best.length; i++) if (best[i].dist > best[idx].dist) idx = i;
      best[idx] = candidate;
    }
  }

  radiusSearch(target: Point2D, radius: number): Point2D[] {
    if (!this.root) return [];
    const out: Point2D[] = [];
    this.radiusRec(this.root, target, radius, out);
    return out;
  }

  private radiusRec(node: KDNode | null, target: Point2D, radius: number, out: Point2D[]): void {
    if (!node) return;
    const d = Math.sqrt(KDTree.distance(node.point, target));
    if (d <= radius) out.push(node.point);
    const diff = target[node.axis] - node.point[node.axis];
    this.radiusRec(diff < 0 ? node.left : node.right, target, radius, out);
    if (Math.abs(diff) <= radius) {
      this.radiusRec(diff < 0 ? node.right : node.left, target, radius, out);
    }
  }
}
