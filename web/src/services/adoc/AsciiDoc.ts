/**
 * AsciiDoc — simplified AsciiDoc parser
 *
 * Inspired by: asciidoctor
 *
 * Supports: document title, sections, paragraphs, lists, code blocks, attributes
 */

export interface ADocNode {
  type: 'title' | 'section' | 'paragraph' | 'code' | 'list' | 'item' | 'attribute' | 'text';
  level?: number;
  text?: string;
  items?: string[];
  lang?: string;
  name?: string;
  value?: string;
}

export class AsciiDoc {
  /**
   * Parse asciidoc text to AST.
   */
  static parse(input: string): ADocNode[] {
    const out: ADocNode[] = [];
    const lines = input.split('\n');
    let i = 0;
    // Document title
    if (lines[0]?.startsWith('= ')) {
      out.push({ type: 'title', text: lines[0].slice(2) });
      i++;
    }
    while (i < lines.length) {
      const line = lines[i];
      if (line.startsWith('== ')) {
        out.push({ type: 'section', level: 2, text: line.slice(3) });
      } else if (line.startsWith('=== ')) {
        out.push({ type: 'section', level: 3, text: line.slice(4) });
      } else if (line.startsWith('----')) {
        const code: string[] = [];
        i++;
        while (i < lines.length && !lines[i].startsWith('----')) {
          code.push(lines[i]);
          i++;
        }
        out.push({ type: 'code', text: code.join('\n') });
      } else if (line.startsWith('* ')) {
        const items: string[] = [];
        while (i < lines.length && lines[i].startsWith('* ')) {
          items.push(lines[i].slice(2));
          i++;
        }
        i--;
        out.push({ type: 'list', items });
      } else if (line.startsWith(':') && line.includes(':') && line.indexOf(':') !== line.lastIndexOf(':')) {
        // attribute
        const m = line.match(/^:([\w-]+):\s*(.*)$/);
        if (m) {
          out.push({ type: 'attribute', name: m[1], value: m[2] });
        }
      } else if (line.trim() === '') {
        // blank
      } else {
        out.push({ type: 'paragraph', text: line });
      }
      i++;
    }
    return out;
  }

  /**
   * Convert AST to HTML.
   */
  static toHtml(ast: ADocNode[]): string {
    return ast.map((n) => {
      switch (n.type) {
        case 'title': return `<h1>${AsciiDoc._esc(n.text ?? '')}</h1>`;
        case 'section': return `<h${n.level}>${AsciiDoc._esc(n.text ?? '')}</h${n.level}>`;
        case 'paragraph': return `<p>${AsciiDoc._esc(n.text ?? '')}</p>`;
        case 'code': return `<pre><code>${AsciiDoc._esc(n.text ?? '')}</code></pre>`;
        case 'list': {
          const items = (n.items ?? []).map((i) => `<li>${AsciiDoc._esc(i)}</li>`).join('');
          return `<ul>${items}</ul>`;
        }
        default: return '';
      }
    }).join('');
  }

  /**
   * Convert asciidoc text directly to HTML.
   */
  static convert(input: string): string {
    return AsciiDoc.toHtml(AsciiDoc.parse(input));
  }

  /**
   * Get attribute value.
   */
  static getAttribute(ast: ADocNode[], name: string): string | undefined {
    for (const n of ast) {
      if (n.type === 'attribute' && n.name === name) return n.value;
    }
    return undefined;
  }

  /**
   * Get all sections.
   */
  static getSections(ast: ADocNode[]): Array<{ level: number; text: string }> {
    return ast.filter((n) => n.type === 'section' || n.type === 'title').map((n) => ({ level: n.level ?? 0, text: n.text ?? '' }));
  }

  private static _esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
