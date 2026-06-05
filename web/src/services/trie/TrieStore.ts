/**
 * TrieStore — prefix tree (trie)
 *
 * Classic trie with:
 *   - insert(word, value)
 *   - has(word) / get(word) / set(word, value)
 *   - delete(word)
 *   - startsWith(prefix) / listWithPrefix(prefix)
 *   - longestCommonPrefix()
 *   - count with prefix
 *
 * Character set: configurable (default: lowercase a-z, digits 0-9)
 */

export interface TrieNode {
  children: Map<string, TrieNode>;
  isEnd: boolean;
  value?: unknown;
}

export class TrieStore {
  private root: TrieNode = this.createNode();
  private size: number = 0;
  private charset: string[];

  constructor(charset: string = 'abcdefghijklmnopqrstuvwxyz0123456789') {
    this.charset = charset.split('');
  }

  private createNode(): TrieNode {
    return { children: new Map(), isEnd: false };
  }

  /**
   * Insert a word with optional value.
   */
  insert(word: string, value?: unknown): void {
    let node = this.root;
    const normalized = word.toLowerCase();
    for (const ch of normalized) {
      if (!this.charset.includes(ch)) {
        // Skip non-charset chars
        continue;
      }
      if (!node.children.has(ch)) {
        node.children.set(ch, this.createNode());
      }
      node = node.children.get(ch)!;
    }
    if (!node.isEnd) {
      this.size += 1;
    }
    node.isEnd = true;
    if (value !== undefined) node.value = value;
  }

  /**
   * Set a value (alias for insert with value).
   */
  set(word: string, value: unknown): void {
    this.insert(word, value);
  }

  /**
   * Check if a word exists.
   */
  has(word: string): boolean {
    const node = this.findNode(word);
    return node !== undefined && node.isEnd;
  }

  /**
   * Get the value at a word.
   */
  get(word: string): unknown {
    const node = this.findNode(word);
    if (!node || !node.isEnd) return undefined;
    return node.value;
  }

  /**
   * Delete a word.
   * Removes the word and any non-shared suffix nodes.
   */
  delete(word: string): boolean {
    return this.deleteHelper(this.root, word.toLowerCase(), 0);
  }

  private deleteHelper(node: TrieNode, word: string, idx: number): boolean {
    if (idx === word.length) {
      if (!node.isEnd) return false;
      node.isEnd = false;
      node.value = undefined;
      this.size -= 1;
      return node.children.size === 0;
    }
    const ch = word[idx];
    const child = node.children.get(ch);
    if (!child) return false;
    const shouldDeleteChild = this.deleteHelper(child, word, idx + 1);
    if (shouldDeleteChild) {
      node.children.delete(ch);
      return node.children.size === 0 && !node.isEnd;
    }
    return false;
  }

  /**
   * Check if any word starts with the given prefix.
   */
  startsWith(prefix: string): boolean {
    return this.findNode(prefix) !== undefined;
  }

  /**
   * List all words with the given prefix.
   */
  listWithPrefix(prefix: string, limit: number = 1000): string[] {
    const startNode = this.findNode(prefix);
    if (!startNode) return [];
    const results: string[] = [];
    this.collectWords(startNode, prefix.toLowerCase(), results, limit);
    return results;
  }

  private collectWords(node: TrieNode, prefix: string, results: string[], limit: number): void {
    if (results.length >= limit) return;
    if (node.isEnd) {
      results.push(prefix);
      if (results.length >= limit) return;
    }
    for (const [ch, child] of node.children) {
      this.collectWords(child, prefix + ch, results, limit);
      if (results.length >= limit) return;
    }
  }

  /**
   * Count words with the given prefix.
   */
  countWithPrefix(prefix: string): number {
    const startNode = this.findNode(prefix);
    if (!startNode) return 0;
    return this.countWords(startNode);
  }

  private countWords(node: TrieNode): number {
    let count = node.isEnd ? 1 : 0;
    for (const child of node.children.values()) {
      count += this.countWords(child);
    }
    return count;
  }

  /**
   * Find the longest common prefix of all words.
   */
  longestCommonPrefix(): string {
    let prefix = '';
    let node = this.root;
    while (node.children.size === 1 && !node.isEnd) {
      const [ch, child] = node.children.entries().next().value as [string, TrieNode];
      prefix += ch;
      node = child;
    }
    return prefix;
  }

  /**
   * Get all words in sorted (alphabetical) order.
   */
  toSortedList(): string[] {
    return this.listWithPrefix('').sort();
  }

  /**
   * Get total word count.
   */
  count(): number {
    return this.size;
  }

  /**
   * Get all values.
   */
  values(): unknown[] {
    const vals: unknown[] = [];
    this.collectValues(this.root, vals);
    return vals;
  }

  private collectValues(node: TrieNode, vals: unknown[]): void {
    if (node.isEnd && node.value !== undefined) vals.push(node.value);
    for (const child of node.children.values()) {
      this.collectValues(child, vals);
    }
  }

  /** Clear all. */
  clear(): void {
    this.root = this.createNode();
    this.size = 0;
  }

  private findNode(word: string): TrieNode | undefined {
    let node = this.root;
    const normalized = word.toLowerCase();
    for (const ch of normalized) {
      if (!this.charset.includes(ch)) return undefined;
      const child = node.children.get(ch);
      if (!child) return undefined;
      node = child;
    }
    return node;
  }
}
