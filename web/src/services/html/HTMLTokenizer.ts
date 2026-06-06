/**
 * HTMLTokenizer — minimal HTML tokenizer
 *
 * Inspired by: html5 parser / parse5
 *
 * Tokenize HTML into tags, text, comments, DOCTYPE.
 * Supports: opening/closing/self-closing tags, attributes, comments, entities.
 */

export type HTMLTokenType = 'doctype' | 'starttag' | 'endtag' | 'selfclosing' | 'text' | 'comment' | 'cdata';

export interface HTMLToken {
  type: HTMLTokenType;
  name: string;
  attrs: Record<string, string>;
  value: string;
  line: number;
  col: number;
}

export class HTMLTokenizer {
  tokenize(input: string): HTMLToken[] {
    const tokens: HTMLToken[] = [];
    let pos = 0;
    let line = 1;
    let col = 1;
    while (pos < input.length) {
      if (input[pos] === '<') {
        const tokenStart = { line, col };
        if (input.startsWith('<!--', pos)) {
          const end = input.indexOf('-->', pos);
          if (end < 0) break;
          tokens.push({ type: 'comment', name: '!', attrs: {}, value: input.slice(pos + 4, end), ...tokenStart });
          pos = end + 3;
          this.advancePos(input, pos - 3, pos, { line, col }, { line: line, col: col });
          continue;
        }
        if (input.startsWith('<![CDATA[', pos)) {
          const end = input.indexOf(']]>', pos);
          if (end < 0) break;
          tokens.push({ type: 'cdata', name: '![CDATA[', attrs: {}, value: input.slice(pos + 9, end), ...tokenStart });
          pos = end + 3;
          continue;
        }
        if (input.toLowerCase().startsWith('<!doctype', pos)) {
          const end = input.indexOf('>', pos);
          if (end < 0) break;
          tokens.push({ type: 'doctype', name: '!doctype', attrs: {}, value: input.slice(pos, end + 1), ...tokenStart });
          this.updateLineCol(input, pos, end + 1, { line, col }, (l, c) => { line = l; col = c; });
          pos = end + 1;
          continue;
        }
        // Regular tag
        const end = input.indexOf('>', pos);
        if (end < 0) break;
        const inner = input.slice(pos + 1, end);
        if (inner.startsWith('/')) {
          // Closing tag
          const name = inner.slice(1).trim();
          tokens.push({ type: 'endtag', name, attrs: {}, value: `</${name}>`, ...tokenStart });
        } else {
          const isSelfClosing = inner.endsWith('/');
          const clean = isSelfClosing ? inner.slice(0, -1).trim() : inner.trim();
          const m = clean.match(/^([\w:-]+)(.*)$/s);
          const name = m ? m[1] : '';
          const attrsStr = m ? m[2] : '';
          const attrs = this.parseAttrs(attrsStr);
          tokens.push({
            type: isSelfClosing ? 'selfclosing' : 'starttag',
            name,
            attrs,
            value: isSelfClosing ? `<${clean}/>` : `<${clean}>`,
            ...tokenStart,
          });
        }
        this.updateLineCol(input, pos, end + 1, { line, col }, (l, c) => { line = l; col = c; });
        pos = end + 1;
        continue;
      }
      // Text content
      const start = pos;
      const next = input.indexOf('<', pos);
      const end = next < 0 ? input.length : next;
      const text = input.slice(start, end);
      if (text) {
        tokens.push({ type: 'text', name: '', attrs: {}, value: this.decodeEntities(text), line, col });
        this.updateLineCol(input, start, end, { line, col }, (l, c) => { line = l; col = c; });
      }
      pos = end;
    }
    return tokens;
  }

  private parseAttrs(content: string): Record<string, string> {
    const attrs: Record<string, string> = {};
    const re = /([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      const val = m[2] ?? m[3] ?? m[4] ?? '';
      attrs[m[1].toLowerCase()] = this.decodeEntities(val);
    }
    return attrs;
  }

  private decodeEntities(s: string): string {
    const entities: Record<string, string> = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&apos;': "'",
      '&nbsp;': '\u00a0',
    };
    return s.replace(/&[a-z]+;/g, (m) => entities[m] ?? m);
  }

  private updateLineCol(input: string, from: number, to: number, _cur: { line: number; col: number }, cb: (l: number, c: number) => void): void {
    let line = _cur.line;
    let col = _cur.col;
    for (let i = from; i < to && i < input.length; i++) {
      if (input[i] === '\n') { line += 1; col = 1; } else col += 1;
    }
    cb(line, col);
  }

  private advancePos(_input: string, _from: number, _to: number, _cur: { line: number; col: number }, _new: { line: number; col: number }): void {
    // No-op for now
  }
}
