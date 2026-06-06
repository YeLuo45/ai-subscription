/**
 * AVLTree — self-balancing BST (height-balanced)
 *
 * Inspired by: Adelson-Velsky and Landis 1962
 *
 * Balance factor of any node is -1, 0, or 1.
 * On insert, rebalance with rotations.
 *
 * Supports: insert, has, inorder, height, isValid, min, max, size.
 */

interface AVLNode<T> {
  key: T;
  height: number;
  left: AVLNode<T> | null;
  right: AVLNode<T> | null;
}

export class AVLTree<T> {
  private root: AVLNode<T> | null = null;
  private cmp: (a: T, b: T) => number;
  private count: number = 0;

  constructor(comparator?: (a: T, b: T) => number) {
    this.cmp = comparator ?? ((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  }

  size(): number { return this.count; }
  isEmpty(): boolean { return this.root === null; }
  height(): number { return this.root ? this.root.height : 0; }

  insert(key: T): void {
    this.root = this.insertRec(this.root, key);
    this.count += 1;
  }

  has(key: T): boolean {
    let n = this.root;
    while (n) {
      const c = this.cmp(key, n.key);
      if (c === 0) return true;
      n = c < 0 ? n.left : n.right;
    }
    return false;
  }

  min(): T | null {
    if (!this.root) return null;
    let n = this.root;
    while (n.left) n = n.left;
    return n.key;
  }

  max(): T | null {
    if (!this.root) return null;
    let n = this.root;
    while (n.right) n = n.right;
    return n.key;
  }

  inorder(): T[] {
    const out: T[] = [];
    this.inorderRec(this.root, out);
    return out;
  }

  isValid(): boolean {
    return this.validateNode(this.root) !== -1;
  }

  private validateNode(n: AVLNode<T> | null): number {
    if (!n) return 0;
    const l = this.validateNode(n.left);
    const r = this.validateNode(n.right);
    if (l === -1 || r === -1) return -1;
    if (Math.abs(l - r) > 1) return -1;
    return Math.max(l, r) + 1;
  }

  private inorderRec(n: AVLNode<T> | null, out: T[]): void {
    if (!n) return;
    this.inorderRec(n.left, out);
    out.push(n.key);
    this.inorderRec(n.right, out);
  }

  private heightOf(n: AVLNode<T> | null): number {
    return n ? n.height : 0;
  }

  private updateHeight(n: AVLNode<T>): void {
    n.height = Math.max(this.heightOf(n.left), this.heightOf(n.right)) + 1;
  }

  private balanceFactor(n: AVLNode<T>): number {
    return this.heightOf(n.left) - this.heightOf(n.right);
  }

  private rotateRight(y: AVLNode<T>): AVLNode<T> {
    const x = y.left!;
    const t = x.right;
    x.right = y;
    y.left = t;
    this.updateHeight(y);
    this.updateHeight(x);
    return x;
  }

  private rotateLeft(x: AVLNode<T>): AVLNode<T> {
    const y = x.right!;
    const t = y.left;
    y.left = x;
    x.right = t;
    this.updateHeight(x);
    this.updateHeight(y);
    return y;
  }

  private rebalance(n: AVLNode<T>): AVLNode<T> {
    this.updateHeight(n);
    const bf = this.balanceFactor(n);
    if (bf > 1) {
      if (this.balanceFactor(n.left!) < 0) {
        n.left = this.rotateLeft(n.left!);
      }
      return this.rotateRight(n);
    }
    if (bf < -1) {
      if (this.balanceFactor(n.right!) > 0) {
        n.right = this.rotateRight(n.right!);
      }
      return this.rotateLeft(n);
    }
    return n;
  }

  private insertRec(n: AVLNode<T> | null, key: T): AVLNode<T> {
    if (!n) return { key, height: 1, left: null, right: null };
    const c = this.cmp(key, n.key);
    if (c < 0) n.left = this.insertRec(n.left, key);
    else n.right = this.insertRec(n.right, key);
    return this.rebalance(n);
  }
}
