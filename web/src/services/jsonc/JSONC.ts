/**
 * JSONC — JSON with comments and trailing commas
 *
 * Inspired by: jsonc-parser
 *
 * Supports: // line comments, /* block *\/ comments, trailing commas
 */

export class JSONC {
  /**
   * Strip comments and trailing commas, then parse.
   */
  static parse(input: string): unknown {
    return JSON.parse(JSONC.strip(input));
  }

  /**
   * Strip comments and trailing commas.
   */
  static strip(input: string): string {
    let out = '';
    let i = 0;
    let inString = false;
    let escape = false;
    while (i < input.length) {
      const c = input[i];
      const next = input[i + 1];
      if (inString) {
        out += c;
        if (escape) {
          escape = false;
        } else if (c === '\\') {
          escape = true;
        } else if (c === '"') {
          inString = false;
        }
        i++;
        continue;
      }
      // Not in string
      if (c === '"') {
        inString = true;
        out += c;
        i++;
        continue;
      }
      // Line comment
      if (c === '/' && next === '/') {
        // Skip to end of line
        while (i < input.length && input[i] !== '\n') i++;
        continue;
      }
      // Block comment
      if (c === '/' && next === '*') {
        i += 2;
        while (i < input.length - 1 && !(input[i] === '*' && input[i + 1] === '/')) i++;
        i += 2;
        continue;
      }
      out += c;
      i++;
    }
    // Remove trailing commas
    return out.replace(/,(\s*[\]}])/g, '$1');
  }

  /**
   * Try parse (returns undefined on error).
   */
  static tryParse(input: string): unknown | undefined {
    try {
      return JSONC.parse(input);
    } catch {
      return undefined;
    }
  }

  /**
   * Check if input is valid JSONC.
   */
  static isValid(input: string): boolean {
    try {
      JSONC.parse(input);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Convert JSONC to standard JSON string.
   */
  static toJSON(input: string, indent: number = 2): string {
    return JSON.stringify(JSONC.parse(input), null, indent);
  }
}
