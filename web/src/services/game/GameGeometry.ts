/**
 * GameGeometry — game collision and grid utilities
 */

export interface IPoint2 { x: number; y: number; }
export interface ICircle { x: number; y: number; r: number; }

export class GameGeometry {
  /**
   * Point vs circle collision.
   */
  static pointVsCircle(p: IPoint2, c: ICircle): boolean {
    const dx = p.x - c.x;
    const dy = p.y - c.y;
    return dx * dx + dy * dy <= c.r * c.r;
  }

  /**
   * Circle vs circle.
   */
  static circleVsCircle(c1: ICircle, c2: ICircle): boolean {
    const dx = c1.x - c2.x;
    const dy = c1.y - c2.y;
    const r = c1.r + c2.r;
    return dx * dx + dy * dy <= r * r;
  }

  /**
   * AABB vs AABB.
   */
  static aabbVsAabb(b1: { x: number; y: number; w: number; h: number }, b2: { x: number; y: number; w: number; h: number }): boolean {
    return b1.x < b2.x + b2.w && b1.x + b1.w > b2.x
      && b1.y < b2.y + b2.h && b1.y + b1.h > b2.y;
  }

  /**
   * Point vs AABB.
   */
  static pointVsAabb(p: IPoint2, b: { x: number; y: number; w: number; h: number }): boolean {
    return p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;
  }

  /**
   * Grid coordinate from world position.
   */
  static worldToGrid(x: number, y: number, cellSize: number): { col: number; row: number } {
    return { col: Math.floor(x / cellSize), row: Math.floor(y / cellSize) };
  }

  /**
   * World position from grid.
   */
  static gridToWorld(col: number, row: number, cellSize: number): IPoint2 {
    return { x: col * cellSize, y: row * cellSize };
  }

  /**
   * Manhattan distance (grid).
   */
  static manhattan(p1: IPoint2, p2: IPoint2): number {
    return Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y);
  }

  /**
   * Chebyshev distance.
   */
  static chebyshev(p1: IPoint2, p2: IPoint2): number {
    return Math.max(Math.abs(p1.x - p2.x), Math.abs(p1.y - p2.y));
  }

  /**
   * Line of sight (no obstacles) - using Bresenham.
   */
  static lineOfSight(from: IPoint2, to: IPoint2): IPoint2[] {
    const points: IPoint2[] = [];
    let x0 = Math.round(from.x);
    let y0 = Math.round(from.y);
    const x1 = Math.round(to.x);
    const y1 = Math.round(to.y);
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    while (true) {
      points.push({ x: x0, y: y0 });
      if (x0 === x1 && y0 === y1) break;
      const e2 = err * 2;
      if (e2 > -dy) { err -= dy; x0 += sx; }
      if (e2 < dx) { err += dx; y0 += sy; }
    }
    return points;
  }

  /**
   * Point on circle (parametric).
   */
  static pointOnCircle(c: ICircle, angle: number): IPoint2 {
    return { x: c.x + c.r * Math.cos(angle), y: c.y + c.r * Math.sin(angle) };
  }

  /**
   * Bounce angle (reflection).
   */
  static bounce(inAngle: number, surfaceAngle: number): number {
    return 2 * surfaceAngle - inAngle;
  }
}
