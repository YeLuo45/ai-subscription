/**
 * MarkdownParser — minimal Markdown to HTML
 *
 * Inspired by: marked / CommonMark
 *
 * Supports subset:
 *   - headings (#, ##, ...)
 *   - bold (**), italic (*)
 *   - inline code (`)
 *   - code blocks (```)
 *   - links [text](url)
 *   - lists (- or 1.)
 *   - paragraphs
 */

export type MarkdownNode =
  | { type: 'h'; level: number; text: string; children?: InlineNode[] }
  | { type: 'p'; children: InlineNode[] }
  | { type: 'code'; lang: string; text: string }
  | { type: 'ul'; items: InlineNode[][] }
  | { type: 'ol'; items: InlineNode[][] }
  | { type: 'blockquote'; children: MarkdownNode[] };

export type InlineNode =
  | { type: 'text'; value: string }
  | { type: 'bold'; children: InlineNode[] }
  | { type: 'italic'; children: InlineNode[] }
  | { type: 'code'; value: string }
  | { type: 'link'; href: string; text: string };

export class MarkdownParser {
  parse(input: string): MarkdownNode[] {
    const lines = input.split('\n');
    const nodes: MarkdownNode[] = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (/^```/.test(line)) {
        // Code block
        const lang = line.slice(3).trim();
        const code: string[] = [];
        i += 1;
        while (i < lines.length && !/^```/.test(lines[i])) {
          code.push(lines[i]);
          i += 1;
        }
        i += 1; // skip closing ```
        nodes.push({ type: 'code', lang, text: code.join('\n') });
        continue;
      }
      const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const text = headingMatch[2];
        nodes.push({ type: 'h', level, text, children: this.parseInline(text) });
        i += 1;
        continue;
      }
      if (/^[-*+]\s+/.test(line)) {
        // Unordered list
        const items: InlineNode[][] = [];
        while (i < lines.length && /^[-*+]\s+/.test(lines[i])) {
          items.push(this.parseInline(lines[i].replace(/^[-*+]\s+/, '')));
          i += 1;
        }
        nodes.push({ type: 'ul', items });
        continue;
      }
      if (/^\d+\.\s+/.test(line)) {
        // Ordered list
        const items: InlineNode[][] = [];
        while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
          items.push(this.parseInline(lines[i].replace(/^\d+\.\s+/, '')));
          i += 1;
        }
        nodes.push({ type: 'ol', items });
        continue;
      }
      if (/^>\s+/.test(line)) {
        // Blockquote
        const inner: string[] = [];
        while (i < lines.length && /^>\s+/.test(lines[i])) {
          inner.push(lines[i].replace(/^>\s+/, ''));
          i += 1;
        }
        const sub = this.parse(inner.join('\n'));
        nodes.push({ type: 'blockquote', children: sub });
        continue;
      }
      if (line.trim() === '') {
        i += 1;
        continue;
      }
      // Paragraph
      const paraLines: string[] = [line];
      i += 1;
      while (i < lines.length && lines[i].trim() !== '' && !/^[#\->*+\d]/.test(lines[i])) {
        paraLines.push(lines[i]);
        i += 1;
      }
      nodes.push({ type: 'p', children: this.parseInline(paraLines.join(' ')) });
    }
    return nodes;
  }

  parseInline(text: string): InlineNode[] {
    const nodes: InlineNode[] = [];
    let i = 0;
    let buf = '';
    const flush = () => {
      if (buf) {
        nodes.push({ type: 'text', value: buf });
        buf = '';
      }
    };
    while (i < text.length) {
      if (text[i] === '*' && text[i + 1] === '*') {
        // Bold
        const end = text.indexOf('**', i + 2);
        if (end > i + 2) {
          flush();
          nodes.push({ type: 'bold', children: this.parseInline(text.slice(i + 2, end)) });
          i = end + 2;
          continue;
        }
      }
      if (text[i] === '*') {
        const end = text.indexOf('*', i + 1);
        if (end > i + 1) {
          flush();
          nodes.push({ type: 'italic', children: this.parseInline(text.slice(i + 1, end)) });
          i = end + 1;
          continue;
        }
      }
      if (text[i] === '`') {
        const end = text.indexOf('`', i + 1);
        if (end > i + 1) {
          flush();
          nodes.push({ type: 'code', value: text.slice(i + 1, end) });
          i = end + 1;
          continue;
        }
      }
      if (text[i] === '[') {
        const closeText = text.indexOf(']', i);
        if (closeText > i && text[closeText + 1] === '(') {
          const closeUrl = text.indexOf(')', closeText + 2);
          if (closeUrl > closeText) {
            const linkText = text.slice(i + 1, closeText);
            const href = text.slice(closeText + 2, closeUrl);
            flush();
            nodes.push({ type: 'link', href, text: linkText });
            i = closeUrl + 1;
            continue;
          }
        }
      }
      buf += text[i];
      i += 1;
    }
    flush();
    return nodes;
  }
}
