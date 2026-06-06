/**
 * PropertiesParser — Java .properties parser
 *
 * Inspired by: java-properties / properties-parser
 *
 * Format: key=value, key:value, key value
 * Supports: comments (#, !), line continuations (\), unicode escapes (\uXXXX)
 */

export class PropertiesParser {
  /**
   * Parse .properties string.
   */
  static parse(input: string): Record<string, string> {
    const result: Record<string, string> = {};
    const lines = input.split(/\r?\n/);
    let pending = '';

    for (let raw of lines) {
      const line = raw.trim();
      if (line.length === 0) continue;
      if (line.startsWith('#') || line.startsWith('!')) continue;
      // Line continuation
      let current = pending + line;
      pending = '';
      if (current.endsWith('\\')) {
        pending = current.slice(0, -1);
        continue;
      }
      // Find separator
      const sepMatch = current.match(/^([^=:\\\s]+)\s*[:=\s]\s*/);
      if (!sepMatch) continue;
      const key = sepMatch[1].trim();
      const value = current.slice(sepMatch[0].length).trim();
      result[key] = PropertiesParser.unescape(value);
    }
    return result;
  }

  /**
   * Stringify to .properties format.
   */
  static stringify(obj: Record<string, string>): string {
    return Object.entries(obj)
      .map(([k, v]) => `${k} = ${PropertiesParser.escape(v)}`)
      .join('\n');
  }

  /**
   * Get value.
   */
  static get(obj: Record<string, string>, key: string, defaultValue?: string): string | undefined {
    return obj[key] ?? defaultValue;
  }

  /**
   * Set value.
   */
  static set(obj: Record<string, string>, key: string, value: string): void {
    obj[key] = value;
  }

  /**
   * Get keys.
   */
  static keys(obj: Record<string, string>): string[] {
    return Object.keys(obj);
  }

  /**
   * Unescape value (handle \n, \t, \r, \uXXXX).
   */
  static unescape(v: string): string {
    return v.replace(/\\u([0-9A-Fa-f]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
            .replace(/\\n/g, '\n')
            .replace(/\\t/g, '\t')
            .replace(/\\r/g, '\r')
            .replace(/\\=/g, '=')
            .replace(/\\:/g, ':')
            .replace(/\\\\/g, '\\');
  }

  /**
   * Escape value.
   */
  static escape(v: string): string {
    return v.replace(/\\/g, '\\\\')
            .replace(/\n/g, '\\n')
            .replace(/\t/g, '\\t')
            .replace(/\r/g, '\\r')
            .replace(/=/g, '\\=')
            .replace(/:/g, '\\:');
  }
}
