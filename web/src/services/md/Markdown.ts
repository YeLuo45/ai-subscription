/**
 * Markdown — simplified Markdown parser to AST
 *
 * Inspired by: marked / markdown-it
 *
 * Supports: headers, bold, italic, code, links, lists, blockquotes, paragraphs
 */

export type MDNodeType = 'root' | 'heading' | 'paragraph' | 'code' | 'blockquote' | 'list' | 'listitem' | 'text' | 'bold' | 'italic' | 'link' | 'code-inline' | 'linebreak' | 'hr' | 'space';

export interface MDNode {
  type: MDNodeType;
  children?: MDNode[];
  level?: number;
  href?: string;
  text?: string;
  lang?: string;
  ordered?: boolean;
  items?: string[];
}

export class Markdown {
  /**
   * Parse markdown text to AST.
   */
  static parse(input: string): MDNode {
    const lines = input.split('\n');
    const children: MDNode[] = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (/^#{1,6}\s+/.test(line)) {
        const level = line.match(/^#+/)?.[0].length ?? 1;
        children.push({ type: 'heading', level, children: [Markdown.parseInline(line.replace(/^#+\s+/, ''))] });
      } else if (/^```/.test(line)) {
        const lang = line.replace(/^```/, '').trim();
        const code: string[] = [];
        i++;
        while (i < lines.length && !/^```/.test(lines[i])) {
          code.push(lines[i]);
          i++;
        }
        children.push({ type: 'code', lang, text: code.join('\n') });
      } else if (/^>\s*/.test(line)) {
        const quote: string[] = [];
        while (i < lines.length && /^>\s*/.test(lines[i])) {
          quote.push(lines[i].replace(/^>\s*/, ''));
          i++;
        }
        i--;
        children.push({ type: 'blockquote', children: [Markdown.parseInline(quote.join(' '))] });
      } else if (/^[-*_]{3,}\s*$/.test(line)) {
        children.push({ type: 'hr' });
      } else if (/^[-*+]\s+/.test(line) || /^\d+\.\s+/.test(line)) {
        const ordered = /^\d+\.\s+/.test(line);
        const items: string[] = [];
        while (i < lines.length && (/^[-*+]\s+/.test(lines[i]) || /^\d+\.\s+/.test(lines[i]))) {
          items.push(lines[i].replace(/^[-*+]\s+|^(\d+)\.\s+/, ''));
          i++;
        }
        i--;
        children.push({ type: 'list', ordered, items });
      } else if (line.trim() === '') {
        i++;
      } else {
        const para: string[] = [];
        while (i < lines.length && lines[i].trim() !== '' && !/^#{1,6}\s+/.test(lines[i]) && !/^```/.test(lines[i]) && !/^>\s*/.test(lines[i]) && !/^[-*+]\s+/.test(lines[i]) && !/^\d+\.\s+/.test(lines[i]) && !/^[-*_]{3,}\s*$/.test(lines[i])) {
          para.push(lines[i]);
          i++;
        }
        i--;
        children.push({ type: 'paragraph', children: [Markdown.parseInline(para.join(' '))] });
      }
      i++;
    }
    return { type: 'root', children };
  }

  /**
   * Parse inline elements (bold, italic, code, links).
   */
  static parseInline(text: string): MDNode {
    const children: MDNode[] = [];
    let buf = '';
    let i = 0;
    while (i < text.length) {
      if (text.slice(i, i + 2) === '**') {
        if (buf) { children.push({ type: 'text', text: buf }); buf = ''; }
        const end = text.indexOf('**', i + 2);
        if (end < 0) { buf += text.slice(i); break; }
        children.push({ type: 'bold', text: text.slice(i + 2, end) });
        i = end + 2;
      } else if (text[i] === '*') {
        if (buf) { children.push({ type: 'text', text: buf }); buf = ''; }
        const end = text.indexOf('*', i + 1);
        if (end < 0) { buf += text.slice(i); break; }
        children.push({ type: 'italic', text: text.slice(i + 1, end) });
        i = end + 1;
      } else if (text[i] === '`') {
        if (buf) { children.push({ type: 'text', text: buf }); buf = ''; }
        const end = text.indexOf('`', i + 1);
        if (end < 0) { buf += text.slice(i); break; }
        children.push({ type: 'code-inline', text: text.slice(i + 1, end) });
        i = end + 1;
      } else if (text[i] === '[') {
        const close = text.indexOf(']', i);
        if (close > 0 && text[close + 1] === '(') {
          const urlEnd = text.indexOf(')', close + 2);
          if (urlEnd > 0) {
            if (buf) { children.push({ type: 'text', text: buf }); buf = ''; }
            children.push({ type: 'link', text: text.slice(i + 1, close), href: text.slice(close + 2, urlEnd) });
            i = urlEnd + 1;
            continue;
          }
        }
        buf += text[i];
        i++;
      } else {
        buf += text[i];
        i++;
      }
    }
    if (buf) children.push({ type: 'text', text: buf });
    return { type: 'space', children };
  }

  /**
   * Render AST to plain text.
   */
  static toText(ast: MDNode): string {
    if (ast.type === 'text' || ast.type === 'code-inline' || ast.type === 'code') return ast.text ?? '';
    if (ast.type === 'bold' || ast.type === 'italic' || ast.type === 'link') return ast.text ?? '';
    if (ast.type === 'heading' && ast.children) return ast.children.map(Markdown.toText).join('') + '\n';
    if (ast.children) return ast.children.map(Markdown.toText).join('');
    if (ast.items) return ast.items.join('\n');
    return '';
  }

  /**
   * Get all headings.
   */
  static getHeadings(ast: MDNode): Array<{ level: number; text: string }> {
    const out: Array<{ level: number; text: string }> = [];
    function walk(n: MDNode): void {
      if (n.type === 'heading' && n.level !== undefined) {
        out.push({ level: n.level, text: Markdown.toText(n) });
      }
      if (n.children) n.children.forEach(walk);
    }
    walk(ast);
    return out;
  }

  /**
   * Count words.
   */
  static wordCount(ast: MDNode): number {
    const text = Markdown.toText(ast);
    return text.trim().split(/\s+/).filter((w) => w.length > 0).length;
  }
}
