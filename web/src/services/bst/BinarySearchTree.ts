/**
 * BinarySearchTree — binary search tree
 */

class TreeNode<T> {
  value: T;
  left: TreeNode<T> | null = null;
  right: TreeNode<T> | null = null;
  constructor(value: T) { this.value = value; }
}

export class BinarySearchTree<T> {
  private _root: TreeNode<T> | null = null;

  size(): number { return this._size(this._root); }
  private _size(n: TreeNode<T> | null): number {
    if (!n) return 0;
    return 1 + this._size(n.left) + this._size(n.right);
  }

  isEmpty(): boolean { return this._root === null; }

  insert(value: T): void {
    this._root = this._insert(this._root, value);
  }

  private _insert(n: TreeNode<T> | null, value: T): TreeNode<T> {
    if (!n) return new TreeNode(value);
    if (value < n.value) n.left = this._insert(n.left, value);
    else if (value > n.value) n.right = this._insert(n.right, value);
    return n;
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

  height(): number {
    return this._height(this._root);
  }
  private _height(n: TreeNode<T> | null): number {
    if (!n) return -1;
    return 1 + Math.max(this._height(n.left), this._height(n.right));
  }

  inOrder(): T[] {
    const r: T[] = [];
    this._inOrder(this._root, r);
    return r;
  }
  private _inOrder(n: TreeNode<T> | null, r: T[]): void {
    if (!n) return;
    this._inOrder(n.left, r);
    r.push(n.value);
    this._inOrder(n.right, r);
  }

  preOrder(): T[] {
    const r: T[] = [];
    this._preOrder(this._root, r);
    return r;
  }
  private _preOrder(n: TreeNode<T> | null, r: T[]): void {
    if (!n) return;
    r.push(n.value);
    this._preOrder(n.left, r);
    this._preOrder(n.right, r);
  }

  postOrder(): T[] {
    const r: T[] = [];
    this._postOrder(this._root, r);
    return r;
  }
  private _postOrder(n: TreeNode<T> | null, r: T[]): void {
    if (!n) return;
    this._postOrder(n.left, r);
    this._postOrder(n.right, r);
    r.push(n.value);
  }

  levelOrder(): T[] {
    const r: T[] = [];
    if (!this._root) return r;
    const queue: TreeNode<T>[] = [this._root];
    while (queue.length) {
      const n = queue.shift()!;
      r.push(n.value);
      if (n.left) queue.push(n.left);
      if (n.right) queue.push(n.right);
    }
    return r;
  }

  remove(value: T): boolean {
    const before = this.size();
    this._root = this._remove(this._root, value);
    return this.size() < before;
  }
  private _remove(n: TreeNode<T> | null, value: T): TreeNode<T> | null {
    if (!n) return null;
    if (value < n.value) n.left = this._remove(n.left, value);
    else if (value > n.value) n.right = this._remove(n.right, value);
    else {
      if (!n.left) return n.right;
      if (!n.right) return n.left;
      // both children: find in-order successor
      let succ = n.right;
      while (succ.left) succ = succ.left;
      n.value = succ.value;
      n.right = this._remove(n.right, succ.value);
    }
    return n;
  }
}
