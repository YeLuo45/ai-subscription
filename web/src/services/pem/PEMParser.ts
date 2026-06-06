/**
 * PEMParser — PEM (Privacy-Enhanced Mail) format parser
 *
 * Inspired by: node-forge / pem-jwk
 *
 * Format:
 *   -----BEGIN <label>-----
 *   base64 data (64 chars/line)
 *   -----END <label>-----
 */

export interface PEMBlock {
  label: string;
  data: Uint8Array;
  headers?: Record<string, string>;
}

export class PEMParser {
  /**
   * Parse PEM string to blocks.
   */
  static parse(pem: string): PEMBlock[] {
    const blocks: PEMBlock[] = [];
    const re = /-----BEGIN ([A-Z0-9 ]+)-----([\s\S]*?)-----END \1-----/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(pem)) !== null) {
      const label = m[1].trim();
      const body = m[2];
      // Headers (lines before first blank line)
      const lines = body.split(/\r?\n/);
      let headerEnd = 0;
      const headers: Record<string, string> = {};
      for (; headerEnd < lines.length; headerEnd++) {
        const line = lines[headerEnd].trim();
        if (line.length === 0) break;
        const colonIdx = line.indexOf(':');
        if (colonIdx > 0) {
          headers[line.slice(0, colonIdx).trim()] = line.slice(colonIdx + 1).trim();
        } else {
          break;
        }
      }
      const dataLines = lines.slice(headerEnd).filter((l) => l.trim().length > 0 && !l.includes(':'));
      const b64 = dataLines.join('').replace(/\s+/g, '');
      const data = PEMParser.decodeBase64(b64);
      blocks.push({
        label,
        data,
        headers: Object.keys(headers).length > 0 ? headers : undefined,
      });
    }
    return blocks;
  }

  /**
   * Build PEM from data.
   */
  static stringify(label: string, data: Uint8Array, headers: Record<string, string> = {}): string {
    let out = `-----BEGIN ${label}-----\n`;
    for (const [k, v] of Object.entries(headers)) {
      out += `${k}: ${v}\n`;
    }
    if (Object.keys(headers).length > 0) out += '\n';
    const b64 = PEMParser.encodeBase64(data);
    for (let i = 0; i < b64.length; i += 64) {
      out += b64.slice(i, i + 64) + '\n';
    }
    out += `-----END ${label}-----\n`;
    return out;
  }

  /**
   * Find first block with given label.
   */
  static find(blocks: PEMBlock[], label: string): PEMBlock | null {
    return blocks.find((b) => b.label === label) ?? null;
  }

  /**
   * Get all blocks with given label.
   */
  static findAll(blocks: PEMBlock[], label: string): PEMBlock[] {
    return blocks.filter((b) => b.label === label);
  }

  /**
   * Encode base64.
   */
  static encodeBase64(bytes: Uint8Array): string {
    let bin = '';
    for (const b of bytes) bin += String.fromCharCode(b);
    if (typeof btoa === 'function') return btoa(bin);
    return Buffer.from(bytes).toString('base64');
  }

  /**
   * Decode base64.
   */
  static decodeBase64(s: string): Uint8Array {
    if (typeof atob === 'function') {
      const bin = atob(s);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return bytes;
    }
    return new Uint8Array(Buffer.from(s, 'base64'));
  }

  /**
   * Check if string is PEM format.
   */
  static isPEM(s: string): boolean {
    return /-----BEGIN [A-Z0-9 ]+-----/.test(s);
  }
}
