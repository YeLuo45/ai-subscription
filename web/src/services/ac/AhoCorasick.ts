/**
 * AhoCorasick — multi-pattern string matching
 *
 * Inspired by: aho-corasick
 *
 * Build automaton, then search all patterns in one pass.
 */

export interface ACMatch {
  pattern: string;
  end: number;
  start: number;
}

class ACNode {
  children: Map<string, ACNode> = new Map();
  fail: ACNode | null = null;
  output: string[] = [];
}

export class AhoCorasick {
  private root: ACNode = new ACNode();

  /**
   * Add a pattern.
   */
  addPattern(pattern: string): void {
    let node = this.root;
    for (const c of pattern) {
      if (!node.children.has(c)) node.children.set(c, new ACNode());
      node = node.children.get(c)!;
    }
    if (!node.output.includes(pattern)) node.output.push(pattern);
  }

  /**
   * Build failure links (call once after all patterns added).
   */
  build(): void {
    const queue: ACNode[] = [];
    for (const child of this.root.children.values()) {
      child.fail = this.root;
      queue.push(child);
    }
    while (queue.length > 0) {
      const node = queue.shift()!;
      for (const [c, child] of node.children) {
        let fail = node.fail;
        while (fail !== null && !fail.children.has(c)) {
          fail = fail.fail;
        }
        child.fail = fail ? fail.children.get(c)! : this.root;
        // Merge output
        if (child.fail) {
          child.output = [...child.output, ...child.fail.output];
        }
        queue.push(child);
      }
    }
  }

  /**
   * Find all pattern matches in text.
   */
  search(text: string): ACMatch[] {
    const results: ACMatch[] = [];
    let node = this.root;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      while (node !== this.root && !node.children.has(c)) {
        node = node.fail!;
      }
      if (node.children.has(c)) {
        node = node.children.get(c)!;
      }
      for (const pattern of node.output) {
        results.push({ pattern, end: i, start: i - pattern.length + 1 });
      }
    }
    return results;
  }

  /**
   * Count matches per pattern.
   */
  count(text: string): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const m of AhoCorasick.prototype.search.call(this, text)) {
      counts[m.pattern] = (counts[m.pattern] ?? 0) + 1;
    }
    return counts;
  }
}
