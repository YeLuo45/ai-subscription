/**
 * XMLParser — minimal XML 1.0 parser
 *
 * Inspired by: fast-xml-parser / sax-js
 *
 * Supports subset:
 *   - elements: <tag attr="val">text</tag>
 *   - self-closing: <tag/>
 *   - attributes (quoted values)
 *   - text content
 *   - nested elements
 *   - XML declaration: <?xml ... ?>
 *   - comments: <!-- ... -->
 *   - CDATA: <![CDATA[ ... ]]>
 */

export interface XMLElement {
  type: 'element';
  tag: string;
  attrs: Record<string, string>;
  children: (XMLElement | { type: 'text'; value: string } | { type: 'cdata'; value: string } | { type: 'comment'; value: string })[];
}

export class XMLParser {
  parse(input: string): XMLElement[] {
    const elements: XMLElement[] = [];
    let pos = 0;
    while (pos < input.length) {
      // Skip whitespace
      while (pos < input.length && /\s/.test(input[pos])) pos += 1;
      if (pos >= input.length) break;
      // Skip processing instructions
      if (input.startsWith('<?', pos)) {
        const end = input.indexOf('?>', pos);
        if (end < 0) break;
        pos = end + 2;
        continue;
      }
      // Skip comments
      if (input.startsWith('<!--', pos)) {
        const end = input.indexOf('-->', pos);
        if (end < 0) break;
        pos = end + 3;
        continue;
      }
      // Skip DOCTYPE
      if (input.startsWith('<!', pos)) {
        const end = input.indexOf('>', pos);
        if (end < 0) break;
        pos = end + 1;
        continue;
      }
      if (input[pos] === '<') {
        const result = this.parseElement(input, pos);
        if (result) {
          elements.push(result.element);
          pos = result.next;
        } else {
          break;
        }
      } else {
        // Text node outside elements
        const next = input.indexOf('<', pos);
        pos = next >= 0 ? next : input.length;
      }
    }
    return elements;
  }

  private parseElement(input: string, start: number): { element: XMLElement; next: number } | null {
    if (input[start] !== '<') return null;
    // Find end of opening tag
    const openEnd = input.indexOf('>', start);
    if (openEnd < 0) return null;
    const tagContent = input.slice(start + 1, openEnd);
    if (tagContent.startsWith('/')) return null;
    // Self-closing?
    if (tagContent.endsWith('/')) {
      const attrs = this.parseAttrs(tagContent.slice(0, -1).trim());
      const tagName = this.extractTagName(tagContent.slice(0, -1));
      return {
        element: { type: 'element', tag: tagName, attrs, children: [] },
        next: openEnd + 1,
      };
    }
    const tagName = this.extractTagName(tagContent);
    const attrs = this.parseAttrs(this.stripTagName(tagContent));
    // Parse content until </tagName>
    const closeTag = `</${tagName}>`;
    const closeIdx = input.indexOf(closeTag, openEnd + 1);
    if (closeIdx < 0) return null;
    const inner = input.slice(openEnd + 1, closeIdx);
    const children = this.parseContent(inner);
    return {
      element: { type: 'element', tag: tagName, attrs, children },
      next: closeIdx + closeTag.length,
    };
  }

  private parseContent(input: string): XMLElement['children'] {
    const children: XMLElement['children'] = [];
    let pos = 0;
    let textBuf = '';
    while (pos < input.length) {
      if (input.startsWith('<![CDATA[', pos)) {
        if (textBuf) { children.push({ type: 'text', value: textBuf }); textBuf = ''; }
        const end = input.indexOf(']]>', pos);
        if (end < 0) break;
        children.push({ type: 'cdata', value: input.slice(pos + 9, end) });
        pos = end + 3;
        continue;
      }
      if (input.startsWith('<!--', pos)) {
        if (textBuf) { children.push({ type: 'text', value: textBuf }); textBuf = ''; }
        const end = input.indexOf('-->', pos);
        if (end < 0) break;
        children.push({ type: 'comment', value: input.slice(pos + 4, end) });
        pos = end + 3;
        continue;
      }
      if (input[pos] === '<') {
        if (textBuf) { children.push({ type: 'text', value: textBuf }); textBuf = ''; }
        const result = this.parseElement(input, pos);
        if (result) {
          children.push(result.element);
          pos = result.next;
        } else {
          break;
        }
      } else {
        textBuf += input[pos];
        pos += 1;
      }
    }
    if (textBuf) children.push({ type: 'text', value: textBuf });
    return children;
  }

  private extractTagName(content: string): string {
    const m = content.match(/^([\w:.-]+)/);
    return m ? m[1] : '';
  }

  private stripTagName(content: string): string {
    const m = content.match(/^([\w:.-]+)\s*(.*)$/);
    return m ? m[2] : content;
  }

  private parseAttrs(content: string): Record<string, string> {
    const attrs: Record<string, string> = {};
    const re = /([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      attrs[m[1]] = m[2] ?? m[3] ?? '';
    }
    return attrs;
  }
}
