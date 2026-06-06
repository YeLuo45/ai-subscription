/**
 * ContentType — Content-Type header utilities
 *
 * Inspired by: content-type / mime-db
 *
 * High-level Content-Type operations.
 */

import { MimeType, type ParsedMimeType } from '../mime/MimeType';

export class ContentType {
  private parsed: ParsedMimeType;

  constructor(input: string) {
    const p = MimeType.parse(input);
    if (!p) throw new Error('Invalid Content-Type: ' + input);
    this.parsed = p;
  }

  /**
   * Get full type.
   */
  type(): string { return `${this.parsed.type}/${this.parsed.subtype}`; }

  /**
   * Get just type.
   */
  mediaType(): string { return this.parsed.type; }

  /**
   * Get just subtype.
   */
  subType(): string { return this.parsed.subtype; }

  /**
   * Get parameter value.
   */
  param(name: string): string | undefined {
    return this.parsed.parameters[name.toLowerCase()];
  }

  /**
   * Set parameter.
   */
  setParam(name: string, value: string): this {
    this.parsed.parameters[name.toLowerCase()] = value;
    return this;
  }

  /**
   * Remove parameter.
   */
  removeParam(name: string): this {
    delete this.parsed.parameters[name.toLowerCase()];
    return this;
  }

  /**
   * Get charset (default utf-8).
   */
  charset(): string {
    return this.parsed.parameters['charset'] ?? 'utf-8';
  }

  /**
   * Set charset.
   */
  setCharset(cs: string): this {
    return this.setParam('charset', cs);
  }

  /**
   * Get boundary (for multipart).
   */
  boundary(): string | undefined {
    return this.parsed.parameters['boundary'];
  }

  /**
   * Is multipart?
   */
  isMultipart(): boolean {
    return this.parsed.subtype.startsWith('multipart');
  }

  /**
   * Is JSON?
   */
  isJson(): boolean {
    return this.type() === 'application/json';
  }

  /**
   * Is form-urlencoded?
   */
  isFormUrlEncoded(): boolean {
    return this.parsed.type === 'application' && this.parsed.subtype === 'x-www-form-urlencoded';
  }

  /**
   * Is text?
   */
  isText(): boolean {
    return MimeType.isText(this.type());
  }

  /**
   * Stringify back to header value.
   */
  toString(): string {
    return MimeType.format(this.parsed);
  }

  /**
   * Static: create from type + params.
   */
  static create(type: string, params: Record<string, string> = {}): ContentType {
    let s = type;
    for (const [k, v] of Object.entries(params)) {
      s += `; ${k}=${v}`;
    }
    return new ContentType(s);
  }

  /**
   * Static: parse without throwing.
   */
  static tryParse(input: string): ContentType | null {
    try {
      return new ContentType(input);
    } catch {
      return null;
    }
  }

  /**
   * Static: common JSON.
   */
  static json(charset: string = 'utf-8'): ContentType {
    return ContentType.create('application/json', { charset });
  }

  /**
   * Static: form-urlencoded.
   */
  static form(): ContentType {
    return ContentType.create('application/x-www-form-urlencoded');
  }

  /**
   * Static: text plain.
   */
  static text(charset: string = 'utf-8'): ContentType {
    return ContentType.create('text/plain', { charset });
  }

  /**
   * Static: multipart.
   */
  static multipart(boundary: string): ContentType {
    return ContentType.create('multipart/form-data', { boundary });
  }
}
