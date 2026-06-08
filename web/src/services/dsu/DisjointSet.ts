/**
 * DisjointSet — union-find with path compression and rank
 */

export class DisjointSet<T> {
  private _parent = new Map<T, T>();
  private _rank = new Map<T, number>();
  private _size = 0;

  size(): number { return this._size; }

  add(x: T): void {
    if (!this._parent.has(x)) {
      this._parent.set(x, x);
      this._rank.set(x, 0);
      this._size++;
    }
  }

  find(x: T): T {
    if (!this._parent.has(x)) {
      this.add(x);
      return x;
    }
    if (this._parent.get(x) !== x) {
      this._parent.set(x, this.find(this._parent.get(x)!));
    }
    return this._parent.get(x)!;
  }

  union(x: T, y: T): void {
    this.add(x);
    this.add(y);
    const rx = this.find(x);
    const ry = this.find(y);
    if (rx === ry) return;
    const rankX = this._rank.get(rx)!;
    const rankY = this._rank.get(ry)!;
    if (rankX < rankY) this._parent.set(rx, ry);
    else if (rankX > rankY) this._parent.set(ry, rx);
    else {
      this._parent.set(ry, rx);
      this._rank.set(rx, rankX + 1);
    }
  }

  connected(x: T, y: T): boolean {
    return this.find(x) === this.find(y);
  }

  count(): number {
    const roots = new Set<T>();
    for (const x of this._parent.keys()) roots.add(this.find(x));
    return roots.size;
  }

  components(): T[][] {
    const map = new Map<T, T[]>();
    for (const x of this._parent.keys()) {
      const r = this.find(x);
      if (!map.has(r)) map.set(r, []);
      map.get(r)!.push(x);
    }
    return [...map.values()];
  }
}
