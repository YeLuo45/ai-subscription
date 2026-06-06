/**
 * CamelCase — naming convention conversion
 *
 * Inspired by: camelcase / decamelize
 *
 * Convert between:
 *   - camelCase
 *   - PascalCase
 *   - snake_case
 *   - kebab-case
 *   - CONSTANT_CASE
 *   - Title Case
 */

export class CamelCase {
  /**
   * Detect naming style.
   */
  static detect(input: string): 'camel' | 'pascal' | 'snake' | 'kebab' | 'constant' | 'title' | 'unknown' {
    if (!input) return 'unknown';
    if (/^[A-Z][A-Z0-9_]*$/.test(input)) return 'constant';
    if (/^[A-Z][a-zA-Z0-9]*$/.test(input)) return 'pascal';
    if (/^[a-z][a-zA-Z0-9]*$/.test(input)) return 'camel';
    if (/^[a-z][a-z0-9_]*$/.test(input)) return 'snake';
    if (/^[a-z][a-z0-9-]*$/.test(input)) return 'kebab';
    if (/^[A-Z][a-z]+(\s[A-Z][a-z]+)*$/.test(input)) return 'title';
    return 'unknown';
  }

  /**
   * Split into words.
   */
  static words(input: string): string[] {
    if (!input) return [];
    return input
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
      .replace(/[\s_-]+/g, ' ')
      .trim()
      .toLowerCase()
      .split(' ')
      .filter((w) => w.length > 0);
  }

  /**
   * to camelCase.
   */
  static toCamel(input: string): string {
    const words = CamelCase.words(input);
    if (words.length === 0) return '';
    return words[0] + words.slice(1).map((w) => w[0].toUpperCase() + w.slice(1)).join('');
  }

  /**
   * to PascalCase.
   */
  static toPascal(input: string): string {
    const words = CamelCase.words(input);
    return words.map((w) => w[0].toUpperCase() + w.slice(1)).join('');
  }

  /**
   * to snake_case.
   */
  static toSnake(input: string): string {
    return CamelCase.words(input).join('_');
  }

  /**
   * to kebab-case.
   */
  static toKebab(input: string): string {
    return CamelCase.words(input).join('-');
  }

  /**
   * to CONSTANT_CASE.
   */
  static toConstant(input: string): string {
    return CamelCase.words(input).join('_').toUpperCase();
  }

  /**
   * to Title Case.
   */
  static toTitle(input: string): string {
    return CamelCase.words(input).map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
  }
}
