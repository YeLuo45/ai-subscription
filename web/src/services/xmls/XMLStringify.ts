/**
 * XMLStringify — XML serializer
 *
 * Inspired by: xmlbuilder2 / xml
 *
 * Builds XML from objects/arrays.
 */

export class XMLStringify {
  /**
   * Stringify object to XML.
   */
  static stringify(root: string, obj: unknown, options: { declaration?: boolean; pretty?: boolean; indent?: string } = {}): string {
    const decl = options.declaration ?? true;
    const pretty = options.pretty ?? true;
    const indent = options.indent ?? '  ';
    let out = '';
    if (decl) out += '<?xml version="1.0" encoding="UTF-8"?>' + (pretty ? '\n' : '');
    out += XMLStringify.formatNode(root, obj, 0, pretty, indent);
    return out;
  }

  private static formatNode(name: string, value: unknown, depth: number, pretty: boolean, indent: string): string {
    const pad = pretty ? indent.repeat(depth) : '';
    if (value === null || value === undefined) return `${pad}<${name}/>${pretty ? '\n' : ''}`;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return `${pad}<${name}>${XMLStringify.escape(String(value))}</${name}>${pretty ? '\n' : ''}`;
    }
    if (Array.isArray(value)) {
      return value.map((item) => XMLStringify.formatNode(name, item, depth, pretty, indent)).join('');
    }
    if (typeof value === 'object') {
      const obj = value as Record<string, unknown>;
      // Handle attributes prefixed with @
      const attrs: string[] = [];
      const children: Array<[string, unknown]> = [];
      for (const [k, v] of Object.entries(obj)) {
        if (k.startsWith('@')) {
          attrs.push(`${k.slice(1)}="${XMLStringify.escape(String(v))}"`);
        } else if (k === '#text') {
          return `${pad}<${name}${attrs.length > 0 ? ' ' + attrs.join(' ') : ''}>${XMLStringify.escape(String(v))}</${name}>${pretty ? '\n' : ''}`;
        } else {
          children.push([k, v]);
        }
      }
      const attrStr = attrs.length > 0 ? ' ' + attrs.join(' ') : '';
      if (children.length === 0) return `${pad}<${name}${attrStr}/>${pretty ? '\n' : ''}`;
      let inner = '';
      for (const [k, v] of children) {
        inner += XMLStringify.formatNode(k, v, depth + 1, pretty, indent);
      }
      return `${pad}<${name}${attrStr}>${pretty ? '\n' : ''}${inner}${pad}</${name}>${pretty ? '\n' : ''}`;
    }
    return '';
  }

  private static escape(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  }

  /**
   * Build a simple element.
   */
  static element(name: string, content: string, attrs: Record<string, string> = {}): string {
    const attrStr = Object.entries(attrs).map(([k, v]) => `${k}="${this.escape(v)}"`).join(' ');
    const space = attrStr.length > 0 ? ' ' + attrStr : '';
    if (content === '') return `<${name}${space}/>`;
    return `<${name}${space}>${this.escape(content)}</${name}>`;
  }
}
