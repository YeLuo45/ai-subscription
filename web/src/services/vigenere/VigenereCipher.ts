/**
 * VigenereCipher — polyalphabetic cipher with keyword
 *
 * Inspired by: Vigenere 1553
 *
 * Each letter is shifted by the corresponding letter of the key.
 * Non-letters are preserved (key advances only on letters).
 */

export class VigenereCipher {
  static encrypt(text: string, key: string): string {
    return this.transform(text, key, 'encrypt');
  }

  static decrypt(text: string, key: string): string {
    return this.transform(text, key, 'decrypt');
  }

  private static transform(text: string, key: string, mode: 'encrypt' | 'decrypt'): string {
    if (!key) return text;
    const keyClean = key.toLowerCase().replace(/[^a-z]/g, '');
    if (keyClean.length === 0) return text;
    let keyIdx = 0;
    let out = '';
    for (const ch of text) {
      const code = ch.charCodeAt(0);
      const keyCh = keyClean[keyIdx % keyClean.length];
      const keyShift = keyCh.charCodeAt(0) - 97;
      if (code >= 65 && code <= 90) {
        // uppercase
        const s = mode === 'encrypt' ? keyShift : -keyShift;
        out += String.fromCharCode(((code - 65 + s + 26 * 100) % 26) + 65);
        keyIdx += 1;
      } else if (code >= 97 && code <= 122) {
        // lowercase
        const s = mode === 'encrypt' ? keyShift : -keyShift;
        out += String.fromCharCode(((code - 97 + s + 26 * 100) % 26) + 97);
        keyIdx += 1;
      } else {
        out += ch;
      }
    }
    return out;
  }
}
