/**
 * URLSlug — generate URL-safe slugs from text
 *
 * Inspired by: slugify / slug
 */

export class URLSlug {
  /**
   * Generate a URL-safe slug.
   */
  static generate(text: string, options: { separator?: string; lower?: boolean; maxLength?: number } = {}): string {
    const sep = options.separator ?? '-';
    const lower = options.lower ?? true;
    const max = options.maxLength ?? 0;

    let s = text.normalize('NFKD').replace(/[\u0300-\u036f]/g, ''); // strip diacritics
    if (lower) s = s.toLowerCase();
    s = s.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, sep).replace(new RegExp(`${sep}{2,}`, 'g'), sep);
    s = s.replace(new RegExp(`^${sep}+|${sep}+$`, 'g'), '');
    if (max > 0 && s.length > max) s = s.slice(0, max);
    return s;
  }

  /**
   * Generate a unique slug (with suffix if collision).
   */
  static unique(text: string, existing: string[], separator: string = '-'): string {
    let s = URLSlug.generate(text, { separator });
    if (!existing.includes(s)) return s;
    let n = 1;
    while (existing.includes(`${s}${separator}${n}`)) n++;
    return `${s}${separator}${n}`;
  }

  /**
   * Validate slug format.
   */
  static isValid(slug: string): boolean {
    if (slug.length === 0) return false;
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
  }

  /**
   * Increment slug (post-1 -> post-2).
   */
  static increment(slug: string): string {
    const m = slug.match(/^(.*?)-(\d+)$/);
    if (!m) return `${slug}-1`;
    return `${m[1]}-${parseInt(m[2], 10) + 1}`;
  }

  /**
   * Slugify to lowercase and dashes (alias).
   */
  static slugify(text: string): string {
    return URLSlug.generate(text);
  }

  /**
   * Reverse a slug to readable text.
   */
  static unslugify(slug: string, separator: string = ' '): string {
    return slug.replace(/-/g, separator);
  }
}
