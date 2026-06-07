/**
 * Trie — prefix tree
 *
 * Inspired by: trie-prefix-tree
 *
 * - insert, search, startsWith
 * - getAllWithPrefix
 * - longestCommonPrefix
 */

export class TrieNode {
  children: Map<string, TrieNode> = new Map();
  isEnd: boolean = false;
  value?: string;
}

export class Trie {
  root: TrieNode = new TrieNode();

  /**
   * Insert word.
   */
  insert(word: string, value?: string): void {
    let node = this.root;
    for (const c of word) {
      if (!node.children.has(c)) node.children.set(c, new TrieNode());
      node = node.children.get(c)!;
    }
    node.isEnd = true;
    if (value !== undefined) node.value = value;
  }

  /**
   * Search for exact word.
   */
  search(word: string): boolean {
    const node = this._find(word);
    return node !== null && node.isEnd;
  }

  /**
   * Get stored value.
   */
  get(word: string): string | undefined {
    const node = this._find(word);
    return node?.value;
  }

  /**
   * Check if any word starts with prefix.
   */
  startsWith(prefix: string): boolean {
    return this._find(prefix) !== null;
  }

  /**
   * Get all words with given prefix.
   */
  getAllWithPrefix(prefix: string): string[] {
    const node = this._find(prefix);
    if (!node) return [];
    const result: string[] = [];
    this._collect(node, prefix, result);
    return result;
  }

  /**
   * Count words in trie.
   */
  count(): number {
    return this._countWords(this.root);
  }

  /**
   * Longest common prefix.
   */
  longestCommonPrefix(): string {
    let prefix = '';
    let node = this.root;
    while (node.children.size === 1 && !node.isEnd) {
      const [c, child] = [...node.children.entries()][0];
      prefix += c;
      node = child;
    }
    return prefix;
  }

  /**
   * Auto-complete suggestions.
   */
  autoComplete(prefix: string, limit: number = 10): string[] {
    return this.getAllWithPrefix(prefix).slice(0, limit);
  }

  /**
   * Delete a word.
   */
  delete(word: string): boolean {
    return this._delete(this.root, word, 0);
  }

  private _delete(node: TrieNode, word: string, idx: number): boolean {
    if (idx === word.length) {
      if (!node.isEnd) return false;
      node.isEnd = false;
      return node.children.size === 0;
    }
    const c = word[idx];
    const child = node.children.get(c);
    if (!child) return false;
    const shouldDelete = this._delete(child, word, idx + 1);
    if (shouldDelete) {
      node.children.delete(c);
      return node.children.size === 0 && !node.isEnd;
    }
    return false;
  }

  private _find(word: string): TrieNode | null {
    let node = this.root;
    for (const c of word) {
      const child = node.children.get(c);
      if (!child) return null;
      node = child;
    }
    return node;
  }

  private _collect(node: TrieNode, prefix: string, result: string[]): void {
    if (node.isEnd) result.push(prefix);
    for (const [c, child] of node.children) {
      this._collect(child, prefix + c, result);
    }
  }

  private _countWords(node: TrieNode): number {
    let n = node.isEnd ? 1 : 0;
    for (const child of node.children.values()) n += this._countWords(child);
    return n;
  }
}
