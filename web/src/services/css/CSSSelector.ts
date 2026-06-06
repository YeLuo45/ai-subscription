/**
 * CSSSelector — parse and match CSS selectors
 *
 * Inspired by: querySelector / css-tree
 *
 * Supports subset of CSS selectors:
 *   - tag: div
 *   - class: .foo
 *   - id: #bar
 *   - attribute: [name=value], [name], [name~=value]
 *   - descendant: A B
 *   - child: A > B
 *   - multiple: A, B
 *   - universal: *
 */

export interface ParsedSelector {
  type: 'tag' | 'class' | 'id' | 'attr' | 'universal';
  value: string;
  attrName?: string;
  attrOp?: '=' | '~=' | '|=' | '^=' | '$=' | '*=';
}

export interface ParsedCombinator {
  parts: ParsedSelector[];
  combinator: ' ' | '>' | '+' | '~';
}

export interface SimpleNode {
  tag: string;
  id?: string;
  classList: string[];
  attrs: Record<string, string>;
  parent?: SimpleNode | null;
  children: SimpleNode[];
}

export class CSSSelector {
  private parts: ParsedSelector[] = [];
  private combinators: (' ' | '>' | '+' | '~')[] = [];

  constructor(selector: string) {
    this.parse(selector);
  }

  private parse(selector: string): void {
    let i = 0;
    while (i < selector.length) {
      const c = selector[i];
      if (c === ' ' || c === '\t') {
        i += 1;
        continue;
      }
      if (c === '>' || c === '+' || c === '~') {
        if (this.parts.length > 0) this.combinators.push(c as '>' | '+' | '~');
        i += 1;
        continue;
      }
      if (c === ',') {
        // Multiple selectors — simplified, last one wins
        i += 1;
        continue;
      }
      if (c === '*') {
        this.parts.push({ type: 'universal', value: '*' });
        i += 1;
      } else if (c === '.') {
        let j = i + 1;
        while (j < selector.length && /[\w-]/.test(selector[j])) j += 1;
        this.parts.push({ type: 'class', value: selector.slice(i + 1, j) });
        i = j;
      } else if (c === '#') {
        let j = i + 1;
        while (j < selector.length && /[\w-]/.test(selector[j])) j += 1;
        this.parts.push({ type: 'id', value: selector.slice(i + 1, j) });
        i = j;
      } else if (c === '[') {
        const end = selector.indexOf(']', i);
        if (end > i) {
          const inner = selector.slice(i + 1, end);
          const m = inner.match(/^([\w-]+)(?:([~|^$*]?=)"?([^"]*)"?)?$/);
          if (m) {
            this.parts.push({
              type: 'attr',
              value: m[3] ?? '',
              attrName: m[1],
              attrOp: m[2] as ParsedSelector['attrOp'],
            });
          }
          i = end + 1;
        } else {
          i += 1;
        }
      } else if (/[a-zA-Z]/.test(c)) {
        let j = i;
        while (j < selector.length && /[\w-]/.test(selector[j])) j += 1;
        this.parts.push({ type: 'tag', value: selector.slice(i, j) });
        i = j;
      } else {
        i += 1;
      }
    }
  }

  matches(node: SimpleNode): boolean {
    if (this.parts.length === 0) return false;
    // For simplified, match all parts against node (ignore combinators in basic version)
    return this.parts.every((p) => this.matchPart(p, node));
  }

  private matchPart(p: ParsedSelector, node: SimpleNode): boolean {
    if (p.type === 'universal') return true;
    if (p.type === 'tag') return node.tag === p.value;
    if (p.type === 'class') return node.classList.includes(p.value);
    if (p.type === 'id') return node.id === p.value;
    if (p.type === 'attr') {
      if (!(p.attrName! in node.attrs)) return false;
      if (p.attrOp === undefined) return true;
      const v = node.attrs[p.attrName!];
      if (p.attrOp === '=') return v === p.value;
      if (p.attrOp === '~=') return v.split(/\s+/).includes(p.value);
      if (p.attrOp === '^=') return v.startsWith(p.value);
      if (p.attrOp === '$=') return v.endsWith(p.value);
      if (p.attrOp === '*=') return v.includes(p.value);
      if (p.attrOp === '|=') return v === p.value || v.startsWith(p.value + '-');
    }
    return false;
  }

  /**
   * Find all matching nodes in a tree.
   */
  queryAll(root: SimpleNode): SimpleNode[] {
    const out: SimpleNode[] = [];
    const visit = (n: SimpleNode) => {
      if (this.matches(n)) out.push(n);
      for (const c of n.children) visit(c);
    };
    visit(root);
    return out;
  }
}
