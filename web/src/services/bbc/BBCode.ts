/**
 * BBCode — bulletin board code parser
 *
 * Inspired by: phpBB
 *
 * Supports: [b], [i], [u], [s], [url], [img], [quote], [code], [color]
 */

export class BBCode {
  /**
   * Convert BBCode to HTML.
   */
  static toHtml(input: string): string {
    let s = input;
    // Code (preserve content)
    s = s.replace(/\[code\]([\s\S]*?)\[\/code\]/g, (_, c) => `<pre><code>${BBCode._escape(c)}</code></pre>`);
    // Quote
    s = s.replace(/\[quote(?:="?[^"]*"?)?\]([\s\S]*?)\[\/quote\]/g, '<blockquote>$1</blockquote>');
    // URL
    s = s.replace(/\[url=([^\]]+)\]([^\[]+)\[\/url\]/g, '<a href="$1">$2</a>');
    s = s.replace(/\[url\]([^\[]+)\[\/url\]/g, '<a href="$1">$1</a>');
    // Image
    s = s.replace(/\[img\]([^\[]+)\[\/img\]/g, '<img src="$1" />');
    // Color
    s = s.replace(/\[color=([^\]]+)\]([^\[]*)\[\/color\]/g, '<span style="color:$1">$2</span>');
    // Simple tags
    s = s.replace(/\[b\]([^\[]*)\[\/b\]/g, '<strong>$1</strong>');
    s = s.replace(/\[i\]([^\[]*)\[\/i\]/g, '<em>$1</em>');
    s = s.replace(/\[u\]([^\[]*)\[\/u\]/g, '<u>$1</u>');
    s = s.replace(/\[s\]([^\[]*)\[\/s\]/g, '<s>$1</s>');
    // Line breaks
    s = s.replace(/\n/g, '<br />');
    return s;
  }

  /**
   * Strip BBCode to plain text.
   */
  static strip(input: string): string {
    return input.replace(/\[[^\]]+\]/g, '');
  }

  /**
   * Validate BBCode.
   */
  static isValid(input: string): boolean {
    const stack: string[] = [];
    const re = /\[(\/?)([a-zA-Z]+)(?:=[^\]]*)?\]/g;
    let m;
    while ((m = re.exec(input)) !== null) {
      const closing = m[1] === '/';
      const tag = m[2].toLowerCase();
      if (closing) {
        if (stack.pop() !== tag) return false;
      } else {
        stack.push(tag);
      }
    }
    return stack.length === 0;
  }

  private static _escape(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
