/**
 * CartesianTree — heap-ordered binary tree from array
 *
 * Inspired by: Vuillemin 1980
 *
 * Given array A, build a tree where:
 *   - In-order traversal yields the original array
 *   - Heap-ordered by array value (min-heap or max-heap)
 *   - Each node has at most one left child and one right child
 *
 * Built in O(n) using a stack.
 */

interface CTNode {
  value: number;
  index: number;
  left: CTNode | null;
  right: CTNode | null;
  parent: CTNode | null;
}

export class CartesianTree {
  private root: CTNode | null = null;
  private arr: number[] = [];

  build(arr: number[], mode: 'min' | 'max' = 'min'): void {
    this.arr = [...arr];
    if (arr.length === 0) { this.root = null; return; }
    const n = arr.length;
    const nodes: CTNode[] = arr.map((v, i) => ({ value: v, index: i, left: null, right: null, parent: null }));
    const stack: number[] = [];
    for (let i = 0; i < n; i++) {
      let last = -1;
      while (stack.length > 0 && this.compare(arr[stack[stack.length - 1]], arr[i], mode) >= 0) {
        last = stack.pop()!;
      }
      if (stack.length > 0) {
        nodes[stack[stack.length - 1]].right = nodes[i];
        nodes[i].parent = nodes[stack[stack.length - 1]];
      }
      if (last >= 0) {
        nodes[i].left = nodes[last];
        nodes[last].parent = nodes[i];
      }
      stack.push(i);
    }
    this.root = nodes[stack[0]];
    // Set parent of root to null
    this.root.parent = null;
  }

  private compare(a: number, b: number, mode: 'min' | 'max'): number {
    if (a === b) return 0;
    if (mode === 'min') return a < b ? -1 : 1;
    return a > b ? -1 : 1;
  }

  getRoot(): CTNode | null { return this.root; }

  inorder(): number[] {
    const out: number[] = [];
    this.inorderRec(this.root, out);
    return out;
  }

  private inorderRec(n: CTNode | null, out: number[]): void {
    if (!n) return;
    this.inorderRec(n.left, out);
    out.push(n.value);
    this.inorderRec(n.right, out);
  }

  /** Pre-order traversal (root first). */
  preorder(): number[] {
    const out: number[] = [];
    this.preorderRec(this.root, out);
    return out;
  }

  private preorderRec(n: CTNode | null, out: number[]): void {
    if (!n) return;
    out.push(n.value);
    this.preorderRec(n.left, out);
    this.preorderRec(n.right, out);
  }

  /** Min/max in heap root. */
  heapTop(): number | null {
    return this.root ? this.root.value : null;
  }

  size(): number { return this.arr.length; }

  isValid(mode: 'min' | 'max' = 'min'): boolean {
    return this.validateRec(this.root, mode);
  }

  private validateRec(n: CTNode | null, mode: 'min' | 'max'): boolean {
    if (!n) return true;
    if (n.left) {
      // compare(child, parent, mode):
      //   min: child < parent → -1, child >= parent → 0/1
      //   max: child > parent → -1, child <= parent → 0/1
      // In both modes, c < 0 means child is on the wrong side of parent.
      const c = this.compare(n.left.value, n.value, mode);
      if (c < 0) return false;
      if (!this.validateRec(n.left, mode)) return false;
    }
    if (n.right) {
      const c = this.compare(n.right.value, n.value, mode);
      if (c < 0) return false;
      if (!this.validateRec(n.right, mode)) return false;
    }
    return true;
  }
}
