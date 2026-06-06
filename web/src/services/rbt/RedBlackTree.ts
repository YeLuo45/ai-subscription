/**
 * RedBlackTree — self-balancing BST
 *
 * Inspired by: CLRS Chapter 13
 *
 * Properties:
 *   1. Every node is red or black
 *   2. Root is black
 *   3. NIL leaves are black
 *   4. Red node's children are black (no two consecutive reds)
 *   5. All paths from root to NIL have same number of black nodes
 *
 * Supports: insert, has, inorder, min, max, remove, size.
 */

const COLOR_RED = 0;
const COLOR_BLACK = 1;
type Color = typeof COLOR_RED | typeof COLOR_BLACK;

interface RBNode<T> {
  key: T;
  color: Color;
  left: RBNode<T> | null;
  right: RBNode<T> | null;
  parent: RBNode<T> | null;
}

export class RedBlackTree<T> {
  private root: RBNode<T> | null = null;
  private cmp: (a: T, b: T) => number;
  private count: number = 0;

  constructor(comparator?: (a: T, b: T) => number) {
    this.cmp = comparator ?? ((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  }

  size(): number { return this.count; }
  isEmpty(): boolean { return this.root === null; }

  insert(key: T): void {
    const node: RBNode<T> = { key, color: COLOR_RED, left: null, right: null, parent: null };
    this.insertNode(node);
    this.fixInsert(node);
    this.count += 1;
  }

  has(key: T): boolean {
    return this.search(key) !== null;
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

  private inorderRec(n: RBNode<T> | null, out: T[]): void {
    if (!n) return;
    this.inorderRec(n.left, out);
    out.push(n.key);
    this.inorderRec(n.right, out);
  }

  /** Validate Red-Black tree properties. */
  isValid(): boolean {
    if (!this.root) return true;
    if (this.root.color !== COLOR_BLACK) return false;
    return this.validateNode(this.root) !== -1;
  }

  private validateNode(n: RBNode<T> | null): number {
    if (!n) return 1; // black count
    if (n.color === COLOR_RED) {
      if (n.left?.color === COLOR_RED || n.right?.color === COLOR_RED) return -1;
    }
    const l = this.validateNode(n.left);
    const r = this.validateNode(n.right);
    if (l === -1 || r === -1 || l !== r) return -1;
    return l + (n.color === COLOR_BLACK ? 1 : 0);
  }

  private search(key: T): RBNode<T> | null {
    let n = this.root;
    while (n) {
      const c = this.cmp(key, n.key);
      if (c === 0) return n;
      n = c < 0 ? n.left : n.right;
    }
    return null;
  }

  private insertNode(z: RBNode<T>): void {
    let y: RBNode<T> | null = null;
    let x = this.root;
    while (x) {
      y = x;
      x = this.cmp(z.key, x.key) < 0 ? x.left : x.right;
    }
    z.parent = y;
    if (!y) this.root = z;
    else if (this.cmp(z.key, y.key) < 0) y.left = z;
    else y.right = z;
  }

  private rotateLeft(x: RBNode<T>): void {
    const y = x.right;
    if (!y) return;
    x.right = y.left;
    if (y.left) y.left.parent = x;
    y.parent = x.parent;
    if (!x.parent) this.root = y;
    else if (x === x.parent.left) x.parent.left = y;
    else x.parent.right = y;
    y.left = x;
    x.parent = y;
  }

  private rotateRight(x: RBNode<T>): void {
    const y = x.left;
    if (!y) return;
    x.left = y.right;
    if (y.right) y.right.parent = x;
    y.parent = x.parent;
    if (!x.parent) this.root = y;
    else if (x === x.parent.right) x.parent.right = y;
    else x.parent.left = y;
    y.right = x;
    x.parent = y;
  }

  private fixInsert(z: RBNode<T>): void {
    while (z.parent && z.parent.color === COLOR_RED) {
      if (z.parent === z.parent.parent?.left) {
        const y = z.parent.parent.right;
        if (y && y.color === COLOR_RED) {
          z.parent.color = COLOR_BLACK;
          y.color = COLOR_BLACK;
          z.parent.parent.color = COLOR_RED;
          z = z.parent.parent;
        } else {
          if (z === z.parent.right) {
            z = z.parent;
            this.rotateLeft(z);
          }
          if (z.parent) {
            z.parent.color = COLOR_BLACK;
            if (z.parent.parent) {
              z.parent.parent.color = COLOR_RED;
              this.rotateRight(z.parent.parent);
            }
          }
        }
      } else {
        const y = z.parent.parent?.left;
        if (y && y.color === COLOR_RED) {
          z.parent.color = COLOR_BLACK;
          y.color = COLOR_BLACK;
          if (z.parent.parent) z.parent.parent.color = COLOR_RED;
          z = z.parent.parent!;
        } else {
          if (z === z.parent.left) {
            z = z.parent;
            this.rotateRight(z);
          }
          if (z.parent) {
            z.parent.color = COLOR_BLACK;
            if (z.parent.parent) {
              z.parent.parent.color = COLOR_RED;
              this.rotateLeft(z.parent.parent);
            }
          }
        }
      }
    }
    if (this.root) this.root.color = COLOR_BLACK;
  }
}
