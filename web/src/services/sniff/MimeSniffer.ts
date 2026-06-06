/**
 * MimeSniffer — sniff MIME type from content
 *
 * Inspired by: file-signatures
 *
 * Detect MIME from first bytes (magic numbers).
 */

interface Signature {
  mime: string;
  bytes: number[];
  offset?: number;
  mask?: number[];
}

const SIGNATURES: Signature[] = [
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A] },
  { mime: 'image/jpeg', bytes: [0xFF, 0xD8, 0xFF] },
  { mime: 'image/gif', bytes: [0x47, 0x49, 0x46, 0x38] },
  { mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46], offset: 0, mask: undefined },
  { mime: 'image/bmp', bytes: [0x42, 0x4D] },
  { mime: 'image/tiff', bytes: [0x49, 0x49, 0x2A, 0x00] },
  { mime: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46] },
  { mime: 'application/zip', bytes: [0x50, 0x4B, 0x03, 0x04] },
  { mime: 'application/gzip', bytes: [0x1F, 0x8B] },
  { mime: 'application/x-rar-compressed', bytes: [0x52, 0x61, 0x72, 0x21, 0x1A, 0x07] },
  { mime: 'application/x-7z-compressed', bytes: [0x37, 0x7A, 0xBC, 0xAF, 0x27, 0x1C] },
  { mime: 'application/x-tar', bytes: [0x75, 0x73, 0x74, 0x61, 0x72], offset: 257 },
  { mime: 'video/mp4', bytes: [0x66, 0x74, 0x79, 0x70] },
  { mime: 'audio/mpeg', bytes: [0xFF, 0xFB] },
  { mime: 'audio/wav', bytes: [0x52, 0x49, 0x46, 0x46] },
  { mime: 'application/wasm', bytes: [0x00, 0x61, 0x73, 0x6D] },
  { mime: 'text/html', bytes: [0x3C, 0x21, 0x44, 0x4F, 0x43, 0x54, 0x59, 0x50, 0x45] },
  { mime: 'application/postscript', bytes: [0x25, 0x21, 0x50, 0x53] },
];

export class MimeSniffer {
  /**
   * Sniff MIME type from content bytes.
   */
  static sniff(bytes: Uint8Array | number[]): string {
    const arr = bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes);
    if (arr.length === 0) return 'application/octet-stream';
    for (const sig of SIGNATURES) {
      if (MimeSniffer.matchSignature(arr, sig)) return sig.mime;
    }
    return MimeSniffer.sniffText(arr);
  }

  private static matchSignature(arr: Uint8Array, sig: Signature): boolean {
    const offset = sig.offset ?? 0;
    if (arr.length < offset + sig.bytes.length) return false;
    for (let i = 0; i < sig.bytes.length; i++) {
      if (arr[offset + i] !== sig.bytes[i]) return false;
    }
    return true;
  }

  private static sniffText(arr: Uint8Array): string {
    // If all printable ASCII or whitespace, it's text
    let printable = 0;
    for (let i = 0; i < Math.min(arr.length, 100); i++) {
      const b = arr[i];
      if ((b >= 0x20 && b <= 0x7E) || b === 0x09 || b === 0x0A || b === 0x0D) printable++;
    }
    return printable / Math.min(arr.length, 100) > 0.95 ? 'text/plain' : 'application/octet-stream';
  }

  /**
   * Sniff from string.
   */
  static sniffString(s: string): string {
    return MimeSniffer.sniff(new TextEncoder().encode(s));
  }

  /**
   * Common signatures list.
   */
  static getSignatures(): Array<{ mime: string; bytes: number[] }> {
    return SIGNATURES.map((s) => ({ mime: s.mime, bytes: s.bytes }));
  }
}
