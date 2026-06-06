/**
 * AhoCorasick — multi-pattern string matching automaton
 *
 * Inspired by: Aho & Corasick 1975 algorithm
 *
 * Build a trie with failure links and output links. After building,
 * search for all occurrences of any pattern in O(n + total matches).
 */

interface ACNode {
  children: Map<string, number>;
  failure: number;
  output: number[];
}

export class AhoCorasick {
  private nodes: ACNode[] = [];
  private patterns: string[] = [];

  constructor(patterns: string[] = []) {
    if (patterns.length > 0) this.build(patterns);
  }

  build(patterns: string[]): void {
    this.patterns = [...patterns];
    this.nodes = [{ children: new Map(), failure: 0, output: [] }];
    if (patterns.length === 0) return;

    // Build trie
    for (let p = 0; p < patterns.length; p++) {
      const word = patterns[p];
      let node = 0;
      for (const ch of word) {
        let child = this.nodes[node].children.get(ch);
        if (child === undefined) {
          child = this.nodes.length;
          this.nodes[node].children.set(ch, child);
          this.nodes.push({ children: new Map(), failure: 0, output: [] });
        }
        node = child;
      }
      this.nodes[node].output.push(p);
    }

    // Build failure links via BFS
    const queue: number[] = [];
    for (const child of this.nodes[0].children.values()) {
      this.nodes[child].failure = 0;
      queue.push(child);
    }
    while (queue.length > 0) {
      const u = queue.shift()!;
      for (const [ch, v] of this.nodes[u].children) {
        queue.push(v);
        let f = this.nodes[u].failure;
        while (f !== 0 && !this.nodes[f].children.has(ch)) {
          f = this.nodes[f].failure;
        }
        if (this.nodes[f].children.has(ch) && this.nodes[f].children.get(ch) !== v) {
          f = this.nodes[f].children.get(ch)!;
        }
        this.nodes[v].failure = f;
        // Inherit outputs
        this.nodes[v].output = [...this.nodes[v].output, ...this.nodes[f].output];
      }
    }
  }

  /**
   * Find all matches in text.
   * Returns array of { pattern, patternIndex, position } where position is the
   * index in text where the pattern ends.
   */
  search(text: string): { pattern: string; patternIndex: number; position: number }[] {
    if (this.nodes.length === 0) return [];
    const result: { pattern: string; patternIndex: number; position: number }[] = [];
    let node = 0;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      while (node !== 0 && !this.nodes[node].children.has(ch)) {
        node = this.nodes[node].failure;
      }
      if (this.nodes[node].children.has(ch)) {
        node = this.nodes[node].children.get(ch)!;
      }
      for (const outIdx of this.nodes[node].output) {
        result.push({
          pattern: this.patterns[outIdx],
          patternIndex: outIdx,
          position: i,
        });
      }
    }
    return result;
  }

  patternCount(): number { return this.patterns.length; }
  nodeCount(): number { return this.nodes.length; }
}
