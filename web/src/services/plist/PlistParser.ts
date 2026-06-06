/**
 * PlistParser — Apple property list (plist) parser
 *
 * Inspired by: plist
 *
 * Parses XML plist format (binary plist not supported).
 */

export class PlistParser {
  /**
   * Parse XML plist string to JS object.
   */
  static parse(xml: string): unknown {
    // Extract children of root <plist>
    const m = xml.match(/<plist[^>]*>([\s\S]*)<\/plist>/i);
    if (!m) return null;
    return PlistParser.parseElement(m[1].trim());
  }

  private static parseElement(s: string): unknown {
    s = s.trim();
    // Match the first tag and its content
    const tagMatch = s.match(/^<(\w+)>([\s\S]*?)<\/\1>/);
    if (!tagMatch) {
      // Self-closing?
      const selfClose = s.match(/^<(\w+)\s*\/>/);
      if (selfClose) {
        return PlistParser.parseValue(selfClose[1], '');
      }
      return null;
    }
    const [, tag, content] = tagMatch;
    return PlistParser.parseValue(tag, content);
  }

  private static parseValue(tag: string, content: string): unknown {
    switch (tag.toLowerCase()) {
      case 'string': return PlistParser.unescape(content);
      case 'integer': return parseInt(content.trim(), 10);
      case 'real': return parseFloat(content.trim());
      case 'true': return true;
      case 'false': return false;
      case 'array': return PlistParser.parseArray(content);
      case 'dict': return PlistParser.parseDict(content);
      case 'data': return PlistParser.decodeBase64(content.trim());
      case 'date': return new Date(content.trim());
      default: return content;
    }
  }

  private static parseArray(content: string): unknown[] {
    const result: unknown[] = [];
    const re = /<(\w+)>([\s\S]*?)<\/\1>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      result.push(PlistParser.parseValue(m[1], m[2]));
    }
    return result;
  }

  private static parseDict(content: string): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    // Match <key>...</key><value-tag>...</value-tag> pairs
    const re = /<key>([\s\S]*?)<\/key>\s*<(\w+)>([\s\S]*?)<\/\2>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      const key = PlistParser.unescape(m[1]);
      result[key] = PlistParser.parseValue(m[2], m[3]);
    }
    return result;
  }

  /**
   * Decode base64 (browser + node).
   */
  private static decodeBase64(s: string): Uint8Array {
    if (typeof atob === 'function') {
      const bin = atob(s);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return bytes;
    }
    return new Uint8Array(Buffer.from(s, 'base64'));
  }

  /**
   * Unescape XML entities.
   */
  private static unescape(s: string): string {
    return s.trim()
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, '&');
  }

  /**
   * Stringify to XML plist.
   */
  static stringify(obj: unknown, pretty: boolean = true): string {
    const nl = pretty ? '\n' : '';
    const head = `<?xml version="1.0" encoding="UTF-8"?>${nl}<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">${nl}<plist version="1.0">${nl}`;
    const foot = `${nl}</plist>${nl}`;
    return head + PlistParser.formatValue(obj, 0, pretty) + foot;
  }

  private static formatValue(v: unknown, indent: number, pretty: boolean): string {
    const pad = pretty ? '  '.repeat(indent + 1) : '';
    const tag = (t: string, c: string) => `${pad}<${t}>${c}</${t}>${pretty ? '\n' : ''}`;
    if (v === null || v === undefined) return tag('string', '');
    if (typeof v === 'string') return tag('string', PlistParser.escape(v));
    if (typeof v === 'number') return tag(Number.isInteger(v) ? 'integer' : 'real', String(v));
    if (typeof v === 'boolean') return tag(v ? 'true' : 'false', '');
    if (Array.isArray(v)) {
      const inner = v.map((item) => PlistParser.formatValue(item, indent + 1, pretty)).join('');
      return `${pad}<array>${pretty ? '\n' : ''}${inner}${pad}</array>${pretty ? '\n' : ''}`;
    }
    if (v instanceof Date) return tag('date', v.toISOString());
    if (typeof v === 'object') {
      const inner = Object.entries(v as Record<string, unknown>).map(([k, val]) =>
        `${pad}  <key>${PlistParser.escape(k)}</key>${pretty ? '\n' : ''}${PlistParser.formatValue(val, indent + 1, pretty)}`,
      ).join('');
      return `${pad}<dict>${pretty ? '\n' : ''}${inner}${pad}</dict>${pretty ? '\n' : ''}`;
    }
    return tag('string', String(v));
  }

  private static escape(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
