/**
 * CaesarCipher — classic shift cipher
 *
 * Inspired by: Julius Caesar (100 BC)
 *
 * Each letter is shifted by N positions in the alphabet.
 * Non-letters preserved.
 */

export class CaesarCipher {
  /**
   * Encrypt text by shifting each letter forward by `shift`.
   */
  static encrypt(text: string, shift: number): string {
    return this.shift(text, shift);
  }

  /**
   * Decrypt by shifting backward.
   */
  static decrypt(text: string, shift: number): string {
    return this.shift(text, -shift);
  }

  private static shift(text: string, shift: number): string {
    const s = ((shift % 26) + 26) % 26;
    let out = '';
    for (const ch of text) {
      const code = ch.charCodeAt(0);
      if (code >= 65 && code <= 90) {
        // uppercase A-Z
        out += String.fromCharCode(((code - 65 + s) % 26) + 65);
      } else if (code >= 97 && code <= 122) {
        // lowercase a-z
        out += String.fromCharCode(((code - 97 + s) % 26) + 97);
      } else {
        out += ch;
      }
    }
    return out;
  }

  /**
   * Brute-force decrypt (try all 26 shifts), returning array of candidates.
   */
  static bruteForce(cipher: string): string[] {
    const out: string[] = [];
    for (let s = 0; s < 26; s++) {
      out.push(this.decrypt(cipher, s));
    }
    return out;
  }
}
