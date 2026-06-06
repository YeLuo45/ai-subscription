/**
 * Hostname — RFC 1123 hostname validation
 *
 * Inspired by: is-valid-hostname
 *
 * Validates hostnames per RFC 1123.
 * - Labels: 1-63 chars, alphanumeric + hyphens, no leading/trailing hyphen
 * - Total: 253 chars max
 * - TLD cannot be all-numeric (or be empty)
 */

const LABEL_RE = /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)$/;

export class Hostname {
  readonly name: string;
  readonly labels: string[];

  constructor(name: string) {
    this.name = name;
    this.labels = name.split('.');
  }

  /**
   * Validate hostname.
   */
  static isValid(input: string): boolean {
    if (!input || input.length > 253) return false;
    const labels = input.split('.');
    if (labels.length < 2) return false; // Require at least one dot
    const tld = labels[labels.length - 1];
    if (!/^[A-Za-z]{2,}$/.test(tld)) return false; // TLD: letters, >=2
    for (const label of labels) {
      if (!LABEL_RE.test(label)) return false;
    }
    return true;
  }

  /**
   * Parse and throw if invalid.
   */
  static parse(input: string): Hostname {
    if (!Hostname.isValid(input)) throw new Error('Invalid hostname: ' + input);
    return new Hostname(input);
  }

  /**
   * Get TLD.
   */
  tld(): string { return this.labels[this.labels.length - 1]; }

  /**
   * Get SLD (second-level domain).
   */
  sld(): string { return this.labels[this.labels.length - 2] ?? ''; }

  /**
   * Get number of labels.
   */
  labelCount(): number { return this.labels.length; }

  /**
   * Get parent domain (remove leftmost label).
   */
  parent(): string {
    return this.labels.slice(1).join('.');
  }

  /**
   * Is subdomain of another?
   */
  isSubdomainOf(parent: string): boolean {
    return this.name.endsWith('.' + parent);
  }

  /**
   * Is IP-like?
   */
  isIPLike(): boolean {
    return /^\d+\.\d+\.\d+\.\d+$/.test(this.name);
  }

  /**
   * Is localhost?
   */
  isLocalhost(): boolean {
    return this.name === 'localhost' || this.name.endsWith('.localhost');
  }

  /**
   * To string.
   */
  toString(): string { return this.name; }
}
