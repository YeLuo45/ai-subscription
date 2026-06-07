/**
 * WikiText — simplified MediaWiki parser
 *
 * Inspired by: mediawiki-parser
 *
 * Supports: headings, bold, italic, links ([[]]), lists, templates
 */

export class WikiText {
  /**
   * Parse wiki text to AST-like structure (flat list of elements).
   */
  static parse(input: string): Array<{ type: string; text: string; level?: number }> {
    const out: Array<{ type: string; text: string; level?: number }> = [];
    const lines = input.split('\n');
    for (const line of lines) {
      if (/^={1,6}\s*.*\s*={1,6}$/.test(line)) {
        const m = line.match(/^(={1,6})\s*(.+?)\s*\1$/);
        if (m) {
          out.push({ type: 'heading', level: m[1].length, text: m[2] });
          continue;
        }
      }
      if (/^\*\s+/.test(line)) {
        out.push({ type: 'listitem', text: line.replace(/^\*\s+/, '') });
        continue;
      }
      if (/^#\s+/.test(line)) {
        out.push({ type: 'listitem-ordered', text: line.replace(/^#\s+/, '') });
        continue;
      }
      if (/^:\s*;?\s*/.test(line) || /^;\s*/.test(line)) {
        out.push({ type: 'definition', text: line.replace(/^[:;]\s*/, '') });
        continue;
      }
      if (line.trim() === '') {
        out.push({ type: 'blank', text: '' });
        continue;
      }
      out.push({ type: 'paragraph', text: line });
    }
    return out;
  }

  /**
   * Extract wiki links [[Article|text]].
   */
  static extractLinks(input: string): Array<{ article: string; label?: string }> {
    const links: Array<{ article: string; label?: string }> = [];
    const re = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
    let m;
    while ((m = re.exec(input)) !== null) {
      links.push({ article: m[1].trim(), label: m[2]?.trim() });
    }
    return links;
  }

  /**
   * Extract templates {{Template|arg}}.
   */
  static extractTemplates(input: string): Array<{ name: string; args: string[] }> {
    const templates: Array<{ name: string; args: string[] }> = [];
    const re = /\{\{([^|}]+)(?:\|([^}]*))?\}\}/g;
    let m;
    while ((m = re.exec(input)) !== null) {
      const args = m[2] ? m[2].split('|').map((a) => a.trim()) : [];
      templates.push({ name: m[1].trim(), args });
    }
    return templates;
  }

  /**
   * Strip wiki markup to plain text.
   */
  static strip(input: string): string {
    return input
      .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, a, b) => b ?? a)
      .replace(/\{\{[^}]*\}\}/g, '')
      .replace(/'''([^']+)'''/g, '$1')
      .replace(/''([^']+)''/g, '$1');
  }

  /**
   * Convert to HTML.
   */
  static toHtml(input: string): string {
    const ast = WikiText.parse(input);
    return ast.map((e) => {
      switch (e.type) {
        case 'heading': return `<h${e.level}>${e.text}</h${e.level}>`;
        case 'listitem': return `<ul><li>${e.text}</li></ul>`;
        case 'listitem-ordered': return `<ol><li>${e.text}</li></ol>`;
        case 'definition': return `<dl><dd>${e.text}</dd></dl>`;
        case 'paragraph': return `<p>${e.text}</p>`;
        case 'blank': return '';
        default: return e.text;
      }
    }).join('');
  }
}
