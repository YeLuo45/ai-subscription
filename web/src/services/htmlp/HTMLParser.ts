/**
 * HTMLParser — simplified HTML parser
 *
 * Inspired by: parse5 / cheerio
 *
 * Parses HTML to a simple tree structure.
 * Tolerant of unclosed tags, mixed case, etc.
 */

export interface HTMLElement {
  type: 'tag' | 'text';
  tagName?: string;
  attributes?: Record<string, string>;
  children?: HTMLElement[];
  content?: string;
}

export class HTMLParser {
  /**
   * Parse HTML to tree.
   */
  static parse(html: string): HTMLElement {
    return HTMLParser.parseNode(html, 0).node;
  }

  private static parseNode(html: string, pos: number): { node: HTMLElement; next: number } {
    while (pos < html.length && /\s/.test(html[pos])) pos++;
    if (pos >= html.length) return { node: { type: 'text', content: '' }, next: pos };
    if (html[pos] === '<') {
      if (html.slice(pos, pos + 4) === '<!--') {
        const end = html.indexOf('-->', pos);
        pos = end < 0 ? html.length : end + 3;
        return HTMLParser.parseNode(html, pos);
      }
      if (html[pos + 1] === '/') {
        // Close tag - skip
        const end = html.indexOf('>', pos);
        pos = end < 0 ? html.length : end + 1;
        return HTMLParser.parseNode(html, pos);
      }
      // Open or self-closing tag
      const end = html.indexOf('>', pos);
      if (end < 0) return { node: { type: 'text', content: html.slice(pos) }, next: html.length };
      const content = html.slice(pos + 1, end).trim();
      const selfClose = content.endsWith('/');
      const clean = selfClose ? content.slice(0, -1).trim() : content;
      const spaceIdx = clean.search(/\s/);
      let tagName: string;
      let attrs: Record<string, string> = {};
      if (spaceIdx < 0) {
        tagName = clean.toLowerCase();
      } else {
        tagName = clean.slice(0, spaceIdx).toLowerCase();
        const attrStr = clean.slice(spaceIdx + 1);
        attrs = HTMLParser.parseAttrs(attrStr);
      }
      if (selfClose || HTMLParser.isVoid(tagName)) {
        return { node: { type: 'tag', tagName, attributes: attrs, children: [] }, next: end + 1 };
      }
      // Find matching close tag
      const children: HTMLElement[] = [];
      let childPos = end + 1;
      while (childPos < html.length) {
        const closeIdx = HTMLParser.findMatchingClose(html, childPos, tagName);
        if (closeIdx < 0) {
          // No matching close - take rest as text
          const rest = html.slice(childPos).replace(/<[^>]*>/g, '').trim();
          if (rest) children.push({ type: 'text', content: HTMLParser.unescape(rest) });
          return { node: { type: 'tag', tagName, attributes: attrs, children }, next: html.length };
        }
        // Parse content between childPos and closeIdx
        const sub = html.slice(childPos, closeIdx);
        let p = 0;
        while (p < sub.length) {
          while (p < sub.length && /\s/.test(sub[p])) p++;
          if (p >= sub.length) break;
          if (sub[p] === '<') {
            const result = HTMLParser.parseNode(sub, p);
            children.push(result.node);
            p = result.next;
          } else {
            const next = sub.indexOf('<', p);
            const text = next < 0 ? sub.slice(p) : sub.slice(p, next);
            if (text.trim()) children.push({ type: 'text', content: HTMLParser.unescape(text) });
            p = next < 0 ? sub.length : next;
          }
        }
        return { node: { type: 'tag', tagName, attributes: attrs, children }, next: closeIdx + tagName.length + 3 };
      }
      return { node: { type: 'tag', tagName, attributes: attrs, children }, next: html.length };
    } else {
      // Text
      const next = html.indexOf('<', pos);
      const text = next < 0 ? html.slice(pos) : html.slice(pos, next);
      return { node: { type: 'text', content: HTMLParser.unescape(text) }, next: next < 0 ? html.length : next };
    }
  }

  private static findMatchingClose(html: string, from: number, tag: string): number {
    let depth = 1;
    let pos = from;
    while (pos < html.length) {
      const nextOpen = html.indexOf(`<${tag}`, pos);
      const nextClose = html.indexOf(`</${tag}>`, pos);
      if (nextClose < 0) return -1;
      if (nextOpen < 0 || nextOpen > nextClose) {
        depth--;
        if (depth === 0) return nextClose;
        pos = nextClose + tag.length + 3;
      } else {
        // Check if self-closing
        const openEnd = html.indexOf('>', nextOpen);
        if (openEnd > 0 && html[openEnd - 1] === '/') {
          pos = openEnd + 1;
        } else {
          depth++;
          pos = openEnd + 1;
        }
      }
    }
    return -1;
  }

  private static parseAttrs(s: string): Record<string, string> {
    const attrs: Record<string, string> = {};
    const re = /([\w:-]+)\s*=\s*("([^"]*)"|'([^']*)'|(\S+))/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(s)) !== null) {
      attrs[m[1].toLowerCase()] = m[3] ?? m[4] ?? m[5] ?? '';
    }
    return attrs;
  }

  private static isVoid(tag: string): boolean {
    return ['br', 'hr', 'img', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'source', 'track', 'wbr'].includes(tag);
  }

  private static unescape(s: string): string {
    return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ');
  }

  /**
   * Get text content of node.
   */
  static getText(node: HTMLElement): string {
    if (node.type === 'text') return node.content ?? '';
    if (!node.children) return '';
    return node.children.map(HTMLParser.getText).join('');
  }

  /**
   * Find elements by tag name.
   */
  static queryAll(node: HTMLElement, tagName: string): HTMLElement[] {
    const result: HTMLElement[] = [];
    const visit = (n: HTMLElement) => {
      if (n.type === 'tag' && n.tagName === tagName) result.push(n);
      if (n.children) n.children.forEach(visit);
    };
    visit(node);
    return result;
  }
}
