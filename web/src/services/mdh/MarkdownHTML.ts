/**
 * MarkdownHTML — convert Markdown to HTML
 *
 * Inspired by: marked
 */

import { Markdown } from '../md/Markdown';
import type { MDNode } from '../md/Markdown';

export class MarkdownHTML {
  /**
   * Convert markdown text directly to HTML.
   */
  static convert(input: string): string {
    const ast = Markdown.parse(input);
    return MarkdownHTML.render(ast);
  }

  /**
   * Render AST to HTML.
   */
  static render(ast: MDNode): string {
    return MarkdownHTML._render(ast, 0);
  }

  private static _render(node: MDNode, depth: number = 0): string {
    switch (node.type) {
      case 'root':
        return (node.children ?? []).map((c) => MarkdownHTML._render(c, depth + 1)).join('');
      case 'heading':
        return `<h${node.level}>${MarkdownHTML._inline(node.children)}</h${node.level}>`;
      case 'paragraph':
        return `<p>${MarkdownHTML._inline(node.children)}</p>`;
      case 'code':
        return `<pre><code class="language-${node.lang ?? ''}">${MarkdownHTML._escape(node.text ?? '')}</code></pre>`;
      case 'blockquote':
        return `<blockquote>${MarkdownHTML._inline(node.children)}</blockquote>`;
      case 'list': {
        const tag = node.ordered ? 'ol' : 'ul';
        const items = (node.items ?? []).map((i) => `<li>${MarkdownHTML._escape(i)}</li>`).join('');
        return `<${tag}>${items}</${tag}>`;
      }
      case 'hr':
        return '<hr />';
      default:
        return MarkdownHTML._inline([node]);
    }
  }

  private static _inline(children: MDNode[] | undefined): string {
    if (!children) return '';
    return children.map((c) => {
      if (c.type === 'text') return MarkdownHTML._escape(c.text ?? '');
      if (c.type === 'code-inline') return `<code>${MarkdownHTML._escape(c.text ?? '')}</code>`;
      if (c.type === 'bold') return `<strong>${MarkdownHTML._escape(c.text ?? '')}</strong>`;
      if (c.type === 'italic') return `<em>${MarkdownHTML._escape(c.text ?? '')}</em>`;
      if (c.type === 'link') return `<a href="${MarkdownHTML._escape(c.href ?? '')}">${MarkdownHTML._escape(c.text ?? '')}</a>`;
      if (c.type === 'space') return MarkdownHTML._inline(c.children);
      return '';
    }).join('');
  }

  private static _escape(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /**
   * Strip HTML to plain text.
   */
  static stripHtml(html: string): string {
    return html.replace(/<[^>]+>/g, '');
  }
}
