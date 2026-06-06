/**
 * QuadTree — spatial index for 2D points
 *
 * Inspired by: d3-quadtree
 *
 * Subdivides space into 4 quadrants. Each node has capacity and splits when exceeded.
 */

import { type Vec2 } from '../geo2d/Geometry2D';
import { BoundingBox } from '../bbox/BoundingBox';

export class QuadTree {
  private bounds: BoundingBox;
  private capacity: number;
  private points: Array<Vec2 & { data: unknown }> = [];
  private divided: boolean = false;
  private nw: QuadTree | null = null;
  private ne: QuadTree | null = null;
  private sw: QuadTree | null = null;
  private se: QuadTree | null = null;

  constructor(bounds: BoundingBox, capacity: number = 4) {
    this.bounds = bounds;
    this.capacity = capacity;
  }

  /**
   * Insert a point.
   */
  insert(point: Vec2, data: unknown = null): boolean {
    if (!this.bounds.contains(point)) return false;
    if (this.points.length < this.capacity && !this.divided) {
      this.points.push({ ...point, data });
      return true;
    }
    if (!this.divided) this.subdivide();
    return (
      this.nw!.insert(point, data) ||
      this.ne!.insert(point, data) ||
      this.sw!.insert(point, data) ||
      this.se!.insert(point, data)
    );
  }

  /**
   * Query points in a region.
   */
  queryRange(range: BoundingBox): Array<Vec2 & { data: unknown }> {
    const result: Array<Vec2 & { data: unknown }> = [];
    if (!this.bounds.overlaps(range)) return result;
    for (const p of this.points) {
      if (range.contains(p)) result.push(p);
    }
    if (this.divided) {
      result.push(...this.nw!.queryRange(range));
      result.push(...this.ne!.queryRange(range));
      result.push(...this.sw!.queryRange(range));
      result.push(...this.se!.queryRange(range));
    }
    return result;
  }

  /**
   * Find nearest point to target within max distance.
   */
  queryNearest(target: Vec2, maxDist: number = Infinity): { point: Vec2; data: unknown; distance: number } | null {
    let best: { point: Vec2; data: unknown; distance: number } | null = null;
    const searchBox = new BoundingBox(
      target.x - maxDist,
      target.y - maxDist,
      target.x + maxDist,
      target.y + maxDist,
    );
    const found = this.queryRange(searchBox);
    for (const p of found) {
      const dx = p.x - target.x;
      const dy = p.y - target.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d <= maxDist && (best === null || d < best.distance)) {
        best = { point: { x: p.x, y: p.y }, data: p.data, distance: d };
      }
    }
    return best;
  }

  /**
   * Total point count.
   */
  count(): number {
    let c = this.points.length;
    if (this.divided) {
      c += this.nw!.count() + this.ne!.count() + this.sw!.count() + this.se!.count();
    }
    return c;
  }

  /**
   * Get tree depth.
   */
  depth(): number {
    if (!this.divided) return 0;
    return 1 + Math.max(this.nw!.depth(), this.ne!.depth(), this.sw!.depth(), this.se!.depth());
  }

  private subdivide(): void {
    const { minX, minY, maxX, maxY } = this.bounds;
    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;
    this.nw = new QuadTree(new BoundingBox(minX, minY, midX, midY), this.capacity);
    this.ne = new QuadTree(new BoundingBox(midX, minY, maxX, midY), this.capacity);
    this.sw = new QuadTree(new BoundingBox(minX, midY, midX, maxY), this.capacity);
    this.se = new QuadTree(new BoundingBox(midX, midY, maxX, maxY), this.capacity);
    this.divided = true;
  }
}
