/**
 * SkipList — probabilistic balanced structure
 *
 * Inspired by: William Pugh 1990 paper
 *
 * Multi-level linked list. Each higher level is a "fast lane"
 * skipping many elements. Expected O(log n) for search/insert/delete.
 *
 * Supports: insert, has, remove, inorder, size.
 */

interface SkipNode<T> {
  key: T;
  forward: SkipNode<T>[];
}

export class SkipList<T> {
  private head: SkipNode<T>;
  private level: number = 0;
  private maxLevel: number;
  private p: number; // probability of promotion
  private nodeCount: number = 0;
  private cmp: (a: T, b: T) => number;

  constructor(maxLevel: number = 16, p: number = 0.5, comparator?: (a: T, b: T) => number) {
    this.maxLevel = maxLevel;
    this.p = p;
    this.cmp = comparator ?? ((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    this.head = { key: null as any, forward: new Array(maxLevel).fill(null) };
  }

  size(): number { return this.nodeCount; }

  private randomLevel(): number {
    let lvl = 0;
    while (Math.random() < this.p && lvl < this.maxLevel - 1) lvl += 1;
    return lvl;
  }

  has(key: T): boolean {
    let n = this.head;
    for (let i = this.level; i >= 0; i--) {
      while (n.forward[i] && this.cmp(n.forward[i].key, key) < 0) {
        n = n.forward[i];
      }
    }
    n = n.forward[0];
    return !!n && this.cmp(n.key, key) === 0;
  }

  insert(key: T): void {
    const update: SkipNode<T>[] = new Array(this.maxLevel).fill(this.head);
    let n = this.head;
    for (let i = this.level; i >= 0; i--) {
      while (n.forward[i] && this.cmp(n.forward[i].key, key) < 0) {
        n = n.forward[i];
      }
      update[i] = n;
    }
    n = n.forward[0];
    if (n && this.cmp(n.key, key) === 0) {
      n.key = key; // update
      return;
    }
    const newLevel = this.randomLevel();
    if (newLevel > this.level) {
      for (let i = this.level + 1; i <= newLevel; i++) update[i] = this.head;
      this.level = newLevel;
    }
    const newNode: SkipNode<T> = { key, forward: new Array(newLevel + 1).fill(null) };
    for (let i = 0; i <= newLevel; i++) {
      newNode.forward[i] = update[i].forward[i];
      update[i].forward[i] = newNode;
    }
    this.nodeCount += 1;
  }

  remove(key: T): boolean {
    const update: SkipNode<T>[] = new Array(this.maxLevel).fill(this.head);
    let n = this.head;
    for (let i = this.level; i >= 0; i--) {
      while (n.forward[i] && this.cmp(n.forward[i].key, key) < 0) {
        n = n.forward[i];
      }
      update[i] = n;
    }
    n = n.forward[0];
    if (!n || this.cmp(n.key, key) !== 0) return false;
    for (let i = 0; i <= this.level; i++) {
      if (update[i].forward[i] !== n) break;
      update[i].forward[i] = n.forward[i];
    }
    while (this.level > 0 && this.head.forward[this.level] === null) this.level -= 1;
    this.nodeCount -= 1;
    return true;
  }

  inorder(): T[] {
    const out: T[] = [];
    let n = this.head.forward[0];
    while (n) {
      out.push(n.key);
      n = n.forward[0];
    }
    return out;
  }
}
