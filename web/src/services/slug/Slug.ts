/**
 * Slug — URL slug generator
 *
 * Inspired by: slugify / slug
 *
 * Convert text to URL-friendly slug.
 */

export class Slug {
  /**
   * Convert text to slug.
   */
  static make(input: string, options: { separator?: string; lowercase?: boolean; maxLength?: number } = {}): string {
    const sep = options.separator ?? '-';
    const lower = options.lowercase ?? true;
    const maxLen = options.maxLength ?? Infinity;
    let s = input
      // Normalize accents (basic)
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      // Replace whitespace and underscores with separator
      .replace(/[\s_]+/g, sep)
      // Remove non-alphanumeric (keep hyphen)
      .replace(new RegExp(`[^a-zA-Z0-9${sep}]`, 'g'), '')
      // Collapse multiple separators
      .replace(new RegExp(`${sep}{2,}`, 'g'), sep)
      // Trim separators
      .replace(new RegExp(`^${sep}+|${sep}+$`, 'g'), '');
    if (lower) s = s.toLowerCase();
    if (s.length > maxLen) {
      s = s.slice(0, maxLen);
      s = s.replace(new RegExp(`${sep}+$`), '');
    }
    return s;
  }

  /**
   * Check if string is valid slug.
   */
  static isValid(input: string): boolean {
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input);
  }

  /**
   * Ensure slug ends with suffix if not already.
   */
  static withSuffix(slug: string, suffix: string): string {
    if (slug.endsWith(suffix)) return slug;
    return slug + suffix;
  }

  /**
   * Prepend prefix if not already.
   */
  static withPrefix(slug: string, prefix: string): string {
    if (slug.startsWith(prefix)) return slug;
    return prefix + slug;
  }

  /**
   * Add counter to make unique.
   */
  static unique(base: string, existing: string[]): string {
    if (!existing.includes(base)) return base;
    let i = 1;
    while (existing.includes(`${base}-${i}`)) i++;
    return `${base}-${i}`;
  }
}
