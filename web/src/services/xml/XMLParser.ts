/**
 * XMLParser — simplified XML parser
 *
 * Inspired by: fast-xml-parser / xml2js
 *
 * Parses XML to nested objects. Self-closing tags become arrays.
 */

export interface XMLNode {
  [key: string]: string | XMLNode | (string | XMLNode)[];
}

export class XMLParser {
  /**
   * Parse XML string to JS object.
   */
  static parse(xml: string): XMLNode {
    const tokens = this.tokenize(xml);
    return this.parseNode(tokens, 0).value as XMLNode;
  }

  private static tokenize(xml: string): Array<{ type: 'open' | 'close' | 'self' | 'text'; name?: string; attrs?: Record<string, string>; text?: string }> {
    const tokens: Array<{ type: 'open' | 'close' | 'self' | 'text'; name?: string; attrs?: Record<string, string>; text?: string }> = [];
    let pos = 0;
    while (pos < xml.length) {
      // Skip whitespace
      if (/\s/.test(xml[pos])) { pos++; continue; }
      if (xml[pos] === '<') {
        if (xml[pos + 1] === '/') {
          // Close tag
          const end = xml.indexOf('>', pos);
          tokens.push({ type: 'close', name: xml.slice(pos + 2, end).trim() });
          pos = end + 1;
        } else if (xml[pos + 1] === '?' || xml[pos + 1] === '!') {
          // Declaration or comment - skip
          const end = xml.indexOf('>', pos);
          pos = end + 1;
        } else {
          // Open or self-closing tag
          const end = xml.indexOf('>', pos);
          const content = xml.slice(pos + 1, end);
          const selfClose = content.endsWith('/');
          const cleanContent = selfClose ? content.slice(0, -1).trim() : content.trim();
          const spaceIdx = cleanContent.search(/\s/);
          let name: string;
          let attrs: Record<string, string> = {};
          if (spaceIdx < 0) {
            name = cleanContent;
          } else {
            name = cleanContent.slice(0, spaceIdx);
            const attrStr = cleanContent.slice(spaceIdx + 1);
            attrs = this.parseAttrs(attrStr);
          }
          if (selfClose) {
            tokens.push({ type: 'self', name, attrs });
          } else {
            tokens.push({ type: 'open', name, attrs });
          }
          pos = end + 1;
        }
      } else {
        // Text
        const end = xml.indexOf('<', pos);
        const text = end < 0 ? xml.slice(pos) : xml.slice(pos, end);
        if (text.trim().length > 0) {
          tokens.push({ type: 'text', text: this.unescape(text) });
        }
        pos = end < 0 ? xml.length : end;
      }
    }
    return tokens;
  }

  private static parseAttrs(s: string): Record<string, string> {
    const attrs: Record<string, string> = {};
    const re = /([\w:.-]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(s)) !== null) {
      attrs[m[1]] = m[3] ?? m[4] ?? '';
    }
    return attrs;
  }

  private static unescape(s: string): string {
    return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
  }

  private static parseNode(tokens: Array<{ type: 'open' | 'close' | 'self' | 'text'; name?: string; text?: string }>, start: number): { value: XMLNode | string; next: number } {
    if (tokens[start].type === 'text') {
      return { value: tokens[start].text ?? '', next: start + 1 };
    }
    const tag = tokens[start];
    if (tag.type === 'self') {
      return { value: { [tag.name!]: '' } as XMLNode, next: start + 1 };
    }
    if (tag.type !== 'open') {
      return { value: {}, next: start + 1 };
    }
    const children: Record<string, string | XMLNode | (string | XMLNode)[]> = {};
    let i = start + 1;
    while (i < tokens.length) {
      const t = tokens[i];
      if (t.type === 'close' && t.name === tag.name) {
        return { value: { [tag.name!]: children } as XMLNode, next: i + 1 };
      }
      if (t.type === 'text') {
        children['#text'] = t.text ?? '';
        i++;
        continue;
      }
      if (t.type === 'self') {
        const child = { [t.name!]: '' };
        this.mergeChild(children, t.name!, child[t.name!]);
        i++;
        continue;
      }
      if (t.type === 'open') {
        const result = this.parseNode(tokens, i);
        const node = result.value as XMLNode;
        const childName = Object.keys(node)[0];
        this.mergeChild(children, childName, node[childName]);
        i = result.next;
        continue;
      }
      i++;
    }
    return { value: { [tag.name!]: children } as XMLNode, next: i };
  }

  private static mergeChild(children: Record<string, string | XMLNode | (string | XMLNode)[]>, key: string, value: string | XMLNode): void {
    if (key in children) {
      const existing = children[key];
      if (Array.isArray(existing)) {
        existing.push(value);
      } else {
        children[key] = [existing, value];
      }
    } else {
      children[key] = value;
    }
  }
}
