/**
 * MimeType — MIME type parser and matcher
 *
 * Inspired by: mime-db / mime-types
 *
 * Format: type/subtype; param=value
 */

const COMMON_TYPES: Record<string, string> = {
  html: 'text/html',
  htm: 'text/html',
  css: 'text/css',
  js: 'application/javascript',
  json: 'application/json',
  xml: 'application/xml',
  txt: 'text/plain',
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
  webp: 'image/webp',
  mp3: 'audio/mpeg',
  mp4: 'video/mp4',
  wav: 'audio/wav',
  zip: 'application/zip',
  gz: 'application/gzip',
  tar: 'application/x-tar',
};

export interface ParsedMimeType {
  type: string;
  subtype: string;
  parameters: Record<string, string>;
}

export class MimeType {
  /**
   * Parse a MIME type string.
   */
  static parse(input: string): ParsedMimeType | null {
    const m = input.trim().match(/^([^/]+)\/([^;]+)(.*)$/);
    if (!m) return null;
    const params: Record<string, string> = {};
    const rest = m[3];
    const re = /;\s*([^=]+)=([^;]*)/g;
    let pm;
    while ((pm = re.exec(rest)) !== null) {
      params[pm[1].trim().toLowerCase()] = pm[2].trim().replace(/^"|"$/g, '');
    }
    return {
      type: m[1].trim().toLowerCase(),
      subtype: m[2].trim().toLowerCase(),
      parameters: params,
    };
  }

  /**
   * Get MIME type from file extension.
   */
  static fromExtension(ext: string): string | null {
    const e = ext.toLowerCase().replace(/^\./, '');
    return COMMON_TYPES[e] ?? null;
  }

  /**
   * Get common extension for MIME type.
   */
  static toExtension(mime: string): string | null {
    const lower = mime.toLowerCase();
    for (const [ext, m] of Object.entries(COMMON_TYPES)) {
      if (m === lower) return ext;
    }
    return null;
  }

  /**
   * Does MIME match a pattern (e.g. "image/*" or "text/html")?
   */
  static matches(mime: string, pattern: string): boolean {
    if (pattern === mime) return true;
    if (pattern.endsWith('/*')) {
      const prefix = pattern.slice(0, -2);
      return mime.startsWith(prefix + '/');
    }
    return false;
  }

  /**
   * Is text-like type?
   */
  static isText(mime: string): boolean {
    if (mime.startsWith('text/')) return true;
    if (mime === 'application/json') return true;
    if (mime === 'application/xml') return true;
    if (mime === 'application/javascript') return true;
    return false;
  }

  /**
   * Is binary type?
   */
  static isBinary(mime: string): boolean {
    return !this.isText(mime);
  }

  /**
   * Stringify back to MIME string.
   */
  static format(parsed: ParsedMimeType): string {
    let s = `${parsed.type}/${parsed.subtype}`;
    for (const [k, v] of Object.entries(parsed.parameters)) {
      s += `; ${k}=${v}`;
    }
    return s;
  }

  /**
   * Get charset from Content-Type (default utf-8).
   */
  static getCharset(contentType: string): string {
    const parsed = this.parse(contentType);
    return parsed?.parameters.charset ?? 'utf-8';
  }
}
