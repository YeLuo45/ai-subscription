/**
 * AVLTree — self-balancing BST
 */

class AVLNode<T> {
  value: T;
  left: AVLNode<T> | null = null;
  right: AVLNode<T> | null = null;
  height = 1;
  constructor(value: T) { this.value = value; }
}

export class AVLTree<T> {
  private _root: AVLNode<T> | null = null;
  private _size = 0;

  size(): number { return this._size; }
  isEmpty(): boolean { return this._size === 0; }

  private _h(n: AVLNode<T> | null): number { return n?.height ?? 0; }
  private _bf(n: AVLNode<T>): number { return this._h(n.left) - this._h(n.right); }
  private _update(n: AVLNode<T>): void { n.height = 1 + Math.max(this._h(n.left), this._h(n.right)); }

  private _rotateRight(y: AVLNode<T>): AVLNode<T> {
    const x = y.left!;
    y.left = x.right;
    x.right = y;
    this._update(y);
    this._update(x);
    return x;
  }

  private _rotateLeft(x: AVLNode<T>): AVLNode<T> {
    const y = x.right!;
    x.right = y.left;
    y.left = x;
    this._update(x);
    this._update(y);
    return y;
  }

  private _balance(n: AVLNode<T>): AVLNode<T> {
    this._update(n);
    const bf = this._bf(n);
    if (bf > 1) {
      if (this._bf(n.left!) < 0) n.left = this._rotateLeft(n.left!);
      return this._rotateRight(n);
    }
    if (bf < -1) {
      if (this._bf(n.right!) > 0) n.right = this._rotateRight(n.right!);
      return this._rotateLeft(n);
    }
    return n;
  }

  insert(value: T): void {
    this._root = this._insert(this._root, value);
    this._size++;
  }
  private _insert(n: AVLNode<T> | null, value: T): AVLNode<T> {
    if (!n) return new AVLNode(value);
    if (value < n.value) n.left = this._insert(n.left, value);
    else if (value > n.value) n.right = this._insert(n.right, value);
    else { this._size--; return n; }
    return this._balance(n);
  }

  contains(value: T): boolean {
    let cur = this._root;
    while (cur) {
      if (value === cur.value) return true;
      cur = value < cur.value ? cur.left : cur.right;
    }
    return false;
  }

  min(): T | null {
    if (!this._root) return null;
    let cur = this._root;
    while (cur.left) cur = cur.left;
    return cur.value;
  }

  max(): T | null {
    if (!this._root) return null;
    let cur = this._root;
    while (cur.right) cur = cur.right;
    return cur.value;
  }

  inOrder(): T[] {
    const r: T[] = [];
    this._inOrder(this._root, r);
    return r;
  }
  private _inOrder(n: AVLNode<T> | null, r: T[]): void {
    if (!n) return;
    this._inOrder(n.left, r);
    r.push(n.value);
    this._inOrder(n.right, r);
  }

  height(): number { return this._h(this._root); }

  isBalanced(): boolean {
    return this._isBalanced(this._root);
  }
  private _isBalanced(n: AVLNode<T> | null): boolean {
    if (!n) return true;
    const bf = this._bf(n);
    if (Math.abs(bf) > 1) return false;
    return this._isBalanced(n.left) && this._isBalanced(n.right);
  }
}
