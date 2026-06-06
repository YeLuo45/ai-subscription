/**
 * Indenter — code/text indentation utility
 *
 * Inspired by: indent-string / detect-indent
 *
 * Add/remove indentation, detect indentation size.
 */

export class Indenter {
  /**
   * Detect indentation style.
   * Returns { char: '\t' | ' ', size: number }
   */
  static detect(text: string): { char: string; size: number } {
    const lines = text.split('\n').filter((l) => /^[ \t]/.test(l));
    if (lines.length === 0) return { char: ' ', size: 2 };
    const tabs = lines.filter((l) => l.startsWith('\t')).length;
    if (tabs > lines.length / 2) return { char: '\t', size: 1 };
    // Count leading spaces of first indented line
    const first = lines.find((l) => l.length > 0) ?? '';
    const match = first.match(/^( +)/);
    const size = match ? match[1].length : 2;
    return { char: ' ', size };
  }

  /**
   * Indent each line.
   */
  static indent(text: string, char: string = '  ', count: number = 1): string {
    const indent = char.repeat(count);
    return text.split('\n').map((l) => (l.length > 0 ? indent + l : l)).join('\n');
  }

  /**
   * Outdent each line (remove N levels).
   */
  static outdent(text: string, char: string = '  ', count: number = 1): string {
    const prefix = char.repeat(count);
    return text.split('\n').map((l) => {
      if (l.startsWith(prefix)) return l.slice(prefix.length);
      // Remove as much prefix as possible
      let i = 0;
      while (i < l.length && l[i] === char && i < count * char.length) {
        if (l.slice(i, i + char.length) === char) i += char.length;
        else break;
      }
      return l.slice(i);
    }).join('\n');
  }

  /**
   * Re-indent: remove all common leading whitespace, then add new indent.
   */
  static reindent(text: string, char: string = '  ', count: number = 1): string {
    const lines = text.split('\n');
    const nonEmpty = lines.filter((l) => l.trim().length > 0);
    if (nonEmpty.length === 0) return text;
    const minIndent = Math.min(...nonEmpty.map((l) => l.match(/^[ \t]*/)?.[0].length ?? 0));
    const dedented = lines.map((l) => l.slice(minIndent));
    return Indenter.indent(dedented.join('\n'), char, count);
  }

  /**
   * Get leading whitespace of a line.
   */
  static getIndent(line: string): string {
    const m = line.match(/^[ \t]*/);
    return m ? m[0] : '';
  }

  /**
   * Get indent level (how many `char.repeat(unit)` units).
   */
  static level(line: string, char: string = '  '): number {
    const indent = Indenter.getIndent(line);
    if (char === '\t') return indent.split('').filter((c) => c === '\t').length;
    return Math.floor(indent.length / char.length);
  }

  /**
   * Trim trailing whitespace per line.
   */
  static trimTrailing(text: string): string {
    return text.split('\n').map((l) => l.replace(/[ \t]+$/, '')).join('\n');
  }
}
