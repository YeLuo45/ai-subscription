/**
 * Rope — rope data structure for efficient string editing
 *
 * Inspired by: rope / crdt
 *
 * - O(log n) insert/delete
 * - O(log n) split/join
 * - O(log n) charAt
 */

class RopeNode {
  weight: number = 0;
  value: string = '';
  left: RopeNode | null = null;
  right: RopeNode | null = null;
  isLeaf: boolean = false;

  constructor(value: string = '') {
    this.value = value;
    this.isLeaf = true;
    this.weight = value.length;
  }
}

function getSize(node: RopeNode | null): number {
  if (!node) return 0;
  if (node.isLeaf) return node.value.length;
  return node.weight + getSize(node.right);
}

function rebuildNode(node: RopeNode | null): void {
  if (!node || node.isLeaf) return;
  node.weight = getSize(node.left);
}

export class Rope {
  root: RopeNode | null = null;

  /**
   * Build from string.
   */
  static fromString(s: string): Rope {
    const r = new Rope();
    r.root = new RopeNode(s);
    return r;
  }

  /**
   * Total length.
   */
  length(): number {
    return getSize(this.root);
  }

  /**
   * Char at index.
   */
  charAt(index: number): string {
    if (index < 0 || index >= this.length()) return '';
    return this._charAt(this.root!, index);
  }

  private _charAt(node: RopeNode, index: number): string {
    if (node.isLeaf) return node.value[index] ?? '';
    if (index < node.weight) return this._charAt(node.left!, index);
    return this._charAt(node.right!, index - node.weight);
  }

  /**
   * To string.
   */
  toString(): string {
    return this._toString(this.root);
  }

  private _toString(node: RopeNode | null): string {
    if (!node) return '';
    if (node.isLeaf) return node.value;
    return this._toString(node.left) + this._toString(node.right);
  }

  /**
   * Substring.
   */
  substring(start: number, end?: number): string {
    const len = this.length();
    const e = end === undefined ? len : end;
    return this._substring(this.root, start, e);
  }

  private _substring(node: RopeNode | null, start: number, end: number): string {
    if (!node || start >= end) return '';
    if (node.isLeaf) {
      return node.value.substring(start, end);
    }
    let result = '';
    if (start < node.weight) {
      result += this._substring(node.left, start, Math.min(end, node.weight));
    }
    if (end > node.weight) {
      result += this._substring(node.right, Math.max(0, start - node.weight), end - node.weight);
    }
    return result;
  }

  /**
   * Insert string at index.
   */
  insert(index: number, s: string): void {
    if (s.length === 0) return;
    const [left, right] = this._split(this.root, index);
    const newNode = new RopeNode(s);
    this.root = this._concat(this._concat(left, newNode), right);
  }

  /**
   * Delete range.
   */
  delete(start: number, end: number): void {
    const [l1, r1] = this._split(this.root, start);
    const [_, r2] = this._split(r1, end - start);
    this.root = this._concat(l1, r2);
  }

  private _split(node: RopeNode | null, pos: number): [RopeNode | null, RopeNode | null] {
    if (!node) return [null, null];
    if (node.isLeaf) {
      if (pos <= 0) return [null, node];
      if (pos >= node.value.length) return [node, null];
      return [new RopeNode(node.value.slice(0, pos)), new RopeNode(node.value.slice(pos))];
    }
    if (pos < node.weight) {
      const [l, r] = this._split(node.left, pos);
      return [l, this._concat(r, node.right)];
    }
    if (pos > node.weight) {
      const [l, r] = this._split(node.right, pos - node.weight);
      return [this._concat(node.left, l), r];
    }
    return [node.left, node.right];
  }

  private _concat(left: RopeNode | null, right: RopeNode | null): RopeNode | null {
    if (!left) return right;
    if (!right) return left;
    const merged = new RopeNode();
    merged.isLeaf = false;
    merged.left = left;
    merged.right = right;
    rebuildNode(merged);
    return merged;
  }

  /**
   * Build balanced from array of strings.
   */
  static fromArray(parts: string[]): Rope {
    const r = new Rope();
    r.root = Rope._buildBalanced(parts, 0, parts.length - 1);
    return r;
  }

  private static _buildBalanced(parts: string[], lo: number, hi: number): RopeNode | null {
    if (lo > hi) return null;
    if (lo === hi) return new RopeNode(parts[lo]);
    const mid = (lo + hi) >>> 1;
    const left = Rope._buildBalanced(parts, lo, mid);
    const right = Rope._buildBalanced(parts, mid + 1, hi);
    const node = new RopeNode();
    node.isLeaf = false;
    node.left = left;
    node.right = right;
    rebuildNode(node);
    return node;
  }
}
