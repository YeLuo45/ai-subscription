/**
 * Trie2 — prefix tree
 */

class TrieNode {
  children = new Map<string, TrieNode>();
  isEnd = false;
  count = 0; // number of words through this node
}

export class Trie2 {
  private _root = new TrieNode();
  private _size = 0;

  size(): number { return this._size; }
  isEmpty(): boolean { return this._size === 0; }

  insert(word: string): void {
    let cur = this._root;
    for (const ch of word) {
      if (!cur.children.has(ch)) cur.children.set(ch, new TrieNode());
      cur = cur.children.get(ch)!;
      cur.count++;
    }
    if (!cur.isEnd) {
      cur.isEnd = true;
      this._size++;
    }
  }

  contains(word: string): boolean {
    let cur = this._root;
    for (const ch of word) {
      const next = cur.children.get(ch);
      if (!next) return false;
      cur = next;
    }
    return cur.isEnd;
  }

  startsWith(prefix: string): boolean {
    let cur = this._root;
    for (const ch of prefix) {
      const next = cur.children.get(ch);
      if (!next) return false;
      cur = next;
    }
    return true;
  }

  countPrefix(prefix: string): number {
    let cur = this._root;
    for (const ch of prefix) {
      const next = cur.children.get(ch);
      if (!next) return 0;
      cur = next;
    }
    return cur.count;
  }

  delete(word: string): boolean {
    return this._deleteHelper(this._root, word, 0);
  }
  private _deleteHelper(node: TrieNode, word: string, idx: number): boolean {
    if (idx === word.length) {
      if (!node.isEnd) return false;
      node.isEnd = false;
      this._size--;
      return true;
    }
    const ch = word[idx];
    const child = node.children.get(ch);
    if (!child) return false;
    const deleted = this._deleteHelper(child, word, idx + 1);
    if (deleted) {
      child.count--;
      if (!child.isEnd && child.children.size === 0) {
        node.children.delete(ch);
      }
    }
    return deleted;
  }

  collect(prefix: string): string[] {
    const r: string[] = [];
    let cur = this._root;
    for (const ch of prefix) {
      const next = cur.children.get(ch);
      if (!next) return r;
      cur = next;
    }
    this._collect(cur, prefix, r);
    return r;
  }
  private _collect(node: TrieNode, path: string, r: string[]): void {
    if (node.isEnd) r.push(path);
    for (const [ch, child] of node.children) {
      this._collect(child, path + ch, r);
    }
  }
}
