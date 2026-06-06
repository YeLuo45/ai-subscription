/**
 * Rot13 — special case of Caesar with shift 13
 *
 * Inspired by: Caesar cipher shift 13
 *
 * Self-inverse: applying Rot13 twice returns the original.
 */

import { CaesarCipher } from '../caesar/CaesarCipher';

export class Rot13 {
  static transform(text: string): string {
    return CaesarCipher.encrypt(text, 13);
  }

  static encode(text: string): string {
    return this.transform(text);
  }

  static decode(text: string): string {
    return this.transform(text);
  }
}
