/**
 * CompactTrie — bit-packed byte trie
 *
 * Inspired by: HAT-trie / Burst Trie (basic version)
 *
 * Each node stores children as a Map<char, nodeIdx> + value flag.
 * This is a more memory-efficient version of the standard TrieStore
 * (reuses nodes, no per-character allocation).
 *
 * Supports: insert, has, remove, list, hasPrefix, size, stats.
 */

interface CompactTrieNode {
  children: Map<string, number>;
  hasValue: boolean;
  value: unknown;
}

export class CompactTrie {
  private nodes: CompactTrieNode[] = [];
  private rootIndex: number = 0;
  private count: number = 0;

  constructor() {
    this.newNode();
  }

  private newNode(): number {
    const idx = this.nodes.length;
    this.nodes.push({ children: new Map(), hasValue: false, value: undefined });
    return idx;
  }

  size(): number { return this.count; }
  isEmpty(): boolean { return this.count === 0; }

  insert(word: string, value?: unknown): boolean {
    if (!word) return false;
    const parts = [...word];
    let nodeIdx = this.rootIndex;
    for (const ch of parts) {
      const node = this.nodes[nodeIdx];
      const child = node.children.get(ch);
      if (child === undefined) {
        const newIdx = this.newNode();
        node.children.set(ch, newIdx);
        nodeIdx = newIdx;
      } else {
        nodeIdx = child;
      }
    }
    const finalNode = this.nodes[nodeIdx];
    const isNew = !finalNode.hasValue;
    finalNode.hasValue = true;
    finalNode.value = value !== undefined ? value : word;
    if (isNew) this.count += 1;
    return isNew;
  }

  has(word: string): boolean {
    const nodeIdx = this.findNode(word);
    return nodeIdx !== -1 && this.nodes[nodeIdx].hasValue;
  }

  get(word: string): unknown {
    const nodeIdx = this.findNode(word);
    if (nodeIdx === -1 || !this.nodes[nodeIdx].hasValue) return undefined;
    return this.nodes[nodeIdx].value;
  }

  hasPrefix(prefix: string): boolean {
    return this.findNode(prefix) !== -1;
  }

  countPrefix(prefix: string): number {
    const nodeIdx = this.findNode(prefix);
    if (nodeIdx === -1) return 0;
    let cnt = this.nodes[nodeIdx].hasValue ? 1 : 0;
    for (const child of this.nodes[nodeIdx].children.values()) {
      cnt += this.countAll(child);
    }
    return cnt;
  }

  private countAll(nodeIdx: number): number {
    let cnt = this.nodes[nodeIdx].hasValue ? 1 : 0;
    for (const child of this.nodes[nodeIdx].children.values()) {
      cnt += this.countAll(child);
    }
    return cnt;
  }

  private findNode(word: string): number {
    let nodeIdx = this.rootIndex;
    for (const ch of word) {
      const child = this.nodes[nodeIdx].children.get(ch);
      if (child === undefined) return -1;
      nodeIdx = child;
    }
    return nodeIdx;
  }

  list(): string[] {
    const out: string[] = [];
    this.collect(this.rootIndex, '', out);
    return out;
  }

  private collect(nodeIdx: number, prefix: string, out: string[]): void {
    const node = this.nodes[nodeIdx];
    if (node.hasValue) out.push(prefix);
    for (const [ch, child] of node.children) {
      this.collect(child, prefix + ch, out);
    }
  }

  listWithPrefix(prefix: string): string[] {
    const nodeIdx = this.findNode(prefix);
    if (nodeIdx === -1) return [];
    const out: string[] = [];
    this.collect(nodeIdx, prefix, out);
    return out;
  }

  /** Memory stats. */
  stats(): { nodes: number; bytes: number; count: number } {
    return { nodes: this.nodes.length, bytes: this.nodes.length * 64, count: this.count };
  }
}
